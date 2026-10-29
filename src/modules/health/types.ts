export type HealthCategoryId =
  | 'links'
  | 'apis'
  | 'images'
  | 'seo'
  | 'accessibility'
  | 'security'
  | 'performance';

export type HealthStatus = 'not_started' | 'passed' | 'attention' | 'failed';

export type HealthSource = 'module' | 'scan' | 'none';

export interface HealthCategoryObservation {
  id: HealthCategoryId;
  available: boolean;
  score: number | null;
  issues: number;
  warnings: number;
  checked: number;
  source: HealthSource;
}

export interface HealthScoreInput {
  categories: HealthCategoryObservation[];
}

export interface HealthCategoryScore {
  id: HealthCategoryId;
  label: string;
  weight: number;
  score: number | null;
  weightedPoints: number;
  status: HealthStatus;
  issues: number;
  warnings: number;
  checked: number;
  source: HealthSource;
}

export interface HealthScoreResult {
  score: number | null;
  status: HealthStatus;
  categories: HealthCategoryScore[];
  totalIssues: number;
  totalWarnings: number;
  calculatedAt: string;
}

export interface HealthScoreState {
  status: 'idle' | 'ready';
  result: HealthScoreResult | null;
}
