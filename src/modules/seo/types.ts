export type SeoCheckId = 'title' | 'description' | 'canonical' | 'h1' | 'openGraph' | 'twitter' | 'robots';

export type SeoSeverity = 'pass' | 'warning' | 'fail';

export interface SeoSnapshot {
  pageUrl: string;
  title: string;
  description: string | null;
  canonicals: string[];
  h1s: string[];
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  robots: string | null;
}

export interface SeoCheck {
  id: SeoCheckId;
  label: string;
  severity: SeoSeverity;
  score: number;
  maxScore: number;
  value: string;
  recommendation: string;
}

export interface SeoReport {
  pageUrl: string;
  score: number;
  checks: SeoCheck[];
  analyzedAt: string;
}

export interface SeoState {
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  report: SeoReport | null;
}

export interface CollectSeoRequest {
  type: 'WEBPULSE_COLLECT_SEO';
}

export type CollectSeoResponse =
  | { ok: true; snapshot: SeoSnapshot }
  | { ok: false; error: string };
