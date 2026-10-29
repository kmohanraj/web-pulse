export type ExportFormat = 'pdf' | 'xlsx' | 'json' | 'html';

export type ReportTone = 'success' | 'warning' | 'error' | 'neutral';

export interface ExportLinkError {
  href: string;
  text: string;
  severity: string;
  reason: string;
}

export interface ExportApiError {
  url: string;
  method: string;
  status: number | null;
  durationMs: number;
  reason: string;
}

export interface ExportLinkRow extends ExportLinkError {
  outcome: ReportTone;
}

export interface ExportApiRow extends ExportApiError {
  outcome: ReportTone;
}

export interface ExportConsoleError {
  level: 'error' | 'unhandled';
  message: string;
  source: string | null;
  timestamp: string;
}

export interface ExportSeoResult {
  label: string;
  severity: string;
  value: string;
  recommendation: string;
}

export interface ExportPerformanceMetric {
  label: string;
  value: string;
  rating: string;
  score: number | null;
}

export interface QaExportReport {
  websiteUrl: string;
  scanTime: string;
  healthScore: number | null;
  linkErrors: ExportLinkError[];
  apiErrors: ExportApiError[];
  linkRows?: ExportLinkRow[];
  apiRows?: ExportApiRow[];
  linkChecked?: number;
  apiChecked?: number;
  consoleErrors: ExportConsoleError[];
  seoResults: ExportSeoResult[];
  performanceMetrics: ExportPerformanceMetric[];
}
