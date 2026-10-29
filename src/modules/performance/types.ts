export type PerformanceMetricId = 'ttfb' | 'fcp' | 'lcp' | 'cls' | 'inp';

export type PerformanceRating = 'good' | 'needs-improvement' | 'poor' | 'unavailable';

export interface PerformanceSnapshot {
  pageUrl: string;
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
}

export interface PerformanceMetric {
  id: PerformanceMetricId;
  label: string;
  value: number | null;
  unit: 'ms' | 'score';
  rating: PerformanceRating;
  score: number;
  maxScore: number;
  good: number;
  poor: number;
  recommendation: string;
}

export interface PerformanceReport {
  pageUrl: string;
  score: number;
  metrics: PerformanceMetric[];
  analyzedAt: string;
}

export interface PerformanceState {
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  report: PerformanceReport | null;
}
