export type SecurityCheckId = 'https' | 'mixedContent' | 'csp' | 'hsts' | 'cookies' | 'xss' | 'iframes';

export type SecuritySeverity = 'pass' | 'warning' | 'fail';

export interface SecurityIssue {
  target: string;
  message: string;
  severity: Exclude<SecuritySeverity, 'pass'>;
}

export interface MixedContentFact {
  url: string;
  tag: string;
  active: boolean;
}

export interface IframeFact {
  target: string;
  src: string;
  sandbox: string | null;
}

export interface SecurityDomSnapshot {
  pageUrl: string;
  protocol: string;
  mixedContent: MixedContentFact[];
  mixedContentTotal: number;
  metaCsp: string | null;
  metaCspReportOnly: string | null;
  iframes: IframeFact[];
  iframeTotal: number;
  inlineHandlerCount: number;
  javascriptUrlCount: number;
}

export interface SecurityHeaderSnapshot {
  finalUrl: string;
  statusCode: number | null;
  csp: string | null;
  cspReportOnly: string | null;
  hsts: string | null;
  xFrameOptions: string | null;
  xContentTypeOptions: string | null;
  xXssProtection: string | null;
  setCookies: string[];
  error: string | null;
}

export interface SecurityCookieFact {
  name: string;
  domain: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none' | 'unspecified';
}

export interface SecurityCheck {
  id: SecurityCheckId;
  label: string;
  severity: SecuritySeverity;
  score: number;
  maxScore: number;
  value: string;
  recommendation: string;
  issues: SecurityIssue[];
}

export interface SecurityReport {
  pageUrl: string;
  score: number;
  checks: SecurityCheck[];
  analyzedAt: string;
}

export interface SecurityState {
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  report: SecurityReport | null;
}

export interface CollectSecurityRequest {
  type: 'WEBPULSE_COLLECT_SECURITY';
}

export type CollectSecurityResponse =
  | { ok: true; snapshot: SecurityDomSnapshot }
  | { ok: false; error: string };
