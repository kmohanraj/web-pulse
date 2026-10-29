import { DEFAULT_VALIDATION_POLICY, fetchWithPolicy } from '@/modules/settings/requestPolicy';
import type { ValidationPolicy } from '@/modules/settings/types';
import type { CollectedImage, ImageCheckResult, ImageIssueCode, ImageStatus } from './types';

const MAX_NETWORK_CHECKS = 80;
const CONCURRENCY = 4;

const RECOMMENDATIONS: Record<ImageIssueCode, string> = {
  empty_src: 'Set a non-empty src or srcset, or remove the image element.',
  missing_alt: 'Add alt text that describes the image. Use an empty alt only when the image is decorative.',
  broken: 'The image did not load, or the URL is invalid. Open View to confirm, then point src at a file the page can display.',
  forbidden: 'The server returned 403. Allow this image URL to be fetched, or host the file where the page can access it.',
  not_found: 'The server returned 404. Update src to an image that exists, or restore the missing file.',
};

const ISSUE_PRIORITY: readonly ImageIssueCode[] = ['empty_src', 'forbidden', 'not_found', 'broken', 'missing_alt'];

interface StatusObservation {
  status: number | null;
  error: string | null;
}

export class ImageValidatorService {
  async validate(
    images: CollectedImage[],
    policy: ValidationPolicy = DEFAULT_VALIDATION_POLICY,
  ): Promise<{ results: ImageCheckResult[]; skipped: number }> {
    const urls = unique(images.map(absoluteUrl).filter((url): url is string => url !== null && isHttp(url)));
    const queued = urls.slice(0, MAX_NETWORK_CHECKS);
    const skipped = urls.length - queued.length;
    const observations = await this.inspectAll(queued, policy);

    return {
      skipped,
      results: images.map((image, index) => this.toResult(image, index, observations)),
    };
  }

  private async inspectAll(urls: string[], policy: ValidationPolicy): Promise<Map<string, StatusObservation>> {
    const observations = new Map<string, StatusObservation>();
    const pending = new Set(urls);
    const listener = (details: chrome.webRequest.WebResponseHeadersDetails): void => {
      const tracked = details.statusCode === 403 || details.statusCode === 404;
      if (!pending.has(details.url) || !tracked) {
        return;
      }
      const current = observations.get(details.url) ?? { status: null, error: null };
      if (current.status !== 403) {
        current.status = details.statusCode;
        observations.set(details.url, current);
      }
    };

    const canObserve = typeof chrome.webRequest?.onHeadersReceived?.addListener === 'function';
    if (canObserve) {
      chrome.webRequest.onHeadersReceived.addListener(listener, { urls: ['http://*/*', 'https://*/*'] });
    }

    try {
      await mapPool(urls, CONCURRENCY, async (url) => {
        const observation = observations.get(url) ?? { status: null, error: null };
        try {
          const status = await requestStatus(url, policy);
          if (observation.status !== 403 && observation.status !== 404) {
            observation.status = status;
          }
        } catch (error) {
          observation.error = error instanceof Error ? error.message : 'Request failed';
        }
        observations.set(url, observation);
      });
    } finally {
      if (canObserve) {
        chrome.webRequest.onHeadersReceived.removeListener(listener);
      }
    }

    return observations;
  }

  private toResult(image: CollectedImage, index: number, observations: Map<string, StatusObservation>): ImageCheckResult {
    const url = absoluteUrl(image);
    const issues = issuesFor(image, url, url ? observations.get(url) : undefined);
    const status = primaryStatus(issues);
    const statusCode = url ? observations.get(url)?.status ?? null : null;

    return {
      id: `${index}:${url ?? image.src}`,
      src: url ?? image.src,
      previewUrl: previewUrl(url),
      alt: image.alt,
      statusCode,
      status,
      issues,
      recommendation: recommendationFor(issues),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }
}

function issuesFor(image: CollectedImage, url: string | null, observation: StatusObservation | undefined): ImageIssueCode[] {
  const issues: ImageIssueCode[] = [];
  if (url === null) {
    issues.push('empty_src');
  } else if (observation?.status === 403) {
    issues.push('forbidden');
  } else if (observation?.status === 404) {
    issues.push('not_found');
  } else if (image.broken || httpStatusFailed(observation?.status)) {
    issues.push('broken');
  }

  if (image.altMissing) {
    issues.push('missing_alt');
  }
  return issues;
}

function httpStatusFailed(status: number | null | undefined): boolean {
  return status !== null && status !== undefined && status >= 400 && status !== 403 && status !== 404;
}

function primaryStatus(issues: ImageIssueCode[]): ImageStatus {
  return ISSUE_PRIORITY.find((issue) => issues.includes(issue)) ?? 'ok';
}

function recommendationFor(issues: ImageIssueCode[]): string {
  if (issues.length === 0) {
    return 'No action needed. The image loaded and has an alt attribute.';
  }
  return issues.map((issue) => RECOMMENDATIONS[issue]).join(' ');
}

function absoluteUrl(image: CollectedImage): string | null {
  const raw = image.currentSrc || image.src;
  if (raw.trim() === '') {
    return null;
  }
  try {
    return new URL(raw).href;
  } catch {
    return raw;
  }
}

function previewUrl(url: string | null): string | null {
  if (url === null) {
    return null;
  }
  if (url.startsWith('data:image/') || url.startsWith('blob:') || isHttp(url)) {
    return url;
  }
  return null;
}

function isHttp(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
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
