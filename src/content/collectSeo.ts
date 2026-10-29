import type { SeoSnapshot } from '@/modules/seo/types';

const OPEN_GRAPH_KEYS = ['og:title', 'og:description', 'og:url', 'og:type', 'og:image'] as const;
const TWITTER_KEYS = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'] as const;

export function collectSeoSnapshot(doc: Document): SeoSnapshot {
  return {
    pageUrl: doc.location.href,
    title: doc.title.trim(),
    description: metaContent(doc, 'description'),
    canonicals: canonicalHrefs(doc),
    h1s: Array.from(doc.querySelectorAll('h1'))
      .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter((text) => text !== ''),
    openGraph: readKeys(doc, OPEN_GRAPH_KEYS),
    twitter: readKeys(doc, TWITTER_KEYS),
    robots: metaContent(doc, 'robots'),
  };
}

function canonicalHrefs(doc: Document): string[] {
  return Array.from(doc.querySelectorAll('link[rel]'))
    .filter((link) => (link.getAttribute('rel') ?? '').toLowerCase().split(/\s+/).includes('canonical'))
    .map((link) => link.getAttribute('href')?.trim() ?? '')
    .filter((href) => href !== '');
}

function readKeys(doc: Document, keys: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const content = metaContent(doc, key);
    if (content) {
      values[key] = content;
    }
  }
  return values;
}

function metaContent(doc: Document, key: string): string | null {
  const expected = key.toLowerCase();
  for (const meta of doc.querySelectorAll('meta')) {
    const name = (meta.getAttribute('name') ?? meta.getAttribute('property') ?? '').trim().toLowerCase();
    if (name !== expected) {
      continue;
    }
    const content = meta.getAttribute('content')?.trim() ?? '';
    if (content !== '') {
      return content;
    }
  }
  return null;
}
