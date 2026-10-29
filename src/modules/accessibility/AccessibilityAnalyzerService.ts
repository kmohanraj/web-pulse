import type { A11yAriaFact, A11yCheck, A11yCheckId, A11yIssue, A11yReport, A11ySeverity, A11ySnapshot, A11yTarget } from './types';

const LABELS_MAX = 20;
const ALT_MAX = 15;
const HEADINGS_MAX = 15;
const ARIA_MAX = 20;
const BUTTONS_MAX = 15;
const ANCHORS_MAX = 15;
const FAIL_PENALTY = 5;
const WARNING_PENALTY = 2;

const VALID_ROLES = new Set([
  'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell', 'checkbox',
  'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition', 'dialog', 'directory',
  'document', 'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading', 'img', 'link',
  'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
  'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar',
  'search', 'searchbox', 'separator', 'slider', 'spinbutton', 'status', 'switch', 'tab', 'table',
  'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem',
]);

const REQUIRED_BY_ROLE: Record<string, readonly string[]> = {
  checkbox: ['aria-checked'],
  menuitemcheckbox: ['aria-checked'],
  radio: ['aria-checked'],
  menuitemradio: ['aria-checked'],
  switch: ['aria-checked'],
  slider: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  scrollbar: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-controls'],
  spinbutton: ['aria-valuenow'],
  combobox: ['aria-expanded', 'aria-controls'],
  heading: ['aria-level'],
  option: ['aria-selected'],
  meter: ['aria-valuenow'],
};

const BOOLEAN_ARIA = new Set([
  'aria-hidden', 'aria-expanded', 'aria-selected', 'aria-disabled', 'aria-required', 'aria-modal',
  'aria-busy', 'aria-atomic', 'aria-multiselectable', 'aria-readonly',
]);
const TRISTATE_ARIA = new Set(['aria-checked', 'aria-pressed']);

export class AccessibilityAnalyzerService {
  analyze(snapshot: A11ySnapshot): A11yReport {
    const checks = [
      checkLabels(snapshot),
      checkAlt(snapshot),
      checkHeadings(snapshot),
      checkAria(snapshot),
      checkButtons(snapshot),
      checkAnchors(snapshot),
    ];

    return {
      pageUrl: snapshot.pageUrl,
      score: checks.reduce((total, check) => total + check.score, 0),
      checks,
      analyzedAt: new Date().toISOString(),
    };
  }
}

function checkLabels(snapshot: A11ySnapshot): A11yCheck {
  const issues: A11yIssue[] = [
    ...snapshot.unlabeledControls.map((item) => issue('fail', item.target, 'Form control has no accessible label.')),
    ...snapshot.placeholderOnlyControls.map((item) => issue('fail', item.target, 'Placeholder text is not a label. Add a label element or aria-label.')),
    ...snapshot.orphanLabels.map((item) => issue('warning', item.target, item.detail)),
  ];
  if (snapshot.controlsTruncated) {
    issues.push(issue('warning', 'document', 'Label scan was capped. Some controls were not listed.'));
  }
  const problemCount = snapshot.unlabeledControls.length + snapshot.placeholderOnlyControls.length;
  return scored(
    'labels',
    'Missing labels',
    LABELS_MAX,
    issues,
    snapshot.controlTotal === 0 ? 'No labelable controls' : `${problemCount} unlabeled of ${snapshot.controlTotal}`,
    issues.length === 0
      ? 'Form controls have accessible names.'
      : 'Associate each control with a visible label, or provide aria-label / aria-labelledby.',
  );
}

function checkAlt(snapshot: A11ySnapshot): A11yCheck {
  const issues: A11yIssue[] = [
    ...snapshot.imagesMissingAlt.map((item) => issue('fail', item.target, 'Image is missing a text alternative.')),
    ...snapshot.imagesWhitespaceAlt.map((item) => issue('warning', item.target, 'alt is only whitespace. Use a description or an empty alt for decorative images.')),
  ];
  if (snapshot.imagesTruncated) {
    issues.push(issue('warning', 'document', 'Image scan was capped. Some images were not listed.'));
  }
  return scored(
    'alt',
    'Missing alt text',
    ALT_MAX,
    issues,
    snapshot.imageTotal === 0 ? 'No images' : `${snapshot.imagesMissingAlt.length} missing alt of ${snapshot.imageTotal}`,
    issues.length === 0
      ? 'Images expose a text alternative or are marked decorative.'
      : 'Add alt text. Use alt="" only when the image is decorative.',
  );
}

function checkHeadings(snapshot: A11ySnapshot): A11yCheck {
  const visible = snapshot.headings.filter((heading) => !heading.hidden);
  const issues: A11yIssue[] = [];
  const h1Count = visible.filter((heading) => heading.level === 1).length;

  if (visible.length === 0) {
    issues.push(issue('fail', 'document', 'Page has no headings.'));
  } else if (h1Count === 0) {
    issues.push(issue('fail', 'document', 'Page has no h1.'));
  } else if (h1Count > 1) {
    issues.push(issue('warning', 'document', `Page has ${h1Count} h1 elements. Keep a single h1.`));
  }

  const first = visible[0];
  if (first && first.level !== 1 && h1Count > 0) {
    issues.push(issue('warning', `h${first.level}`, 'The first heading is not an h1.'));
  }

  let previous = 0;
  for (const heading of visible) {
    if (heading.text === '') {
      issues.push(issue('fail', `h${heading.level}`, 'Heading is empty.'));
    }
    if (previous > 0 && heading.level > previous + 1) {
      issues.push(issue('fail', `h${heading.level}`, `Heading level skipped from h${previous} to h${heading.level}.`));
    }
    previous = heading.level;
  }

  if (snapshot.headingsTruncated) {
    issues.push(issue('warning', 'document', 'Heading scan was capped. Later levels were not checked.'));
  }

  return scored(
    'headings',
    'Heading hierarchy',
    HEADINGS_MAX,
    issues,
    visible.length === 0 ? 'No headings' : visible.map((heading) => `h${heading.level}`).slice(0, 12).join(' → '),
    issues.length === 0
      ? 'Headings follow a single h1 and do not skip levels.'
      : 'Use one h1, then increase heading levels by one step at a time.',
  );
}

function checkAria(snapshot: A11ySnapshot): A11yCheck {
  const issues: A11yIssue[] = [];
  if (snapshot.lang === '') {
    issues.push(issue('fail', 'html', 'html element is missing a lang attribute.'));
  }
  if (snapshot.duplicateIdCount > 0) {
    issues.push(issue('fail', 'document', `${snapshot.duplicateIdCount} duplicate id values can break ARIA references.`));
  }

  for (const node of snapshot.ariaNodes) {
    issues.push(...ariaIssues(node));
  }
  if (snapshot.ariaTruncated) {
    issues.push(issue('warning', 'document', 'ARIA scan was capped at 120 elements.'));
  }

  return scored(
    'aria',
    'ARIA issues',
    ARIA_MAX,
    issues,
    snapshot.ariaTotal === 0 ? 'No ARIA attributes' : `${issues.length} issues in ${snapshot.ariaTotal} ARIA nodes`,
    issues.length === 0
      ? 'Roles, states, and references look valid.'
      : 'Use valid roles, required states, and id references that exist in the page.',
  );
}

function checkButtons(snapshot: A11ySnapshot): A11yCheck {
  const issues = namedIssues(snapshot.emptyButtons, 'fail', 'Button has no accessible name.');
  if (snapshot.buttonsTruncated) {
    issues.push(issue('warning', 'document', 'Button scan was capped. Some buttons were not listed.'));
  }
  return scored(
    'buttons',
    'Empty buttons',
    BUTTONS_MAX,
    issues,
    snapshot.buttonTotal === 0 ? 'No buttons' : `${snapshot.emptyButtons.length} empty of ${snapshot.buttonTotal}`,
    issues.length === 0 ? 'Buttons have an accessible name.' : 'Add text, aria-label, or aria-labelledby to every button.',
  );
}

function checkAnchors(snapshot: A11ySnapshot): A11yCheck {
  const issues = namedIssues(snapshot.emptyAnchors, 'fail', 'Link has no accessible name.');
  if (snapshot.anchorsTruncated) {
    issues.push(issue('warning', 'document', 'Anchor scan was capped. Some links were not listed.'));
  }
  return scored(
    'anchors',
    'Empty anchors',
    ANCHORS_MAX,
    issues,
    snapshot.anchorTotal === 0 ? 'No anchors' : `${snapshot.emptyAnchors.length} empty of ${snapshot.anchorTotal}`,
    issues.length === 0 ? 'Links have an accessible name.' : 'Add link text, aria-label, or an image alt inside the anchor.',
  );
}

function ariaIssues(node: A11yAriaFact): A11yIssue[] {
  const found: A11yIssue[] = [];
  if (node.role && !VALID_ROLES.has(node.role)) {
    found.push(issue('fail', node.target, `Invalid ARIA role "${node.role}".`));
  }

  const native = nativeRole(node.tag, node.type);
  if (node.role && node.role !== native) {
    for (const required of REQUIRED_BY_ROLE[node.role] ?? []) {
      if (!node.attributes[required]?.trim()) {
        found.push(issue('fail', node.target, `Missing ${required} for role="${node.role}".`));
      }
    }
  }

  for (const [name, value] of Object.entries(node.attributes)) {
    const invalid = invalidAriaValue(name, value);
    if (invalid) {
      found.push(issue('fail', node.target, invalid));
    }
  }

  const min = Number(node.attributes['aria-valuemin']);
  const max = Number(node.attributes['aria-valuemax']);
  if (node.attributes['aria-valuemin'] && node.attributes['aria-valuemax'] && min > max) {
    found.push(issue('fail', node.target, 'aria-valuemin is greater than aria-valuemax.'));
  }

  for (const ref of node.missingIds) {
    found.push(issue('fail', node.target, `ARIA reference not found: ${ref}.`));
  }
  if (node.hidesFocusable) {
    found.push(issue('fail', node.target, 'aria-hidden="true" hides a focusable element.'));
  }
  return found;
}

function invalidAriaValue(name: string, value: string): string | null {
  const token = value.toLowerCase();
  if (BOOLEAN_ARIA.has(name) && token !== 'true' && token !== 'false') {
    return `${name} must be true or false.`;
  }
  if (TRISTATE_ARIA.has(name) && token !== 'true' && token !== 'false' && token !== 'mixed') {
    return `${name} must be true, false, or mixed.`;
  }
  if (name === 'aria-invalid' && !['true', 'false', 'grammar', 'spelling'].includes(token)) {
    return 'aria-invalid must be true, false, grammar, or spelling.';
  }
  if (name === 'aria-current' && !['page', 'step', 'location', 'date', 'time', 'true', 'false'].includes(token)) {
    return 'aria-current has an unsupported value.';
  }
  if (name === 'aria-live' && !['off', 'polite', 'assertive'].includes(token)) {
    return 'aria-live must be off, polite, or assertive.';
  }
  if (name === 'aria-autocomplete' && !['inline', 'list', 'both', 'none'].includes(token)) {
    return 'aria-autocomplete must be inline, list, both, or none.';
  }
  if (name === 'aria-haspopup' && !['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog'].includes(token)) {
    return 'aria-haspopup has an unsupported value.';
  }
  if (name === 'aria-orientation' && !['horizontal', 'vertical'].includes(token)) {
    return 'aria-orientation must be horizontal or vertical.';
  }
  if (name === 'aria-level') {
    const level = Number(value);
    if (!Number.isInteger(level) || level < 1) {
      return 'aria-level must be an integer of 1 or greater.';
    }
  }
  return null;
}

function nativeRole(tag: string, type: string | null): string | null {
  if (tag === 'button') {
    return 'button';
  }
  if (tag === 'a') {
    return 'link';
  }
  if (tag === 'select') {
    return 'combobox';
  }
  if (tag === 'textarea') {
    return 'textbox';
  }
  if (tag === 'img') {
    return 'img';
  }
  if (/^h[1-6]$/.test(tag)) {
    return 'heading';
  }
  if (tag === 'input') {
    if (type === 'checkbox') {
      return 'checkbox';
    }
    if (type === 'radio') {
      return 'radio';
    }
    if (type === 'range') {
      return 'slider';
    }
    if (type === 'number') {
      return 'spinbutton';
    }
    if (type === 'search') {
      return 'searchbox';
    }
    return 'textbox';
  }
  return null;
}

function namedIssues(items: A11yTarget[], severity: Exclude<A11ySeverity, 'pass'>, message: string): A11yIssue[] {
  return items.map((item) => issue(severity, item.target, message));
}

function scored(
  id: A11yCheckId,
  label: string,
  maxScore: number,
  issues: A11yIssue[],
  value: string,
  recommendation: string,
): A11yCheck {
  const fails = issues.filter((item) => item.severity === 'fail').length;
  const warnings = issues.length - fails;
  const penalty = Math.min(maxScore, fails * FAIL_PENALTY + warnings * WARNING_PENALTY);
  const severity: A11ySeverity = fails > 0 ? 'fail' : warnings > 0 ? 'warning' : 'pass';
  return {
    id,
    label,
    severity,
    score: maxScore - penalty,
    maxScore,
    value,
    recommendation,
    issues: issues.slice(0, 12),
  };
}

function issue(severity: Exclude<A11ySeverity, 'pass'>, target: string, message: string): A11yIssue {
  return { severity, target, message };
}
