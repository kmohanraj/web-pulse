export interface ObservedRequest {
  pageUrl: string;
  url: string;
  status: number | null;
  durationMs: number;
  responseSize: number;
  transport: 'fetch' | 'xhr';
  startedAt: string;
}

/**
 * Injected into the page MAIN world. Must not reference module bindings.
 * Reads calls the browser already recorded for this document, so a reload is not required.
 */
export function collectObservedRequests(): ObservedRequest[] {
  function stripHash(value: string): string {
    try {
      const url = new URL(value);
      url.hash = '';
      return url.href;
    } catch {
      return value.split('#')[0] ?? value;
    }
  }

  const pageUrl = stripHash(location.href);
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const observed: ObservedRequest[] = [];

  for (const entry of entries) {
    if (entry.initiatorType !== 'fetch' && entry.initiatorType !== 'xmlhttprequest') {
      continue;
    }
    const status = typeof entry.responseStatus === 'number' && entry.responseStatus > 0 ? entry.responseStatus : null;
    observed.push({
      pageUrl,
      url: entry.name,
      status,
      durationMs: Math.max(0, Math.round(entry.duration)),
      responseSize: entry.transferSize > 0 ? entry.transferSize : entry.encodedBodySize,
      transport: entry.initiatorType === 'xmlhttprequest' ? 'xhr' : 'fetch',
      startedAt: new Date(performance.timeOrigin + entry.startTime).toISOString(),
    });
  }

  return observed;
}
