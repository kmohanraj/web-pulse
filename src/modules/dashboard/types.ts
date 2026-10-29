import type { AuditFinding } from '@/shared/types';

export type DashboardCategoryId =
  | 'links'
  | 'apis'
  | 'images'
  | 'seo'
  | 'accessibility'
  | 'security'
  | 'performance';

export type ValidationStatus = 'not_started' | 'running' | 'passed' | 'attention' | 'failed';

export interface CategoryCardModel {
  id: DashboardCategoryId;
  label: string;
  description: string;
  checked: number;
  issues: number;
  warnings: number;
  status: ValidationStatus;
  findings: AuditFinding[];
}

export interface DashboardSnapshot {
  url: string | null;
  title: string | null;
  scannedAt: string | null;
  status: ValidationStatus;
  healthScore: number | null;
  totalIssues: number;
  totalWarnings: number;
  error: string | null;
  categories: CategoryCardModel[];
}

export interface DashboardState {
  snapshot: DashboardSnapshot;
  selectedCategoryId: DashboardCategoryId | null;
}
