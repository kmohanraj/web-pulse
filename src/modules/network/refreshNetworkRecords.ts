import { fetchWithPolicy } from '@/modules/settings/requestPolicy';
import type { ValidationPolicy } from '@/modules/settings/types';
import type { ObservedRequest } from './collectObservedRequests';
import type { NetworkRecord } from './types';

const MAX_REFRESH = 60;
const CONCURRENCY = 4;

export function mergeNetworkRecords(
  captured: readonly NetworkRecord[],
  observed: readonly ObservedRequest[],
  pageUrl: string,
): NetworkRecord[] {
  const byKey = new Map<string, NetworkRecord>();
  for (const record of captured) {
    remember(byKey, record);
  }
  for (const item of observed) {
    if (hasUrl(byKey, item.url)) {
      continue;
    }
    remember(byKey, observedRecord(item, pageUrl));
  }
  return [...byKey.values()];
}

export function chooseFreshStatus(observed: number | null, fresh: number | null): number | null {
  if (fresh === null) {
    return observed;
  }
  if (observed !== null && observed < 400 && fresh >= 400) {
    return observed;
  }
  return fresh;
}

export async function refreshSafeRequests(records: readonly NetworkRecord[], policy: ValidationPolicy): Promise<NetworkRecord[]> {
  const queued = records.filter(canRefresh).slice(0, MAX_REFRESH);
  const refreshed = new Map<string, NetworkRecord>();
  await mapPool(queued, CONCURRENCY, async (record) => {
    const started = performance.now();
    const fresh = await requestStatus(record.url, record.method, policy);
    const status = chooseFreshStatus(record.status, fresh);
    refreshed.set(record.id, {
      ...record,
      status,
      durationMs: fresh === null || status !== fresh ? record.durationMs : Math.max(0, Math.round(performance.now() - started)),
    });
  });
  return records.map((record) => refreshed.get(record.id) ?? record);
}

function canRefresh(record: NetworkRecord): boolean {
  const method = record.method.toUpperCase();
  return (method === 'GET' || method === 'HEAD') && isHttp(record.url);
}

async function requestStatus(url: string, method: string, policy: ValidationPolicy): Promise<number | null> {
  try {
    if (method.toUpperCase() === 'HEAD') {
      const head = await fetchWithPolicy(url, { method: 'HEAD', redirect: 'follow', cache: 'no-store', credentials: 'omit' }, policy);
      await head.body?.cancel();
      return head.status;
    }
    const head = await fetchWithPolicy(url, { method: 'HEAD', redirect: 'follow', cache: 'no-store', credentials: 'omit' }, policy);
    if (head.status !== 405 && head.status !== 501) {
      await head.body?.cancel();
      return head.status;
    }
    const get = await fetchWithPolicy(url, { method: 'GET', redirect: 'follow', cache: 'no-store', credentials: 'omit' }, policy);
    await get.body?.cancel();
    return get.status;
  } catch {
    return null;
  }
}

function remember(byKey: Map<string, NetworkRecord>, record: NetworkRecord): void {
  const key = `${record.method.toUpperCase()} ${stripHash(record.url)}`;
  const existing = byKey.get(key);
  if (!existing || record.startedAt > existing.startedAt) {
    byKey.set(key, record);
  }
}

function hasUrl(byKey: Map<string, NetworkRecord>, url: string): boolean {
  const target = stripHash(url);
  for (const record of byKey.values()) {
    if (stripHash(record.url) === target) {
      return true;
    }
  }
  return false;
}

function observedRecord(item: ObservedRequest, pageUrl: string): NetworkRecord {
  return {
    id: `observed:${item.transport}:${stripHash(item.url)}:${item.startedAt}`,
    pageUrl: item.pageUrl || pageUrl,
    url: item.url,
    method: 'GET',
    status: item.status,
    durationMs: item.durationMs,
    requestSize: 0,
    responseSize: item.responseSize,
    channel: item.transport,
    transport: item.transport,
    operationName: null,
    startedAt: item.startedAt,
  };
}

function isHttp(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function stripHash(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.href;
  } catch {
    return value.split('#')[0] ?? value;
  }
}

async function mapPool<T>(items: readonly T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  if (items.length === 0) {
    return;
  }
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      const item = items[current];
      if (item !== undefined) {
        await worker(item);
      }
    }
  });
  await Promise.all(runners);
}
