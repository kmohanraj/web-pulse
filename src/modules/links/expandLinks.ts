import type { CollectedLink } from './types';
import { fetchWithPolicy } from '@/modules/settings/requestPolicy';
import type { ValidationPolicy } from '@/modules/settings/types';

const MAX_PAGES = 16;
const MAX_HTML_CHARS = 500_000;

export async function expandLinksByDepth(
  links: CollectedLink[],
  pageUrl: string,
  policy: ValidationPolicy,
): Promise<CollectedLink[]> {
  if (policy.scanDepth <= 1) {
    return links;
  }

  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    return links;
  }

  const collected = [...links];
  const seenPages = new Set<string>([stripHash(pageUrl)]);
  let frontier = sameOriginPages(links, origin).filter((url) => !seenPages.has(url));

  for (let depth = 2; depth <= policy.scanDepth && frontier.length > 0 && seenPages.size < MAX_PAGES; depth += 1) {
    const batch = frontier.filter((url) => !seenPages.has(url)).slice(0, MAX_PAGES - seenPages.size);
    const next: string[] = [];
    await mapPool(batch, 3, async (url) => {
      seenPages.add(url);
      const html = await fetchHtml(url, policy);
      if (!html) {
        return;
      }
      for (const link of extractAnchors(html, url, origin)) {
        collected.push(link);
        const page = stripHash(link.url);
        if (link.kind === 'internal' && !seenPages.has(page)) {
          next.push(page);
        }
      }
    });
    frontier = [...new Set(next)];
  }

  return collected;
}

async function fetchHtml(url: string, policy: ValidationPolicy): Promise<string | null> {
  try {
    const response = await fetchWithPolicy(url, { method: 'GET', redirect: 'follow', credentials: 'omit' }, policy);
    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }
    const text = await response.text();
    return text.slice(0, MAX_HTML_CHARS);
  } catch {
    return null;
  }
}

function extractAnchors(html: string, baseUrl: string, origin: string): CollectedLink[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const found: CollectedLink[] = [];
  for (const anchor of Array.from(doc.querySelectorAll('a[href]'))) {
    const href = (anchor.getAttribute('href') ?? '').trim();
    if (href === '' || /^(mailto:|tel:|sms:|javascript:)/i.test(href)) {
      continue;
    }
    let url: URL;
    try {
      url = new URL(href, baseUrl);
    } catch {
      continue;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      continue;
    }
    const text = (anchor.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
    found.push({
      href,
      url: url.href,
      text,
      kind: url.origin === origin ? 'internal' : 'external',
      hash: url.hash,
      anchorFound: null,
      malformed: false,
    });
  }
  return found;
}

function sameOriginPages(links: CollectedLink[], origin: string): string[] {
  return [...new Set(links.filter((link) => link.kind === 'internal' && !link.malformed && link.url.startsWith(origin)).map((link) => stripHash(link.url)))];
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
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      if (current !== undefined) {
        await worker(current);
      }
    }
  });
  await Promise.all(runners);
}
