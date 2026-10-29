import type { HealthCategoryId, HealthCategoryScore, HealthStatus } from './types';

export const ISSUE_PENALTY = 12;
export const WARNING_PENALTY = 4;

export const HEALTH_CATEGORY_META: readonly {
  id: HealthCategoryId;
  label: string;
  weight: number;
}[] = [
  { id: 'links', label: 'Links', weight: 15 },
  { id: 'apis', label: 'APIs', weight: 10 },
  { id: 'images', label: 'Images', weight: 10 },
  { id: 'seo', label: 'SEO', weight: 15 },
  { id: 'accessibility', label: 'Accessibility', weight: 15 },
  { id: 'security', label: 'Security', weight: 20 },
  { id: 'performance', label: 'Performance', weight: 15 },
];

const META_BY_ID = new Map(HEALTH_CATEGORY_META.map((meta) => [meta.id, meta]));

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreFromIssueCounts(issues: number, warnings: number): number {
  const safeIssues = Math.max(0, issues);
  const safeWarnings = Math.max(0, warnings);
  return clampScore(100 - safeIssues * ISSUE_PENALTY - safeWarnings * WARNING_PENALTY);
}

export function statusFromScore(score: number | null): HealthStatus {
  if (score === null) {
    return 'not_started';
  }
  if (score >= 80) {
    return 'passed';
  }
  if (score >= 50) {
    return 'attention';
  }
  return 'failed';
}

export function categoryMeta(id: HealthCategoryId): { label: string; weight: number } {
  return META_BY_ID.get(id) ?? { label: id, weight: 0 };
}

export function weightedHealthScore(categories: readonly Pick<HealthCategoryScore, 'score' | 'weight'>[]): number | null {
  const available = categories.filter((category) => category.score !== null && category.weight > 0);
  const totalWeight = available.reduce((sum, category) => sum + category.weight, 0);
  if (totalWeight === 0) {
    return null;
  }
  const points = available.reduce((sum, category) => sum + (category.score ?? 0) * category.weight, 0);
  return clampScore(points / totalWeight);
}

export function weightedPoints(score: number | null, weight: number, totalWeight: number): number {
  if (score === null || totalWeight <= 0) {
    return 0;
  }
  return Math.round((score * weight) / totalWeight);
}
