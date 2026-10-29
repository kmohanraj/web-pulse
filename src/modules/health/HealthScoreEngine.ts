import type { HealthCategoryObservation, HealthCategoryScore, HealthScoreInput, HealthScoreResult } from './types';
import { categoryMeta, statusFromScore, weightedHealthScore, weightedPoints } from './utilities';

export class HealthScoreEngine {
  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  calculate(input: HealthScoreInput): HealthScoreResult {
    const drafted = input.categories.map((observation) => this.scoreCategory(observation));
    const score = weightedHealthScore(drafted);
    const totalWeight = drafted.reduce((sum, category) => sum + (category.score === null ? 0 : category.weight), 0);
    const categories = drafted.map((category) => ({
      ...category,
      weightedPoints: weightedPoints(category.score, category.weight, totalWeight),
    }));

    return {
      score,
      status: statusFromScore(score),
      categories,
      totalIssues: categories.reduce((sum, category) => sum + category.issues, 0),
      totalWarnings: categories.reduce((sum, category) => sum + category.warnings, 0),
      calculatedAt: this.now(),
    };
  }

  private scoreCategory(observation: HealthCategoryObservation): HealthCategoryScore {
    const meta = categoryMeta(observation.id);
    const score = observation.available ? clampObservation(observation.score) : null;
    return {
      id: observation.id,
      label: meta.label,
      weight: meta.weight,
      score,
      weightedPoints: 0,
      status: statusFromScore(score),
      issues: Math.max(0, observation.issues),
      warnings: Math.max(0, observation.warnings),
      checked: Math.max(0, observation.checked),
      source: observation.available ? observation.source : 'none',
    };
  }
}

function clampObservation(score: number | null): number | null {
  if (score === null || !Number.isFinite(score)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
