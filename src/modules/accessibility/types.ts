export type A11yCheckId = 'labels' | 'alt' | 'headings' | 'aria' | 'buttons' | 'anchors';

export type A11ySeverity = 'pass' | 'warning' | 'fail';

export interface A11yIssue {
  target: string;
  message: string;
  severity: Exclude<A11ySeverity, 'pass'>;
}

export interface A11yTarget {
  target: string;
  detail: string;
}

export interface A11yHeadingFact {
  level: number;
  text: string;
  hidden: boolean;
}

export interface A11yAriaFact {
  target: string;
  tag: string;
  type: string | null;
  role: string | null;
  attributes: Record<string, string>;
  missingIds: string[];
  hidesFocusable: boolean;
}

export interface A11ySnapshot {
  pageUrl: string;
  lang: string;
  unlabeledControls: A11yTarget[];
  placeholderOnlyControls: A11yTarget[];
  orphanLabels: A11yTarget[];
  controlTotal: number;
  controlsTruncated: boolean;
  imagesMissingAlt: A11yTarget[];
  imagesWhitespaceAlt: A11yTarget[];
  imageTotal: number;
  imagesTruncated: boolean;
  headings: A11yHeadingFact[];
  headingTotal: number;
  headingsTruncated: boolean;
  ariaNodes: A11yAriaFact[];
  ariaTotal: number;
  ariaTruncated: boolean;
  duplicateIdCount: number;
  emptyButtons: A11yTarget[];
  buttonTotal: number;
  buttonsTruncated: boolean;
  emptyAnchors: A11yTarget[];
  anchorTotal: number;
  anchorsTruncated: boolean;
}

export interface A11yCheck {
  id: A11yCheckId;
  label: string;
  severity: A11ySeverity;
  score: number;
  maxScore: number;
  value: string;
  recommendation: string;
  issues: A11yIssue[];
}

export interface A11yReport {
  pageUrl: string;
  score: number;
  checks: A11yCheck[];
  analyzedAt: string;
}

export interface A11yState {
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  report: A11yReport | null;
}

export interface CollectAccessibilityRequest {
  type: 'WEBPULSE_COLLECT_ACCESSIBILITY';
}

export type CollectAccessibilityResponse =
  | { ok: true; snapshot: A11ySnapshot }
  | { ok: false; error: string };
