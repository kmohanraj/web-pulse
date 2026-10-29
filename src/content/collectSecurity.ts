import type { IframeFact, MixedContentFact, SecurityDomSnapshot } from '@/modules/security/types';

const MAX_ITEMS = 40;
const RESOURCE_SELECTOR = 'script[src], img[src], iframe[src], audio[src], video[src], source[src], embed[src], object[data], link[href]';

export function collectSecuritySnapshot(doc: Document): SecurityDomSnapshot {
  const pageUrl = new URL(doc.location.href);
  const mixed = collectMixedContent(doc, pageUrl);
  const iframes = collectIframes(doc);

  return {
    pageUrl: pageUrl.href,
    protocol: pageUrl.protocol,
    mixedContent: mixed.slice(0, MAX_ITEMS),
    mixedContentTotal: mixed.length,
    metaCsp: metaContent(doc, 'content-security-policy'),
    metaCspReportOnly: metaContent(doc, 'content-security-policy-report-only'),
    iframes: iframes.slice(0, MAX_ITEMS),
    iframeTotal: iframes.length,
    inlineHandlerCount: countInlineHandlers(doc),
    javascriptUrlCount: countJavascriptUrls(doc),
  };
}

function collectMixedContent(doc: Document, pageUrl: URL): MixedContentFact[] {
  if (pageUrl.protocol !== 'https:') {
    return [];
  }

  const found: MixedContentFact[] = [];
  for (const element of doc.querySelectorAll<HTMLElement>(RESOURCE_SELECTOR)) {
    const raw = element.getAttribute('src') ?? element.getAttribute('href') ?? element.getAttribute('data') ?? '';
    const url = toHttpUrl(raw, doc.baseURI);
    if (!url) {
      continue;
    }
    found.push({ url: url.href, tag: element.tagName.toLowerCase(), active: isActiveMixed(element) });
  }

  for (const form of doc.querySelectorAll('form[action]')) {
    const url = toHttpUrl(form.getAttribute('action') ?? '', doc.baseURI);
    if (url) {
      found.push({ url: url.href, tag: 'form', active: true });
    }
  }

  return found;
}

function collectIframes(doc: Document): IframeFact[] {
  return Array.from(doc.querySelectorAll('iframe')).map((frame) => ({
    target: describe(frame),
    src: frame.getAttribute('src')?.trim() || 'about:blank',
    sandbox: frame.hasAttribute('sandbox') ? (frame.getAttribute('sandbox') ?? '') : null,
  }));
}

function countInlineHandlers(doc: Document): number {
  let count = 0;
  for (const element of doc.querySelectorAll('*')) {
    for (const attribute of element.attributes) {
      if (attribute.name.startsWith('on') && attribute.name.length > 2) {
        count += 1;
      }
    }
  }
  return count;
}

function countJavascriptUrls(doc: Document): number {
  let count = 0;
  for (const element of doc.querySelectorAll('[href], [src], [action]')) {
    const raw = element.getAttribute('href') ?? element.getAttribute('src') ?? element.getAttribute('action') ?? '';
    if (raw.trim().toLowerCase().startsWith('javascript:')) {
      count += 1;
    }
  }
  return count;
}

function isActiveMixed(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase();
  if (tag === 'script' || tag === 'iframe' || tag === 'embed' || tag === 'object') {
    return true;
  }
  if (tag !== 'link') {
    return false;
  }
  const rel = (element.getAttribute('rel') ?? '').toLowerCase();
  return rel.includes('stylesheet') || rel.includes('preload') || rel.includes('modulepreload') || rel.includes('font');
}

function toHttpUrl(raw: string, base: string): URL | null {
  try {
    const url = new URL(raw, base);
    return url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function metaContent(doc: Document, name: string): string | null {
  const expected = name.toLowerCase();
  for (const meta of doc.querySelectorAll('meta')) {
    const httpEquiv = meta.getAttribute('http-equiv')?.trim().toLowerCase() ?? '';
    if (httpEquiv === expected) {
      const content = meta.getAttribute('content')?.trim() ?? '';
      if (content !== '') {
        return content;
      }
    }
  }
  return null;
}

function describe(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const src = element.getAttribute('src')?.trim().slice(0, 80) ?? '';
  return src ? `${tag}${id} ${src}` : `${tag}${id}`;
}
