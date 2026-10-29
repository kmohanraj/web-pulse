export type ShellPage = 'dashboard' | 'network' | 'images' | 'seo' | 'accessibility' | 'security' | 'performance' | 'settings' | 'reports';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;

export type IssueSeverity = 'error' | 'warning';

export interface LinkIssue {
  href: string;
  text: string;
  severity: IssueSeverity;
  reason: string;
}

export interface LinkSummary {
  total: number;
  internal: number;
  external: number;
  issues: LinkIssue[];
}

export interface ApiCallRecord {
  url: string;
  durationMs: number;
  transferSize: number;
  slow: boolean;
}

export interface ApiSummary {
  total: number;
  slow: number;
  calls: ApiCallRecord[];
}

export interface AuditFinding {
  severity: IssueSeverity;
  message: string;
  target?: string;
}

export interface CategoryAudit {
  checked: number;
  findings: AuditFinding[];
}

export interface PageAudit {
  images: CategoryAudit;
  seo: CategoryAudit;
  accessibility: CategoryAudit;
  security: CategoryAudit;
  performance: CategoryAudit;
}

export interface ScanReport {
  url: string;
  title: string;
  scannedAt: string;
  links: LinkSummary;
  api: ApiSummary | null;
  audit?: PageAudit;
}

export interface ScanRequest {
  type: 'WEBPULSE_RUN_SCAN';
  includeApiMonitor: boolean;
}

export type ScanResponse = { ok: true; report: ScanReport } | { ok: false; error: string };
