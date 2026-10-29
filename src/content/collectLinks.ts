import type { CollectedLink, LinkKind } from '@/modules/links/types';

const IGNORED_PREFIXES = ['mailto:', 'tel:', 'sms:', 'javascript:'];
const MAX_TEXT_LENGTH = 120;

export function collectPageLinks(doc: Document): CollectedLink[] {
  const pageUrl = new URL(doc.baseURI);
  const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'));
  const links: CollectedLink[] = [];

  for (const anchor of anchors) {
    const href = (anchor.getAttribute('href') ?? '').trim();
    const text = accessibleText(anchor);
    if (href === '' || IGNORED_PREFIXES.some((prefix) => href.toLowerCase().startsWith(prefix))) {
      continue;
    }

    let url: URL;
    try {
      url = new URL(href, doc.baseURI);
    } catch {
      links.push({
        href,
        url: href,
        text,
        kind: 'internal',
        hash: '',
        anchorFound: null,
        malformed: true,
      });
      continue;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      continue;
    }

    const sameDocument =
      url.origin === pageUrl.origin && url.pathname === pageUrl.pathname && url.search === pageUrl.search;
    const kind = classify(href, url, pageUrl, sameDocument);

    if (kind === 'anchor') {
      const id = decodeHash(url.hash);
      links.push({
        href,
        url: url.href,
        text,
        kind,
        hash: url.hash,
        anchorFound: id !== '' && targetExists(doc, id),
        malformed: false,
      });
      continue;
    }

    links.push({
      href,
      url: url.href,
      text,
      kind,
      hash: url.hash,
      anchorFound: null,
      malformed: false,
    });
  }

  return links;
}

function classify(href: string, url: URL, pageUrl: URL, sameDocument: boolean): LinkKind {
  if (url.hash !== '' && (href.startsWith('#') || sameDocument)) {
    return 'anchor';
  }
  return url.origin === pageUrl.origin ? 'internal' : 'external';
}

function targetExists(doc: Document, id: string): boolean {
  if (doc.getElementById(id)) {
    return true;
  }
  const escaped = CSS.escape(id);
  return Boolean(doc.querySelector(`[name="${escaped}"]`));
}

function decodeHash(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function accessibleText(anchor: HTMLAnchorElement): string {
  const label = anchor.getAttribute('aria-label')?.trim() || anchor.textContent?.trim() || '';
  const imageAlt = anchor.querySelector('img')?.getAttribute('alt')?.trim() ?? '';
  return (label || imageAlt).slice(0, MAX_TEXT_LENGTH);
}
