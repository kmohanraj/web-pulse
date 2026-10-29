import type { ExportConsoleError } from './types';

/**
 * Injected into the page MAIN world. Must not reference module bindings.
 * The network hook stores errors on window.__webpulseConsoleErrors.
 */
export function readPageConsoleErrors(): ExportConsoleError[] {
  const host = window as Window & { __webpulseConsoleErrors?: unknown };
  const buffer = host.__webpulseConsoleErrors;
  if (!Array.isArray(buffer)) {
    return [];
  }

  const errors: ExportConsoleError[] = [];
  for (const item of buffer) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const record = item as { level?: unknown; message?: unknown; source?: unknown; timestamp?: unknown };
    if (typeof record.message !== 'string' || record.message.trim() === '') {
      continue;
    }
    errors.push({
      level: record.level === 'unhandled' ? 'unhandled' : 'error',
      message: record.message.slice(0, 500),
      source: typeof record.source === 'string' ? record.source : null,
      timestamp: typeof record.timestamp === 'string' ? record.timestamp : '',
    });
  }
  return errors.slice(-100);
}
