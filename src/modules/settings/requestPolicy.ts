import type { ValidationPolicy } from './types';
import { DEFAULT_SETTINGS } from './types';

export const DEFAULT_VALIDATION_POLICY: ValidationPolicy = {
  timeoutMs: DEFAULT_SETTINGS.validationTimeoutMs,
  retryCount: DEFAULT_SETTINGS.retryCount,
  scanDepth: DEFAULT_SETTINGS.scanDepth,
};

export async function fetchWithPolicy(url: string, init: RequestInit, policy: ValidationPolicy = DEFAULT_VALIDATION_POLICY): Promise<Response> {
  const attempts = policy.retryCount + 1;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(policy.timeoutMs),
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}
