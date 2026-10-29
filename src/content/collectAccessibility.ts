import type { A11yAriaFact, A11yHeadingFact, A11ySnapshot, A11yTarget } from '@/modules/accessibility/types';

const MAX_ITEMS = 120;
const IDREF_ATTRIBUTES = [
  'aria-labelledby',
  'aria-describedby',
  'aria-controls',
  'aria-owns',
  'aria-activedescendant',
  'aria-flowto',
  'aria-errormessage',
] as const;
const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function collectAccessibilitySnapshot(doc: Document): A11ySnapshot {
  const controls = collectControls(doc);
  const images = collectImages(doc);
  const headings = collectHeadings(doc);
  const aria = collectAria(doc);
  const buttons = collectButtons(doc);
  const anchors = collectAnchors(doc);

  return {
    pageUrl: doc.location.href,
    lang: doc.documentElement.lang.trim(),
    unlabeledControls: controls.unlabeled.items,
    placeholderOnlyControls: controls.placeholderOnly.items,
    orphanLabels: controls.orphans.items,
    controlTotal: controls.total,
    controlsTruncated: controls.unlabeled.truncated || controls.placeholderOnly.truncated || controls.orphans.truncated,
    imagesMissingAlt: images.missing.items,
    imagesWhitespaceAlt: images.whitespace.items,
    imageTotal: images.total,
    imagesTruncated: images.missing.truncated || images.whitespace.truncated,
    headings: headings.items,
    headingTotal: headings.total,
    headingsTruncated: headings.truncated,
    ariaNodes: aria.items,
    ariaTotal: aria.total,
    ariaTruncated: aria.truncated,
    duplicateIdCount: countDuplicateIds(doc),
    emptyButtons: buttons.items,
    buttonTotal: buttons.total,
    buttonsTruncated: buttons.truncated,
    emptyAnchors: anchors.items,
    anchorTotal: anchors.total,
    anchorsTruncated: anchors.truncated,
  };
}

function collectControls(doc: Document): {
  total: number;
  unlabeled: Capped<A11yTarget>;
  placeholderOnly: Capped<A11yTarget>;
  orphans: Capped<A11yTarget>;
} {
  const unlabeled: A11yTarget[] = [];
  const placeholderOnly: A11yTarget[] = [];
  let total = 0;

  for (const control of doc.querySelectorAll<HTMLElement>('input, select, textarea')) {
    if (!needsLabel(control) || isHidden(control)) {
      continue;
    }
    total += 1;
    const name = accessibleName(doc, control);
    if (name !== '') {
      continue;
    }
    const target = describe(control);
    const placeholder = control.getAttribute('placeholder')?.trim() ?? '';
    if (placeholder !== '') {
      placeholderOnly.push({ target, detail: placeholder });
    } else {
      unlabeled.push({ target, detail: control.getAttribute('name') ?? control.tagName.toLowerCase() });
    }
  }

  const orphans: A11yTarget[] = [];
  for (const label of doc.querySelectorAll('label')) {
    if (isHidden(label)) {
      continue;
    }
    const htmlFor = label.getAttribute('for')?.trim() ?? '';
    if (htmlFor !== '') {
      if (!doc.getElementById(htmlFor)) {
        orphans.push({ target: describe(label), detail: `for="${htmlFor}" does not match a control` });
      }
      continue;
    }
    if (!label.querySelector('input, select, textarea, button')) {
      orphans.push({ target: describe(label), detail: 'Label does not wrap a control' });
    }
  }

  return {
    total,
    unlabeled: cap(unlabeled),
    placeholderOnly: cap(placeholderOnly),
    orphans: cap(orphans),
  };
}

function collectImages(doc: Document): { total: number; missing: Capped<A11yTarget>; whitespace: Capped<A11yTarget> } {
  const missing: A11yTarget[] = [];
  const whitespace: A11yTarget[] = [];
  const seen = new Set<Element>();
  let total = 0;

  const candidates = [
    ...doc.querySelectorAll<HTMLElement>('img, area, input[type="image"], [role="img"]'),
  ];
  for (const element of candidates) {
    if (seen.has(element) || isHidden(element)) {
      continue;
    }
    seen.add(element);
    const role = element.getAttribute('role')?.trim().toLowerCase() ?? '';
    if (role === 'presentation' || role === 'none') {
      continue;
    }
    total += 1;
    if (hasTextAlternative(doc, element)) {
      const alt = element.getAttribute('alt');
      if (alt !== null && alt !== '' && alt.trim() === '') {
        whitespace.push({ target: describe(element), detail: 'alt is whitespace' });
      }
      continue;
    }
    missing.push({ target: describe(element), detail: element.tagName.toLowerCase() });
  }

  return { total, missing: cap(missing), whitespace: cap(whitespace) };
}

function collectHeadings(doc: Document): Capped<A11yHeadingFact> {
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((heading) => ({
    level: Number(heading.tagName.slice(1)),
    text: heading.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    hidden: isHidden(heading),
  }));
  return cap(headings);
}

function collectAria(doc: Document): Capped<A11yAriaFact> {
  const nodes = Array.from(
    doc.querySelectorAll<HTMLElement>(
      '[role], [aria-labelledby], [aria-describedby], [aria-controls], [aria-owns], [aria-activedescendant], [aria-errormessage], [aria-flowto], [aria-hidden], [aria-checked], [aria-expanded], [aria-pressed], [aria-selected], [aria-invalid], [aria-valuenow], [aria-level], [aria-haspopup], [aria-live]',
    ),
  ).map((element) => toAriaFact(doc, element));
  return cap(nodes);
}

function collectButtons(doc: Document): Capped<A11yTarget> & { total: number } {
  const empty: A11yTarget[] = [];
  const seen = new Set<Element>();
  let total = 0;

  for (const element of doc.querySelectorAll<HTMLElement>('button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]')) {
    if (seen.has(element) || isHidden(element)) {
      continue;
    }
    seen.add(element);
    if (element instanceof HTMLInputElement && element.type === 'image') {
      continue;
    }
    total += 1;
    if (accessibleName(doc, element) !== '') {
      continue;
    }
    empty.push({ target: describe(element), detail: element.tagName.toLowerCase() });
  }

  return { ...cap(empty), total };
}

function collectAnchors(doc: Document): Capped<A11yTarget> & { total: number } {
  const empty: A11yTarget[] = [];
  let total = 0;

  for (const anchor of doc.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (isHidden(anchor)) {
      continue;
    }
    total += 1;
    if (accessibleName(doc, anchor) !== '') {
      continue;
    }
    empty.push({ target: describe(anchor), detail: anchor.getAttribute('href')?.trim() || '#' });
  }

  return { ...cap(empty), total };
}

function toAriaFact(doc: Document, element: HTMLElement): A11yAriaFact {
  const attributes: Record<string, string> = {};
  for (const attribute of element.attributes) {
    if (attribute.name.startsWith('aria-')) {
      attributes[attribute.name] = attribute.value.trim().slice(0, 120);
    }
  }

  const missingIds: string[] = [];
  for (const name of IDREF_ATTRIBUTES) {
    const raw = attributes[name];
    if (!raw) {
      continue;
    }
    for (const id of raw.split(/\s+/)) {
      if (id !== '' && !doc.getElementById(id)) {
        missingIds.push(`${name}:${id}`);
      }
    }
  }

  return {
    target: describe(element),
    tag: element.tagName.toLowerCase(),
    type: element.getAttribute('type'),
    role: element.getAttribute('role')?.trim().toLowerCase().split(/\s+/)[0] || null,
    attributes,
    missingIds,
    hidesFocusable:
      attributes['aria-hidden'] === 'true' &&
      (element.matches(FOCUSABLE) || element.querySelector(FOCUSABLE) !== null),
  };
}

function needsLabel(control: HTMLElement): boolean {
  if (!(control instanceof HTMLInputElement)) {
    return true;
  }
  return !['hidden', 'button', 'submit', 'reset', 'image'].includes(control.type);
}

function hasTextAlternative(doc: Document, element: Element): boolean {
  if (element.hasAttribute('alt')) {
    return true;
  }
  return accessibleName(doc, element) !== '';
}

function accessibleName(doc: Document, element: Element): string {
  const labelledBy = element.getAttribute('aria-labelledby')?.trim() ?? '';
  if (labelledBy !== '') {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => doc.getElementById(id)?.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text !== '') {
      return text;
    }
  }

  const ariaLabel = element.getAttribute('aria-label')?.trim() ?? '';
  if (ariaLabel !== '') {
    return ariaLabel;
  }

  const id = element.getAttribute('id');
  if (id) {
    const labelText = doc.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (labelText !== '') {
      return labelText;
    }
  }

  const wrapping = element.closest('label')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  if (wrapping !== '' && (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) {
    return wrapping;
  }

  const title = element.getAttribute('title')?.trim() ?? '';
  if (title !== '') {
    return title;
  }

  if (element instanceof HTMLInputElement) {
    if ((element.type === 'submit' || element.type === 'reset') && element.value.trim() === '') {
      return element.type === 'submit' ? 'Submit' : 'Reset';
    }
    if (element.value.trim() !== '' && ['button', 'submit', 'reset'].includes(element.type)) {
      return element.value.trim();
    }
    if (element.type === 'image' && element.alt.trim() !== '') {
      return element.alt.trim();
    }
  }

  const alt = descendantAlt(element);
  if (alt !== '') {
    return alt;
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    return '';
  }

  return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function descendantAlt(element: Element): string {
  for (const image of element.querySelectorAll('img[alt], input[type="image"][alt]')) {
    const alt = image.getAttribute('alt')?.trim() ?? '';
    if (alt !== '') {
      return alt;
    }
  }
  return '';
}

function isHidden(element: Element): boolean {
  return element.closest('[hidden], [aria-hidden="true"]') !== null;
}

function describe(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const type = element.getAttribute('type');
  const name = element.getAttribute('name');
  const text = element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 60) ?? '';
  const bits = [`${tag}${id}`];
  if (type) {
    bits.push(`type=${type}`);
  }
  if (name) {
    bits.push(`name=${name}`);
  }
  if (text !== '') {
    bits.push(`"${text}"`);
  }
  return bits.join(' ').slice(0, 160);
}

function countDuplicateIds(doc: Document): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const element of doc.querySelectorAll<HTMLElement>('[id]')) {
    if (element.id === '') {
      continue;
    }
    if (seen.has(element.id)) {
      duplicates += 1;
    } else {
      seen.add(element.id);
    }
  }
  return duplicates;
}

interface Capped<T> {
  items: T[];
  total: number;
  truncated: boolean;
}

function cap<T>(items: T[]): Capped<T> {
  return {
    items: items.slice(0, MAX_ITEMS),
    total: items.length,
    truncated: items.length > MAX_ITEMS,
  };
}
