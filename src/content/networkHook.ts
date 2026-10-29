import type { NetworkChannel, NetworkRecord, NetworkTransport } from '@/modules/network/types';

const NETWORK_MESSAGE_SOURCE = 'webpulse-qa-network';
const HOOK_FLAG = '__webpulseNetworkHook';
const BODY_SAMPLE_LIMIT = 8192;

interface XhrMeta {
  method: string;
  url: string;
  headerSize: number;
  bodyText: string | null;
  requestSize: number;
}

interface MeasuredBody {
  size: number;
  text: string | null;
}

type HookedWindow = Window & { [HOOK_FLAG]?: boolean };
type HookedXhr = XMLHttpRequest & { __webpulse?: XhrMeta };

const pageWindow = window as HookedWindow;

if (!pageWindow[HOOK_FLAG]) {
  pageWindow[HOOK_FLAG] = true;
  installFetchHook();
  installXhrHook();
  installConsoleCapture();
}

function installFetchHook(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const started = performance.now();
    const startedAt = new Date().toISOString();
    const inspection = await inspectFetch(input, init);

    try {
      const response = await originalFetch(input, init);
      const record = buildRecord({
        url: response.url || inspection.url,
        method: inspection.method,
        status: response.status,
        durationMs: elapsed(started),
        requestSize: inspection.requestSize,
        responseSize: contentLength(response.headers.get('content-length')),
        transport: 'fetch',
        bodyText: inspection.bodyText,
        startedAt,
      });
      publish(record);
      if (record.responseSize === 0) {
        void measureFetchBody(response, record.id);
      }
      return response;
    } catch (error) {
      publish(
        buildRecord({
          url: inspection.url,
          method: inspection.method,
          status: null,
          durationMs: elapsed(started),
          requestSize: inspection.requestSize,
          responseSize: 0,
          transport: 'fetch',
          bodyText: inspection.bodyText,
          startedAt,
        }),
      );
      throw error;
    }
  };
}

function installXhrHook(): void {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    const meta = xhrMeta(this);
    meta.method = method.toUpperCase();
    meta.url = resolveUrl(url);
    originalOpen.call(this, method, url, async ?? true, username, password);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string): void {
    const meta = xhrMeta(this);
    meta.headerSize += name.length + String(value).length + 4;
    originalSetHeader.call(this, name, value);
  };

  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null): void {
    const meta = xhrMeta(this);
    const started = performance.now();
    const startedAt = new Date().toISOString();
    const measured = measureBodySync(body);
    meta.requestSize += measured.size;
    meta.bodyText = measured.text ?? meta.bodyText;

    const onDone = (): void => {
      this.removeEventListener('loadend', onDone);
      let responseSize = 0;
      try {
        responseSize = contentLength(this.getResponseHeader('content-length')) || xhrBodySize(this);
      } catch {
        responseSize = xhrBodySize(this);
      }
      publish(
        buildRecord({
          url: this.responseURL || meta.url,
          method: meta.method || 'GET',
          status: this.status === 0 ? null : this.status,
          durationMs: elapsed(started),
          requestSize: meta.requestSize + meta.headerSize,
          responseSize,
          transport: 'xhr',
          bodyText: meta.bodyText,
          startedAt,
        }),
      );
    };

    this.addEventListener('loadend', onDone);
    originalSend.call(this, body);
  };
}

function installConsoleCapture(): void {
  const target = window as Window & { __webpulseConsoleErrors?: PageConsoleError[] };
  const buffer = target.__webpulseConsoleErrors ?? [];
  target.__webpulseConsoleErrors = buffer;
  const originalError = console.error.bind(console);

  console.error = (...args: unknown[]): void => {
    rememberConsole(buffer, 'error', args.map(errorText).join(' '), null);
    originalError(...args);
  };

  window.addEventListener('error', (event) => {
    rememberConsole(buffer, 'error', event.message, event.filename || null);
  });

  window.addEventListener('unhandledrejection', (event) => {
    rememberConsole(buffer, 'unhandled', errorText(event.reason), null);
  });
}

interface PageConsoleError {
  level: 'error' | 'unhandled';
  message: string;
  source: string | null;
  timestamp: string;
}

function rememberConsole(buffer: PageConsoleError[], level: PageConsoleError['level'], message: string, source: string | null): void {
  const text = message.trim().slice(0, 500);
  if (!text) {
    return;
  }
  const timestamp = new Date().toISOString();
  const duplicate = buffer.some((item) => item.message === text && item.timestamp.slice(0, 19) === timestamp.slice(0, 19));
  if (duplicate) {
    return;
  }
  buffer.push({ level, message: text, source, timestamp });
  if (buffer.length > 100) {
    buffer.splice(0, buffer.length - 100);
  }
}

function errorText(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function inspectFetch(input: RequestInfo | URL, init?: RequestInit): Promise<{
  url: string;
  method: string;
  requestSize: number;
  bodyText: string | null;
}> {
  const requestUrl = input instanceof Request ? input.url : String(input);
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  let requestSize = headerBytes(init?.headers) + (input instanceof Request ? headerBytes(input.headers) : 0);
  let bodyText: string | null = null;

  if (init?.body != null) {
    const measured = await measureBody(init.body);
    requestSize += measured.size;
    bodyText = measured.text;
  } else if (input instanceof Request) {
    try {
      const buffer = await input.clone().arrayBuffer();
      requestSize += buffer.byteLength;
      bodyText = decodeSample(buffer);
    } catch {
      bodyText = null;
    }
  }

  return { url: resolveUrl(requestUrl), method, requestSize, bodyText };
}

async function measureFetchBody(response: Response, id: string): Promise<void> {
  try {
    const buffer = await response.clone().arrayBuffer();
    window.postMessage({ source: NETWORK_MESSAGE_SOURCE, patch: { id, responseSize: buffer.byteLength } }, window.location.origin);
  } catch {
    // Opaque or already consumed responses have no readable size.
  }
}

function publish(record: NetworkRecord): void {
  window.postMessage({ source: NETWORK_MESSAGE_SOURCE, record }, window.location.origin);
}

function buildRecord(input: {
  url: string;
  method: string;
  status: number | null;
  durationMs: number;
  requestSize: number;
  responseSize: number;
  transport: NetworkTransport;
  bodyText: string | null;
  startedAt: string;
}): NetworkRecord {
  const graphql = inspectGraphql(input.url, input.bodyText);
  const channel: NetworkChannel = graphql.isGraphql ? 'graphql' : input.transport;
  return {
    id: crypto.randomUUID(),
    pageUrl: currentPageUrl(),
    url: input.url,
    method: input.method,
    status: input.status,
    durationMs: input.durationMs,
    requestSize: input.requestSize,
    responseSize: input.responseSize,
    channel,
    transport: input.transport,
    operationName: graphql.operationName,
    startedAt: input.startedAt,
  };
}

function inspectGraphql(url: string, bodyText: string | null): { isGraphql: boolean; operationName: string | null } {
  let operationName: string | null = null;
  let hasQuery = false;

  if (bodyText) {
    try {
      const parsed: unknown = JSON.parse(bodyText);
      const document = Array.isArray(parsed) ? parsed[0] : parsed;
      if (document && typeof document === 'object') {
        const query = (document as { query?: unknown }).query;
        const name = (document as { operationName?: unknown }).operationName;
        if (typeof query === 'string' && query.trim() !== '') {
          hasQuery = true;
          operationName = typeof name === 'string' && name !== '' ? name : operationFromQuery(query);
        }
      }
    } catch {
      hasQuery = false;
    }
  }

  let urlLooksGraphql = false;
  try {
    const parsed = new URL(url);
    urlLooksGraphql = parsed.pathname.toLowerCase().includes('graphql');
    const query = parsed.searchParams.get('query');
    if (query) {
      hasQuery = true;
      operationName = operationName ?? parsed.searchParams.get('operationName') ?? operationFromQuery(query);
    }
  } catch {
    urlLooksGraphql = url.toLowerCase().includes('graphql');
  }

  return { isGraphql: hasQuery || urlLooksGraphql, operationName };
}

function operationFromQuery(query: string): string | null {
  const match = /\b(?:query|mutation|subscription)\s+([A-Za-z_][\w]*)/.exec(query);
  return match?.[1] ?? null;
}

async function measureBody(body: BodyInit): Promise<MeasuredBody> {
  if (typeof body === 'string') {
    return { size: new TextEncoder().encode(body).byteLength, text: body.slice(0, BODY_SAMPLE_LIMIT) };
  }
  if (body instanceof URLSearchParams) {
    const text = body.toString();
    return { size: new TextEncoder().encode(text).byteLength, text: text.slice(0, BODY_SAMPLE_LIMIT) };
  }
  if (body instanceof Blob) {
    const sample = await body.slice(0, BODY_SAMPLE_LIMIT).text();
    return { size: body.size, text: sample };
  }
  if (body instanceof ArrayBuffer) {
    return { size: body.byteLength, text: decodeSample(body) };
  }
  if (ArrayBuffer.isView(body)) {
    const copy = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
    return { size: body.byteLength, text: decodeSample(copy) };
  }
  if (body instanceof FormData) {
    return measureFormData(body);
  }
  return { size: 0, text: null };
}

function measureBodySync(body: Document | XMLHttpRequestBodyInit | null | undefined): MeasuredBody {
  if (body == null) {
    return { size: 0, text: null };
  }
  if (typeof body === 'string') {
    return { size: new TextEncoder().encode(body).byteLength, text: body.slice(0, BODY_SAMPLE_LIMIT) };
  }
  if (body instanceof URLSearchParams) {
    const text = body.toString();
    return { size: new TextEncoder().encode(text).byteLength, text: text.slice(0, BODY_SAMPLE_LIMIT) };
  }
  if (body instanceof Blob) {
    return { size: body.size, text: null };
  }
  if (body instanceof ArrayBuffer) {
    return { size: body.byteLength, text: decodeSample(body) };
  }
  if (ArrayBuffer.isView(body)) {
    return { size: body.byteLength, text: null };
  }
  if (body instanceof FormData) {
    return measureFormData(body);
  }
  if (body instanceof Document) {
    const text = new XMLSerializer().serializeToString(body);
    return { size: new TextEncoder().encode(text).byteLength, text: text.slice(0, BODY_SAMPLE_LIMIT) };
  }
  return { size: 0, text: null };
}

function measureFormData(body: FormData): MeasuredBody {
  let size = 0;
  const parts: string[] = [];
  for (const [key, value] of body.entries()) {
    size += key.length;
    if (typeof value === 'string') {
      size += value.length;
      parts.push(value);
    } else {
      size += value.size;
    }
  }
  return { size, text: parts.join('\n').slice(0, BODY_SAMPLE_LIMIT) || null };
}

function headerBytes(headers: HeadersInit | undefined): number {
  if (!headers) {
    return 0;
  }
  let size = 0;
  new Headers(headers).forEach((value, key) => {
    size += key.length + value.length + 4;
  });
  return size;
}

function xhrMeta(xhr: XMLHttpRequest): XhrMeta {
  const hooked = xhr as HookedXhr;
  hooked.__webpulse ??= { method: 'GET', url: '', headerSize: 0, bodyText: null, requestSize: 0 };
  return hooked.__webpulse;
}

function xhrBodySize(xhr: XMLHttpRequest): number {
  if (xhr.response instanceof ArrayBuffer) {
    return xhr.response.byteLength;
  }
  if (xhr.response instanceof Blob) {
    return xhr.response.size;
  }
  if (typeof xhr.response === 'string') {
    return new TextEncoder().encode(xhr.response).byteLength;
  }
  try {
    return new TextEncoder().encode(xhr.responseText).byteLength;
  } catch {
    return 0;
  }
}

function contentLength(value: string | null): number {
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function decodeSample(buffer: ArrayBuffer): string | null {
  if (buffer.byteLength === 0) {
    return null;
  }
  try {
    return new TextDecoder().decode(buffer.slice(0, BODY_SAMPLE_LIMIT));
  } catch {
    return null;
  }
}

function currentPageUrl(): string {
  return resolveUrl(window.location.href).split('#')[0] ?? window.location.href;
}

function resolveUrl(value: string | URL): string {
  try {
    return new URL(String(value), window.location.href).href;
  } catch {
    return String(value);
  }
}

function elapsed(started: number): number {
  return Math.max(0, Math.round(performance.now() - started));
}
