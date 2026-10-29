import type { AuditFinding, CategoryAudit, IssueSeverity, PageAudit } from '@/shared/types';

const MAX_FINDINGS = 12;
const SLOW_MS = 1000;
const VERY_SLOW_MS = 3000;

export function collectPageAudit(doc: Document): PageAudit {
  return {
    images: auditImages(doc),
    seo: auditSeo(doc),
    accessibility: auditAccessibility(doc),
    security: auditSecurity(doc),
    performance: auditPerformance(doc),
  };
}

function auditImages(doc: Document): CategoryAudit {
  const images = Array.from(doc.querySelectorAll<HTMLImageElement>('img'));
  const findings: AuditFinding[] = [];

  for (const image of images) {
    const src = (image.getAttribute('src') ?? '').trim();
    const label = image.currentSrc || src || 'image';
    if (src === '') {
      findings.push(finding('error', 'Image is missing a src', label));
    }
    if (!image.hasAttribute('alt')) {
      findings.push(finding('warning', 'Image is missing alt text', label));
    }
    if (!image.hasAttribute('width') || !image.hasAttribute('height')) {
      findings.push(finding('warning', 'Image is missing width or height', label));
    }
  }

  return result(images.length, findings);
}

function auditSeo(doc: Document): CategoryAudit {
  const findings: AuditFinding[] = [];
  const title = doc.title.trim();
  const description = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';
  const headings = doc.querySelectorAll('h1');
  let checked = 3;

  if (title === '') {
    findings.push(finding('error', 'Document title is missing'));
  } else if (title.length > 60) {
    findings.push(finding('warning', 'Document title is longer than 60 characters', title));
  }

  if (description === '') {
    findings.push(finding('warning', 'Meta description is missing'));
  } else if (description.length > 160) {
    findings.push(finding('warning', 'Meta description is longer than 160 characters'));
  }

  if (headings.length === 0) {
    findings.push(finding('error', 'Page has no h1'));
  } else if (headings.length > 1) {
    findings.push(finding('warning', `Page has ${headings.length} h1 elements`));
  }

  if (!doc.querySelector('link[rel="canonical"]')) {
    findings.push(finding('warning', 'Canonical link is missing'));
    checked += 1;
  }

  return result(checked, findings);
}

function auditAccessibility(doc: Document): CategoryAudit {
  const findings: AuditFinding[] = [];
  const controls = Array.from(doc.querySelectorAll<HTMLElement>('input, select, textarea, button'));

  if (!doc.documentElement.lang.trim()) {
    findings.push(finding('error', 'html element is missing a lang attribute'));
  }

  for (const control of controls) {
    if (control.closest('[aria-hidden="true"]')) {
      continue;
    }
    if (hasAccessibleName(doc, control)) {
      continue;
    }
    const name = control.getAttribute('name') || control.tagName.toLowerCase();
    findings.push(finding('warning', 'Control has no accessible name', name));
  }

  let previousLevel = 0;
  for (const heading of Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))) {
    const level = Number(heading.tagName.slice(1));
    if (previousLevel > 0 && level > previousLevel + 1) {
      findings.push(
        finding('warning', `Heading level skipped from h${previousLevel} to h${level}`, heading.textContent?.trim()),
      );
    }
    previousLevel = level;
  }

  return result(controls.length + 1, findings);
}

function auditSecurity(doc: Document): CategoryAudit {
  const findings: AuditFinding[] = [];
  const pageIsSecure = new URL(doc.baseURI).protocol === 'https:';
  const assets = Array.from(doc.querySelectorAll<HTMLElement>('script[src], img[src], iframe[src], link[href]'));
  let checked = 1;

  if (!pageIsSecure) {
    findings.push(finding('warning', 'Page is not served over HTTPS', doc.baseURI));
  }

  for (const asset of assets) {
    const raw = asset.getAttribute('src') ?? asset.getAttribute('href') ?? '';
    checked += 1;
    try {
      const url = new URL(raw, doc.baseURI);
      if (pageIsSecure && url.protocol === 'http:') {
        findings.push(finding('error', 'Mixed content reference', url.href));
      }
    } catch {
      findings.push(finding('warning', 'Unparseable resource URL', raw));
    }
  }

  for (const form of Array.from(doc.querySelectorAll('form'))) {
    const action = form.getAttribute('action');
    if (!action) {
      continue;
    }
    checked += 1;
    try {
      if (new URL(action, doc.baseURI).protocol === 'http:' && pageIsSecure) {
        findings.push(finding('error', 'Form posts to an insecure URL', action));
      }
    } catch {
      findings.push(finding('warning', 'Form action is not a valid URL', action));
    }
  }

  return result(checked, findings);
}

function auditPerformance(doc: Document): CategoryAudit {
  const findings: AuditFinding[] = [];
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const visibleResources = resources.filter((entry) => entry.initiatorType !== 'fetch' && entry.initiatorType !== 'xmlhttprequest');

  for (const entry of visibleResources) {
    if (entry.duration > VERY_SLOW_MS) {
      findings.push(finding('error', 'Resource took over 3s', entry.name));
    } else if (entry.duration > SLOW_MS) {
      findings.push(finding('warning', 'Resource took over 1s', entry.name));
    }
    if (entry.transferSize > 2_000_000) {
      findings.push(finding('error', 'Resource is larger than 2 MB', entry.name));
    } else if (entry.transferSize > 500_000) {
      findings.push(finding('warning', 'Resource is larger than 500 KB', entry.name));
    }
  }

  const nodes = doc.getElementsByTagName('*').length;
  if (nodes > 3000) {
    findings.push(finding('error', `DOM has ${nodes} elements`));
  } else if (nodes > 1500) {
    findings.push(finding('warning', `DOM has ${nodes} elements`));
  }

  return result(visibleResources.length + 1, findings);
}

function hasAccessibleName(doc: Document, control: HTMLElement): boolean {
  if (control.getAttribute('aria-label')?.trim()) {
    return true;
  }
  if (control.getAttribute('aria-labelledby')?.trim()) {
    return true;
  }
  if (control.closest('label')) {
    return true;
  }
  const id = control.getAttribute('id');
  if (id && doc.querySelector(`label[for="${CSS.escape(id)}"]`)) {
    return true;
  }
  if (control instanceof HTMLInputElement && (control.type === 'hidden' || control.type === 'submit' || control.type === 'button')) {
    return control.value.trim() !== '' || control.type === 'hidden';
  }
  return (control.textContent ?? '').trim() !== '';
}

function finding(severity: IssueSeverity, message: string, target?: string): AuditFinding {
  const trimmed = target?.trim();
  return trimmed ? { severity, message, target: trimmed.slice(0, 160) } : { severity, message };
}

function result(checked: number, findings: AuditFinding[]): CategoryAudit {
  return { checked, findings: findings.slice(0, MAX_FINDINGS) };
}
