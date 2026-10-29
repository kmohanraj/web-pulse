import { DEFAULT_VALIDATION_POLICY, fetchWithPolicy } from '@/modules/settings/requestPolicy';
import type { ValidationPolicy } from '@/modules/settings/types';
import type { SecurityCookieFact, SecurityHeaderSnapshot } from './types';

export class SecurityHeaderService {
  async capture(
    pageUrl: string,
    policy: ValidationPolicy = DEFAULT_VALIDATION_POLICY,
  ): Promise<{ headers: SecurityHeaderSnapshot; cookies: SecurityCookieFact[] }> {
    const headers = await captureHeaders(pageUrl, policy);
    const cookies = await captureCookies(pageUrl, headers.setCookies);
    return { headers, cookies };
  }
}

async function captureHeaders(pageUrl: string, policy: ValidationPolicy): Promise<SecurityHeaderSnapshot> {
  const target = new URL(pageUrl);
  const observed = new Map<string, HeaderBag>();
  const listener = (details: chrome.webRequest.WebResponseHeadersDetails): void => {
    if (!matchesPage(details.url, target)) {
      return;
    }
    observed.set(stripHash(details.url), toHeaderBag(details.responseHeaders));
  };

  const canObserve = typeof chrome.webRequest?.onHeadersReceived?.addListener === 'function';
  if (canObserve) {
    addHeaderListener(listener, `${target.protocol}//${target.host}/*`);
  }

  let statusCode: number | null = null;
  let finalUrl = pageUrl;
  let exposed: HeaderBag = {};
  let error: string | null = null;

  try {
    const response = await fetchWithPolicy(
      pageUrl,
      { method: 'GET', redirect: 'follow', cache: 'no-store', credentials: 'include' },
      policy,
    );
    statusCode = response.status;
    finalUrl = response.url || pageUrl;
    exposed = exposedHeaders(response.headers);
    await response.body?.cancel();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Could not read response headers.';
  } finally {
    if (canObserve) {
      chrome.webRequest.onHeadersReceived.removeListener(listener);
    }
  }

  const bag = observed.get(stripHash(finalUrl)) ?? observed.get(stripHash(pageUrl)) ?? lastValue(observed) ?? {};
  const merged = mergeBags(bag, exposed);

  return {
    finalUrl,
    statusCode,
    csp: first(merged, 'content-security-policy'),
    cspReportOnly: first(merged, 'content-security-policy-report-only'),
    hsts: first(merged, 'strict-transport-security'),
    xFrameOptions: first(merged, 'x-frame-options'),
    xContentTypeOptions: first(merged, 'x-content-type-options'),
    xXssProtection: first(merged, 'x-xss-protection'),
    setCookies: merged['set-cookie'] ?? [],
    error,
  };
}

async function captureCookies(pageUrl: string, setCookies: string[]): Promise<SecurityCookieFact[]> {
  try {
    if (typeof chrome.cookies?.getAll !== 'function') {
      return setCookies.map(parseSetCookie);
    }
    const stored = await chrome.cookies.getAll({ url: pageUrl });
    if (stored.length > 0) {
      return stored.map((cookie) => ({
        name: cookie.name,
        domain: cookie.domain,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: normalizeSameSite(cookie.sameSite),
      }));
    }
  } catch {
    return setCookies.map(parseSetCookie);
  }
  return setCookies.map(parseSetCookie);
}

function addHeaderListener(
  listener: (details: chrome.webRequest.WebResponseHeadersDetails) => void,
  url: string,
): void {
  try {
    chrome.webRequest.onHeadersReceived.addListener(listener, { urls: [url] }, ['responseHeaders', 'extraHeaders']);
  } catch {
    chrome.webRequest.onHeadersReceived.addListener(listener, { urls: [url] }, ['responseHeaders']);
  }
}

type HeaderBag = Record<string, string[]>;

function toHeaderBag(headers: chrome.webRequest.HttpHeader[] | undefined): HeaderBag {
  const bag: HeaderBag = {};
  for (const header of headers ?? []) {
    const name = header.name.toLowerCase();
    const value = header.value ?? '';
    bag[name] = [...(bag[name] ?? []), value];
  }
  return bag;
}

function exposedHeaders(headers: Headers): HeaderBag {
  const bag: HeaderBag = {};
  headers.forEach((value, name) => {
    const key = name.toLowerCase();
    bag[key] = [...(bag[key] ?? []), value];
  });
  const withSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const cookies = withSetCookie.getSetCookie?.() ?? [];
  if (cookies.length > 0) {
    bag['set-cookie'] = cookies;
  }
  return bag;
}

function mergeBags(primary: HeaderBag, fallback: HeaderBag): HeaderBag {
  const merged: HeaderBag = { ...fallback };
  for (const [name, values] of Object.entries(primary)) {
    if (values.length > 0) {
      merged[name] = values;
    }
  }
  return merged;
}

function first(bag: HeaderBag, name: string): string | null {
  const value = bag[name]?.find((item) => item.trim() !== '') ?? '';
  return value === '' ? null : value;
}

function parseSetCookie(header: string): SecurityCookieFact {
  const [pair, ...attributes] = header.split(';').map((part) => part.trim());
  const name = pair?.split('=')[0]?.trim() || 'cookie';
  const flags = new Set(attributes.map((part) => part.toLowerCase()));
  const sameSiteRaw = attributes.find((part) => part.toLowerCase().startsWith('samesite='))?.split('=')[1]?.trim().toLowerCase();
  return {
    name,
    domain: '',
    secure: flags.has('secure'),
    httpOnly: flags.has('httponly'),
    sameSite: sameSiteRaw === 'strict' || sameSiteRaw === 'lax' || sameSiteRaw === 'none' ? sameSiteRaw : 'unspecified',
  };
}

function normalizeSameSite(value: chrome.cookies.SameSiteStatus): SecurityCookieFact['sameSite'] {
  if (value === 'strict' || value === 'lax') {
    return value;
  }
  if (value === 'no_restriction') {
    return 'none';
  }
  return 'unspecified';
}

function matchesPage(url: string, target: URL): boolean {
  try {
    const parsed = new URL(url);
    return parsed.origin === target.origin && parsed.pathname === target.pathname;
  } catch {
    return false;
  }
}

function stripHash(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.href;
  } catch {
    return url;
  }
}

function lastValue(map: Map<string, HeaderBag>): HeaderBag | undefined {
  let last: HeaderBag | undefined;
  for (const value of map.values()) {
    last = value;
  }
  return last;
}
