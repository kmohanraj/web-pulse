import type { NetworkRecord, NetworkSizePatch } from '@/modules/network/types';

const STORAGE_KEY = 'webpulse-network-v1';
const MAX_RECORDS = 400;

type TabStore = Record<string, NetworkRecord[]>;

let cache: TabStore = {};
let loaded: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function startNetworkMonitor(): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!isObject(message) || typeof message.type !== 'string') {
      return false;
    }

    if (message.type === 'WEBPULSE_NETWORK_EVENT' && isRecord(message.record)) {
      const tabId = sender.tab?.id;
      if (tabId === undefined) {
        return false;
      }
      void remember(tabId, message.record).then(() => sendResponse({ ok: true }));
      return true;
    }

    if (message.type === 'WEBPULSE_NETWORK_PATCH' && isPatch(message.patch)) {
      const tabId = sender.tab?.id;
      if (tabId === undefined) {
        return false;
      }
      void patch(tabId, message.patch).then(() => sendResponse({ ok: true }));
      return true;
    }

    if (message.type === 'WEBPULSE_NETWORK_QUERY' && typeof message.tabId === 'number') {
      void query(message.tabId).then((result) => sendResponse(result));
      return true;
    }

    if (message.type === 'WEBPULSE_NETWORK_CLEAR' && typeof message.tabId === 'number') {
      void clearTab(message.tabId).then(() => sendResponse({ ok: true }));
      return true;
    }

    return false;
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    void clearTab(tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      void pruneTab(tabId, changeInfo.url);
    }
  });
}

async function remember(tabId: number, record: NetworkRecord): Promise<void> {
  await ensureLoaded();
  const key = String(tabId);
  const current = cache[key] ?? [];
  const next = current.some((item) => item.id === record.id) ? current : [...current, record];
  cache[key] = next.slice(-MAX_RECORDS);
  schedulePersist();
  broadcast({ type: 'WEBPULSE_NETWORK_UPDATED', tabId, record });
}

async function patch(tabId: number, update: NetworkSizePatch): Promise<void> {
  await ensureLoaded();
  const key = String(tabId);
  const current = cache[key];
  if (!current) {
    return;
  }
  const index = current.findIndex((item) => item.id === update.id);
  const existing = index >= 0 ? current[index] : undefined;
  if (!existing || existing.responseSize === update.responseSize) {
    return;
  }
  const updated: NetworkRecord = { ...existing, responseSize: update.responseSize };
  const next = current.slice();
  next[index] = updated;
  cache[key] = next;
  schedulePersist();
  broadcast({ type: 'WEBPULSE_NETWORK_UPDATED', tabId, record: updated });
}

async function query(tabId: number): Promise<{ ok: true; tabId: number; pageUrl: string | null; records: NetworkRecord[] }> {
  await ensureLoaded();
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  return {
    ok: true,
    tabId,
    pageUrl: tab?.url ?? null,
    records: cache[String(tabId)] ?? [],
  };
}

async function pruneTab(tabId: number, url: string): Promise<void> {
  await ensureLoaded();
  const key = String(tabId);
  const current = cache[key];
  if (!current?.length) {
    return;
  }
  const nextUrl = stripHash(url);
  const kept = current.filter((record) => record.pageUrl === nextUrl);
  if (kept.length === current.length) {
    return;
  }
  if (kept.length === 0) {
    delete cache[key];
  } else {
    cache[key] = kept;
  }
  schedulePersist();
  broadcast({ type: 'WEBPULSE_NETWORK_CLEARED', tabId });
}

async function clearTab(tabId: number): Promise<void> {
  await ensureLoaded();
  const key = String(tabId);
  if (!cache[key]) {
    return;
  }
  delete cache[key];
  schedulePersist();
  broadcast({ type: 'WEBPULSE_NETWORK_CLEARED', tabId });
}

function ensureLoaded(): Promise<void> {
  loaded ??= chrome.storage.session.get(STORAGE_KEY).then((stored) => {
    const value = stored[STORAGE_KEY];
    cache = isTabStore(value) ? value : {};
  });
  return loaded;
}

function schedulePersist(): void {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void chrome.storage.session.set({ [STORAGE_KEY]: cache });
  }, 200);
}

function broadcast(message: unknown): void {
  void chrome.runtime.sendMessage(message).catch(() => undefined);
}

function stripHash(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.href;
  } catch {
    return url.split('#')[0] ?? url;
  }
}

function isRecord(value: unknown): value is NetworkRecord {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.pageUrl === 'string' &&
    typeof value.url === 'string' &&
    typeof value.method === 'string'
  );
}

function isPatch(value: unknown): value is NetworkSizePatch {
  return isObject(value) && typeof value.id === 'string' && typeof value.responseSize === 'number';
}

function isTabStore(value: unknown): value is TabStore {
  return isObject(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
