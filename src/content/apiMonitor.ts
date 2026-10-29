import type { ApiCallRecord, ApiSummary } from '@/shared/types';

const SLOW_THRESHOLD_MS = 1000;
const MAX_RECORDS = 100;
const API_INITIATORS = new Set(['fetch', 'xmlhttprequest']);

export function collectApiCalls(): ApiSummary {
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  const calls: ApiCallRecord[] = entries
    .filter((entry) => API_INITIATORS.has(entry.initiatorType))
    .map((entry) => ({
      url: entry.name,
      durationMs: Math.round(entry.duration),
      transferSize: entry.transferSize,
      slow: entry.duration > SLOW_THRESHOLD_MS,
    }));

  return {
    total: calls.length,
    slow: calls.filter((call) => call.slow).length,
    calls: calls.slice(0, MAX_RECORDS),
  };
}
