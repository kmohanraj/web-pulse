import type { CategoryCardModel, DashboardCategoryId, ValidationStatus } from '@/modules/dashboard/types';
import type { ShellPage } from '@/shared/types';
import type { RootState } from '@/store/rootReducer';

const CATEGORY_PAGES: Record<DashboardCategoryId, ShellPage> = {
  links: 'dashboard',
  apis: 'network',
  images: 'images',
  seo: 'seo',
  accessibility: 'accessibility',
  security: 'security',
  performance: 'performance',
};

export function pageForCategory(id: DashboardCategoryId): ShellPage {
  return CATEGORY_PAGES[id];
}

export function selectConnectedCards(state: RootState): CategoryCardModel[] {
  return state.dashboard.snapshot.categories.map((card) => connectCard(card, state));
}

export interface ModuleConnection {
  id: DashboardCategoryId | 'scan';
  label: string;
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  error: string | null;
}

export function selectModuleConnections(state: RootState): ModuleConnection[] {
  return [
    { id: 'scan', label: 'Page scan', status: normalize(state.scan.status), error: state.scan.error },
    { id: 'links', label: 'Links', status: normalize(state.links.status), error: state.links.error },
    { id: 'apis', label: 'APIs', status: normalize(state.network.status), error: state.network.error },
    { id: 'images', label: 'Images', status: normalize(state.images.status), error: state.images.error },
    { id: 'seo', label: 'SEO', status: normalize(state.seo.status), error: state.seo.error },
    { id: 'accessibility', label: 'Accessibility', status: normalize(state.accessibility.status), error: state.accessibility.error },
    { id: 'security', label: 'Security', status: normalize(state.security.status), error: state.security.error },
    { id: 'performance', label: 'Performance', status: normalize(state.performance.status), error: state.performance.error },
  ];
}

function connectCard(card: CategoryCardModel, state: RootState): CategoryCardModel {
  const live = liveCard(card.id, state);
  if (!live) {
    return card;
  }
  return {
    ...card,
    status: live.status,
    checked: live.checked,
    issues: live.issues,
    warnings: live.warnings,
    description: live.error ?? card.description,
  };
}

function liveCard(
  id: DashboardCategoryId,
  state: RootState,
): { status: ValidationStatus; checked: number; issues: number; warnings: number; error: string | null } | null {
  if (id === 'links') {
    return fromJob(state.links.status, state.links.error, state.links.results.length, countLinks(state));
  }
  if (id === 'apis') {
    return fromJob(state.network.status, state.network.error, state.network.records.length, countApis(state));
  }
  if (id === 'images') {
    return fromJob(state.images.status, state.images.error, state.images.results.length, countImages(state));
  }
  if (id === 'seo' && state.seo.report) {
    return fromChecks(state.seo.status, state.seo.error, state.seo.report.checks, state.seo.report.score);
  }
  if (id === 'accessibility' && state.accessibility.report) {
    return fromChecks(state.accessibility.status, state.accessibility.error, state.accessibility.report.checks, state.accessibility.report.score);
  }
  if (id === 'security' && state.security.report) {
    return fromChecks(state.security.status, state.security.error, state.security.report.checks, state.security.report.score);
  }
  if (id === 'performance' && state.performance.report) {
    const metrics = state.performance.report.metrics;
    return fromJob(state.performance.status, state.performance.error, metrics.length, {
      issues: metrics.filter((metric) => metric.rating === 'poor').length,
      warnings: metrics.filter((metric) => metric.rating === 'needs-improvement').length,
      status: statusFromScore(state.performance.report.score),
    });
  }
  return runningOnly(id, state);
}

function runningOnly(id: DashboardCategoryId, state: RootState): { status: ValidationStatus; checked: number; issues: number; warnings: number; error: string | null } | null {
  const job = id === 'seo' ? state.seo : id === 'accessibility' ? state.accessibility : id === 'security' ? state.security : id === 'performance' ? state.performance : null;
  if (!job || (job.status !== 'running' && job.status !== 'failed')) {
    return null;
  }
  return { status: job.status === 'running' ? 'running' : 'failed', checked: 0, issues: 0, warnings: 0, error: job.error };
}

function fromJob(
  status: string,
  error: string | null,
  checked: number,
  counts: { issues: number; warnings: number; status: ValidationStatus } | null,
): { status: ValidationStatus; checked: number; issues: number; warnings: number; error: string | null } | null {
  if (status === 'idle') {
    return null;
  }
  if (status === 'running' || status === 'loading') {
    return { status: 'running', checked, issues: 0, warnings: 0, error: null };
  }
  if (status === 'failed') {
    return { status: 'failed', checked, issues: counts?.issues ?? 0, warnings: counts?.warnings ?? 0, error };
  }
  if (!counts) {
    return { status: 'passed', checked, issues: 0, warnings: 0, error: null };
  }
  return { status: counts.status, checked, issues: counts.issues, warnings: counts.warnings, error: null };
}

function fromChecks(
  status: string,
  error: string | null,
  checks: ReadonlyArray<{ severity: string }>,
  score: number,
): { status: ValidationStatus; checked: number; issues: number; warnings: number; error: string | null } | null {
  return fromJob(status, error, checks.length, {
    issues: checks.filter((check) => check.severity === 'fail').length,
    warnings: checks.filter((check) => check.severity === 'warning').length,
    status: statusFromScore(score),
  });
}

function countLinks(state: RootState): { issues: number; warnings: number; status: ValidationStatus } {
  const issues = state.links.results.filter((result) => result.outcome === 'broken' || result.outcome === 'unreachable').length;
  const warnings = state.links.results.filter((result) => result.outcome === 'redirect' || result.outcome === 'other').length;
  return { issues, warnings, status: issues > 0 ? 'failed' : warnings > 0 ? 'attention' : 'passed' };
}

function countApis(state: RootState): { issues: number; warnings: number; status: ValidationStatus } {
  const issues = state.network.records.filter((record) => record.status === null || record.status >= 500 || record.durationMs > 3000).length;
  const warnings = state.network.records.filter((record) => record.status !== null && record.status >= 400 && record.status < 500).length;
  return { issues, warnings, status: issues > 0 ? 'failed' : warnings > 0 ? 'attention' : 'passed' };
}

function countImages(state: RootState): { issues: number; warnings: number; status: ValidationStatus } {
  const issues = state.images.results.filter((result) => result.status === 'broken' || result.status === 'forbidden' || result.status === 'not_found' || result.status === 'empty_src').length;
  const warnings = state.images.results.filter((result) => result.issues.includes('missing_alt') && result.status !== 'broken' && result.status !== 'forbidden' && result.status !== 'not_found' && result.status !== 'empty_src').length;
  return { issues, warnings, status: issues > 0 ? 'failed' : warnings > 0 ? 'attention' : 'passed' };
}

function statusFromScore(score: number): ValidationStatus {
  if (score >= 80) {
    return 'passed';
  }
  if (score >= 50) {
    return 'attention';
  }
  return 'failed';
}

function normalize(status: string): ModuleConnection['status'] {
  if (status === 'running' || status === 'loading') {
    return 'running';
  }
  if (status === 'failed') {
    return 'failed';
  }
  if (status === 'succeeded' || status === 'watching') {
    return 'succeeded';
  }
  return 'idle';
}
