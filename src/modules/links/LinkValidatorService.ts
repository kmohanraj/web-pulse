import { DEFAULT_VALIDATION_POLICY, fetchWithPolicy } from '@/modules/settings/requestPolicy';
import type { ValidationPolicy } from '@/modules/settings/types';
import { expandLinksByDepth } from './expandLinks';
import type { CollectedLink, LinkCheckResult, LinkOutcome, TrackedStatus } from './types';
import { TRACKED_STATUSES } from './types';

const MAX_NETWORK_CHECKS = 100;
const CONCURRENCY = 4;

interface StatusObservation {
  redirectStatus: 301 | 302 | null;
  finalStatus: number | null;
  error: string | null;
}

export class LinkValidatorService {
  async validate(
    links: CollectedLink[],
    options: { pageUrl?: string; policy?: ValidationPolicy } = {},
  ): Promise<{ results: LinkCheckResult[]; skipped: number }> {
    const policy = options.policy ?? DEFAULT_VALIDATION_POLICY;
    const expanded = options.pageUrl ? await expandLinksByDepth(links, options.pageUrl, policy) : links;
    const networkUrls = unique(
      expanded.filter((link) => link.kind !== 'anchor' && !link.malformed).map((link) => stripHash(link.url)),
    );
    const queued = networkUrls.slice(0, MAX_NETWORK_CHECKS);
    const skipped = networkUrls.length - queued.length;
    const observations = await this.inspectAll(queued, policy);

    return {
      skipped,
      results: expanded.map((link, index) => this.toResult(link, index, observations)),
    };
  }

  private async inspectAll(urls: string[], policy: ValidationPolicy): Promise<Map<string, StatusObservation>> {
    const observations = new Map<string, StatusObservation>();
    const listener = rememberRedirect(new Set(urls), observations);
    const canObserve = typeof chrome.webRequest?.onHeadersReceived?.addListener === 'function';
    if (canObserve) {
      chrome.webRequest.onHeadersReceived.addListener(listener, { urls: ['http://*/*', 'https://*/*'] });
    }

    try {
      await mapPool(urls, CONCURRENCY, (url) => recordStatus(url, observations, policy));
    } finally {
      if (canObserve) {
        chrome.webRequest.onHeadersReceived.removeListener(listener);
      }
    }

    return observations;
  }

  private toResult(
    link: CollectedLink,
    index: number,
    observations: Map<string, StatusObservation>,
  ): LinkCheckResult {
    if (link.malformed) {
      return checked({ link, index, status: null, finalStatus: null, outcome: 'unreachable', error: 'Malformed URL' });
    }

    if (link.kind === 'anchor') {
      return anchorResult(link, index);
    }

    const observation = observations.get(stripHash(link.url));
    if (!observation) {
      return checked({ link, index, status: null, finalStatus: null, outcome: 'unreachable', error: 'Link was not checked' });
    }

    const status = observation.redirectStatus ?? observation.finalStatus;
    return checked({
      link,
      index,
      status,
      finalStatus: observation.finalStatus,
      outcome: outcomeFor(status, observation.error),
      error: observation.error,
    });
  }
}

function rememberRedirect(
  pending: Set<string>,
  observations: Map<string, StatusObservation>,
): (details: chrome.webRequest.WebResponseHeadersDetails) => void {
  return (details) => {
    const key = stripHash(details.url);
    if (!pending.has(key) || !isRedirect(details.statusCode)) {
      return;
    }
    const current = observations.get(key) ?? emptyObservation();
    current.redirectStatus = details.statusCode;
    observations.set(key, current);
  };
}

async function recordStatus(
  url: string,
  observations: Map<string, StatusObservation>,
  policy: ValidationPolicy,
): Promise<void> {
  const observation = observations.get(url) ?? emptyObservation();
  try {
    observation.finalStatus = await requestStatus(url, policy);
  } catch (error) {
    observation.error = error instanceof Error ? error.message : 'Request failed';
  }
  observations.set(url, observation);
}

function isRedirect(status: number): status is 301 | 302 {
  return status === 301 || status === 302;
}

function anchorResult(link: CollectedLink, index: number): LinkCheckResult {
  const found = link.anchorFound === true;
  const status = found ? 200 : 404;
  return checked({
    link,
    index,
    status,
    finalStatus: status,
    outcome: found ? 'ok' : 'broken',
    error: found ? null : 'Anchor target was not found',
  });
}

async function requestStatus(url: string, policy: ValidationPolicy): Promise<number> {
  const head = await fetchWithPolicy(url, { method: 'HEAD', redirect: 'follow', credentials: 'omit' }, policy);
  if (head.status !== 405 && head.status !== 501) {
    await head.body?.cancel();
    return head.status;
  }

  const get = await fetchWithPolicy(url, { method: 'GET', redirect: 'follow', credentials: 'omit' }, policy);
  await get.body?.cancel();
  return get.status;
}

const BROKEN_STATUSES = new Set<number>([403, 404, 500]);

function outcomeFor(status: number | null, error: string | null): LinkOutcome {
  const known = knownOutcome(status);
  if (known) {
    return known;
  }
  return status === null || error ? 'unreachable' : 'other';
}

function knownOutcome(status: number | null): LinkOutcome | null {
  if (status !== null && isRedirect(status)) {
    return 'redirect';
  }
  if (status === 200) {
    return 'ok';
  }
  if (status !== null && BROKEN_STATUSES.has(status)) {
    return 'broken';
  }
  return null;
}

interface CheckedInput {
  link: CollectedLink;
  index: number;
  status: number | null;
  finalStatus: number | null;
  outcome: LinkOutcome;
  error: string | null;
}

function checked(input: CheckedInput): LinkCheckResult {
  return {
    id: `${input.index}:${input.link.url}`,
    href: input.link.href,
    url: input.link.url,
    text: input.link.text,
    kind: input.link.kind,
    status: input.status,
    finalStatus: input.finalStatus,
    trackedStatus: asTracked(input.status),
    outcome: input.outcome,
    error: input.error,
  };
}

function asTracked(status: number | null): TrackedStatus | null {
  return TRACKED_STATUSES.find((code) => code === status) ?? null;
}

function emptyObservation(): StatusObservation {
  return { redirectStatus: null, finalStatus: null, error: null };
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

function unique(values: string[]): string[] {
  return [...new Set(values)];
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
