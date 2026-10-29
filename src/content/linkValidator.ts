import type { IssueSeverity, LinkIssue, LinkSummary } from '@/shared/types';

const IGNORED_PREFIXES = ['mailto:', 'tel:', 'sms:', 'javascript:'];
const MAX_TEXT_LENGTH = 120;

export function validateLinks(doc: Document): LinkSummary {
  const pageOrigin = new URL(doc.baseURI).origin;
  const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'));
  const issues: LinkIssue[] = [];
  let internal = 0;
  let external = 0;

  for (const anchor of anchors) {
    const href = (anchor.getAttribute('href') ?? '').trim();
    const text = getAccessibleText(anchor);
    const report = (severity: IssueSeverity, reason: string): void => {
      issues.push({ href, text, severity, reason });
    };

    if (href === '' || href === '#') {
      report('warning', 'Empty or placeholder href');
      continue;
    }

    if (IGNORED_PREFIXES.some((prefix) => href.toLowerCase().startsWith(prefix))) {
      continue;
    }

    let url: URL;
    try {
      url = new URL(href, doc.baseURI);
    } catch {
      report('error', 'Malformed URL');
      continue;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      report('warning', `Unsupported protocol ${url.protocol}`);
      continue;
    }

    if (url.origin === pageOrigin) {
      internal += 1;
    } else {
      external += 1;
    }

    if (text === '') {
      report('warning', 'Link has no accessible text');
    }

    if (anchor.target === '_blank' && !/\b(noopener|noreferrer)\b/.test(anchor.rel)) {
      report('warning', 'target="_blank" without rel="noopener"');
    }
  }

  return { total: anchors.length, internal, external, issues };
}

function getAccessibleText(anchor: HTMLAnchorElement): string {
  const label = anchor.getAttribute('aria-label')?.trim() || anchor.textContent?.trim() || '';
  const imageAlt = anchor.querySelector('img')?.getAttribute('alt')?.trim() ?? '';
  return (label || imageAlt).slice(0, MAX_TEXT_LENGTH);
}
