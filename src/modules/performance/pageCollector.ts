import type { PerformanceSnapshot } from './types';

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface InteractionEntry extends PerformanceEntry {
  duration: number;
  interactionId?: number;
}

/**
 * Injected into the page MAIN world. Must not reference module bindings.
 */
export function collectPagePerformance(): PerformanceSnapshot {
  function readTtfb(): number | null {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!navigation || navigation.responseStart <= 0) {
      return null;
    }
    return round(navigation.responseStart);
  }

  function readFcp(): number | null {
    const paint = performance.getEntriesByName('first-contentful-paint')[0];
    return paint ? round(paint.startTime) : null;
  }

  function readLcp(): number | null {
    const entries = buffered('largest-contentful-paint');
    const latest = entries[entries.length - 1];
    return latest ? round(latest.startTime) : null;
  }

  function readCls(): number | null {
    let entries: LayoutShiftEntry[];
    try {
      entries = buffered('layout-shift') as LayoutShiftEntry[];
    } catch {
      return null;
    }
    const shifts = entries.filter((entry) => !entry.hadRecentInput).sort((left, right) => left.startTime - right.startTime);
    if (shifts.length === 0) {
      return 0;
    }

    let maxSession = 0;
    let sessionValue = 0;
    let sessionStart = 0;
    let previous = 0;
    for (const entry of shifts) {
      const gap = previous === 0 ? 0 : entry.startTime - previous;
      if (startsNewSession(previous, gap, entry.startTime, sessionStart)) {
        maxSession = Math.max(maxSession, sessionValue);
        sessionValue = 0;
        sessionStart = entry.startTime;
      }
      if (sessionValue === 0) {
        sessionStart = entry.startTime;
      }
      sessionValue += entry.value;
      previous = entry.startTime;
    }
    return round(Math.max(maxSession, sessionValue), 3);
  }

  function startsNewSession(previousTime: number, gapMs: number, startTime: number, sessionStarted: number): boolean {
    if (previousTime === 0) {
      return false;
    }
    return gapMs > 1000 || startTime - sessionStarted > 5000;
  }

  function readInp(): number | null {
    let entries: InteractionEntry[];
    try {
      entries = buffered('event') as InteractionEntry[];
    } catch {
      return null;
    }
    const durations = new Map<number, number>();
    for (const entry of entries) {
      if (!entry.interactionId) {
        continue;
      }
      const current = durations.get(entry.interactionId) ?? 0;
      if (entry.duration > current) {
        durations.set(entry.interactionId, entry.duration);
      }
    }
    const worstFirst = [...durations.values()].sort((left, right) => right - left);
    if (worstFirst.length === 0) {
      return null;
    }
    const index = Math.min(worstFirst.length - 1, Math.floor(worstFirst.length / 50));
    return round(worstFirst[index] ?? 0);
  }

  function buffered(type: string): PerformanceEntry[] {
    const entries: PerformanceEntry[] = [];
    const observer = new PerformanceObserver((list) => {
      entries.push(...list.getEntries());
    });
    observer.observe(observeOptions(type));
    observer.disconnect();
    return entries;
  }

  function observeOptions(entryType: string): PerformanceObserverInit {
    const options: PerformanceObserverInit = { type: entryType, buffered: true };
    if (entryType !== 'event') {
      return options;
    }
    return { ...options, durationThreshold: 16 } as PerformanceObserverInit;
  }

  function round(value: number, digits = 0): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  return {
    pageUrl: location.href,
    ttfb: readTtfb(),
    fcp: readFcp(),
    lcp: readLcp(),
    cls: readCls(),
    inp: readInp(),
  };
}
