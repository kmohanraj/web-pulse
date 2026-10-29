import type { A11yState } from '@/modules/accessibility/types';
import type { DashboardState } from '@/modules/dashboard/types';
import type { ImagesState, ImageStatus } from '@/modules/images/types';
import type { LinkCheckResult, LinksState } from '@/modules/links/types';
import type { NetworkRecord, NetworkState } from '@/modules/network/types';
import type { PerformanceState } from '@/modules/performance/types';
import type { SecurityState } from '@/modules/security/types';
import type { SeoState } from '@/modules/seo/types';
import type { HealthCategoryId, HealthCategoryObservation, HealthScoreInput, HealthSource } from './types';
import { HEALTH_CATEGORY_META, scoreFromIssueCounts } from './utilities';

export interface HealthScoreSources {
  links: Pick<LinksState, 'status' | 'results'>;
  images: Pick<ImagesState, 'status' | 'results'>;
  network: Pick<NetworkState, 'status' | 'records'>;
  seo: Pick<SeoState, 'report'>;
  accessibility: Pick<A11yState, 'report'>;
  security: Pick<SecurityState, 'report'>;
  performance: Pick<PerformanceState, 'report'>;
  dashboard: Pick<DashboardState, 'snapshot'>;
}

export function collectHealthInput(sources: HealthScoreSources): HealthScoreInput {
  return {
    categories: HEALTH_CATEGORY_META.map((meta) => observe(meta.id, sources)),
  };
}

function observe(id: HealthCategoryId, sources: HealthScoreSources): HealthCategoryObservation {
  const moduleObservation = fromModule(id, sources);
  if (moduleObservation) {
    return moduleObservation;
  }
  return fromScan(id, sources) ?? unavailable(id);
}

function fromModule(id: HealthCategoryId, sources: HealthScoreSources): HealthCategoryObservation | null {
  if (id === 'links' && sources.links.status === 'succeeded') {
    return fromPenalties(id, sources.links.results.map(linkPenalty), 'module');
  }
  if (id === 'images' && sources.images.status === 'succeeded') {
    return fromPenalties(
      id,
      sources.images.results.map((result) => imagePenalty(result.status)),
      'module',
    );
  }
  if (id === 'apis' && (sources.network.records.length > 0 || sources.network.status === 'watching')) {
    if (sources.network.records.length === 0) {
      return null;
    }
    return fromPenalties(id, sources.network.records.map(apiPenalty), 'module');
  }
  if (id === 'seo' && sources.seo.report) {
    return fromChecks(id, sources.seo.report.score, sources.seo.report.checks);
  }
  if (id === 'accessibility' && sources.accessibility.report) {
    return fromChecks(id, sources.accessibility.report.score, sources.accessibility.report.checks);
  }
  if (id === 'security' && sources.security.report) {
    return fromChecks(id, sources.security.report.score, sources.security.report.checks);
  }
  if (id === 'performance' && sources.performance.report) {
    const metrics = sources.performance.report.metrics;
    return observation(id, sources.performance.report.score, countRating(metrics, 'poor'), countRating(metrics, 'needs-improvement'), metrics.length, 'module');
  }
  return null;
}

function fromScan(id: HealthCategoryId, sources: HealthScoreSources): HealthCategoryObservation | null {
  const card = sources.dashboard.snapshot.categories.find((category) => category.id === id);
  if (!card || card.status === 'not_started' || card.status === 'running') {
    return null;
  }
  return observation(id, scoreFromIssueCounts(card.issues, card.warnings), card.issues, card.warnings, card.checked, 'scan');
}

function fromChecks(
  id: HealthCategoryId,
  score: number,
  checks: readonly { severity: 'pass' | 'warning' | 'fail' }[],
): HealthCategoryObservation {
  return observation(
    id,
    score,
    checks.filter((check) => check.severity === 'fail').length,
    checks.filter((check) => check.severity === 'warning').length,
    checks.length,
    'module',
  );
}

function fromPenalties(
  id: HealthCategoryId,
  penalties: readonly ('issue' | 'warning' | 'ok')[],
  source: HealthSource,
): HealthCategoryObservation {
  const issues = penalties.filter((penalty) => penalty === 'issue').length;
  const warnings = penalties.filter((penalty) => penalty === 'warning').length;
  return observation(id, scoreFromIssueCounts(issues, warnings), issues, warnings, penalties.length, source);
}

function observation(
  id: HealthCategoryId,
  score: number,
  issues: number,
  warnings: number,
  checked: number,
  source: HealthSource,
): HealthCategoryObservation {
  return { id, available: true, score, issues, warnings, checked, source };
}

function unavailable(id: HealthCategoryId): HealthCategoryObservation {
  return { id, available: false, score: null, issues: 0, warnings: 0, checked: 0, source: 'none' };
}

function linkPenalty(result: LinkCheckResult): 'issue' | 'warning' | 'ok' {
  const status = result.trackedStatus ?? result.finalStatus ?? result.status;
  if (result.outcome === 'broken' || result.outcome === 'unreachable' || status === 403 || status === 404 || status === 500) {
    return 'issue';
  }
  if (result.outcome === 'redirect' || result.outcome === 'other' || status === 301 || status === 302) {
    return 'warning';
  }
  return 'ok';
}

function imagePenalty(status: ImageStatus): 'issue' | 'warning' | 'ok' {
  if (status === 'broken' || status === 'forbidden' || status === 'not_found' || status === 'empty_src') {
    return 'issue';
  }
  if (status === 'missing_alt') {
    return 'warning';
  }
  return 'ok';
}

function apiPenalty(record: NetworkRecord): 'issue' | 'warning' | 'ok' {
  if (record.status === null || record.status >= 500 || record.durationMs > 3000) {
    return 'issue';
  }
  if (record.status >= 400 || record.durationMs > 1000) {
    return 'warning';
  }
  return 'ok';
}

function countRating(
  metrics: readonly { rating: 'good' | 'needs-improvement' | 'poor' | 'unavailable' }[],
  rating: 'poor' | 'needs-improvement',
): number {
  return metrics.filter((metric) => metric.rating === rating).length;
}
