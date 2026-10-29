import type { ScanReport } from '@/shared/types';
import type { SavedReport } from '@/store/slices/reportsSlice';
import { HealthScoreEngine } from '@/modules/health/HealthScoreEngine';
import type { HealthCategoryObservation } from '@/modules/health/types';
import { HEALTH_CATEGORY_META } from '@/modules/health/utilities';
import type { LinkCheckResult } from '@/modules/links/types';
import type { NetworkRecord } from '@/modules/network/types';
import type { PerformanceReport } from '@/modules/performance/types';
import type { SeoReport } from '@/modules/seo/types';
import type { ExportApiError, ExportApiRow, ExportConsoleError, ExportLinkError, ExportLinkRow, ExportPerformanceMetric, ExportSeoResult, QaExportReport, ReportTone } from './types';

export interface ExportLiveData {
  links: { pageUrl: string | null; status: string; results: LinkCheckResult[] };
  network: { pageUrl: string | null; records: NetworkRecord[] };
  seo: SeoReport | null;
  performance: PerformanceReport | null;
}

export function buildExportReport(saved: SavedReport, live: ExportLiveData, consoleErrors: ExportConsoleError[]): QaExportReport {
  const scan = saved.report;
  const linkErrors = linkErrorsFor(scan, live);
  const apiErrors = apiErrorsFor(scan, live);
  const seoResults = seoResultsFor(scan, live);
  const performanceMetrics = performanceFor(scan, live);

  return {
    websiteUrl: scan.url,
    scanTime: scan.scannedAt,
    healthScore: healthScoreFor(scan, linkErrors, apiErrors, seoResults, performanceMetrics),
    linkErrors,
    apiErrors,
    linkRows: linkRowsFor(scan, live),
    apiRows: apiRowsFor(scan, live),
    linkChecked: linkChecked(scan, live),
    apiChecked: apiChecked(scan, live),
    consoleErrors,
    seoResults,
    performanceMetrics,
  };
}

export function exportFileName(report: QaExportReport, extension: string): string {
  const stamp = report.scanTime.slice(0, 19).replace(/[:T]/g, '-');
  return `webpulse-qa-${stamp}.${extension}`;
}

function linkErrorsFor(scan: ScanReport, live: ExportLiveData): ExportLinkError[] {
  if (samePage(scan.url, live.links.pageUrl) && live.links.status === 'succeeded') {
    return live.links.results
      .filter((result) => isLinkError(result))
      .map((result) => ({
        href: result.url || result.href,
        text: result.text,
        severity: 'error',
        reason: result.error ?? `HTTP ${result.trackedStatus ?? result.finalStatus ?? result.status ?? 'failed'}`,
      }));
  }

  return scan.links.issues
    .filter((issue) => issue.severity === 'error')
    .map((issue) => ({
      href: issue.href,
      text: issue.text,
      severity: issue.severity,
      reason: issue.reason,
    }));
}

function apiErrorsFor(scan: ScanReport, live: ExportLiveData): ExportApiError[] {
  if (samePage(scan.url, live.network.pageUrl) && live.network.records.length > 0) {
    return live.network.records.filter(isApiError).map((record) => ({
      url: record.url,
      method: record.method,
      status: record.status,
      durationMs: record.durationMs,
      reason: apiReason(record),
    }));
  }

  return (scan.api?.calls ?? [])
    .filter((call) => call.slow)
    .map((call) => ({
      url: call.url,
      method: 'GET',
      status: null,
      durationMs: call.durationMs,
      reason: call.durationMs > 3000 ? 'Very slow API call' : 'Slow API call',
    }));
}

function seoResultsFor(scan: ScanReport, live: ExportLiveData): ExportSeoResult[] {
  if (live.seo && samePage(scan.url, live.seo.pageUrl)) {
    return live.seo.checks.map((check) => ({
      label: check.label,
      severity: check.severity,
      value: check.value,
      recommendation: check.recommendation,
    }));
  }

  return (scan.audit?.seo.findings ?? []).map((finding) => ({
    label: finding.message,
    severity: finding.severity,
    value: finding.target ?? '',
    recommendation: finding.message,
  }));
}

function performanceFor(scan: ScanReport, live: ExportLiveData): ExportPerformanceMetric[] {
  if (live.performance && samePage(scan.url, live.performance.pageUrl)) {
    return live.performance.metrics.map((metric) => ({
      label: metric.label,
      value: metric.value === null ? 'n/a' : metric.unit === 'ms' ? `${metric.value} ms` : metric.value.toFixed(3),
      rating: metric.rating,
      score: metric.score,
    }));
  }

  return (scan.audit?.performance.findings ?? []).map((finding) => ({
    label: finding.message,
    value: finding.target ?? '',
    rating: finding.severity,
    score: null,
  }));
}

function healthScoreFor(
  scan: ScanReport,
  linkErrors: ExportLinkError[],
  apiErrors: ExportApiError[],
  seoResults: ExportSeoResult[],
  performanceMetrics: ExportPerformanceMetric[],
): number | null {
  const observations = HEALTH_CATEGORY_META.map((meta) => observe(meta.id, scan, linkErrors, apiErrors, seoResults, performanceMetrics));
  return new HealthScoreEngine(() => scan.scannedAt).calculate({ categories: observations }).score;
}

function observe(
  id: (typeof HEALTH_CATEGORY_META)[number]['id'],
  scan: ScanReport,
  linkErrors: ExportLinkError[],
  apiErrors: ExportApiError[],
  seoResults: ExportSeoResult[],
  performanceMetrics: ExportPerformanceMetric[],
): HealthCategoryObservation {
  if (id === 'links') {
    return counted(id, linkErrors.length, 0, Math.max(scan.links.total, linkErrors.length));
  }
  if (id === 'apis') {
    if (!scan.api && apiErrors.length === 0) {
      return missing(id);
    }
    const issues = apiErrors.filter((error) => error.status === null || (error.status ?? 0) >= 400 || error.durationMs > 3000).length;
    const warnings = apiErrors.length - issues;
    return counted(id, issues, warnings, scan.api?.total ?? apiErrors.length);
  }
  if (id === 'seo' && seoResults.some((result) => result.severity === 'pass' || result.severity === 'fail' || result.severity === 'warning')) {
    return fromLabeled(id, seoResults);
  }
  if (id === 'performance' && performanceMetrics.some((metric) => metric.score !== null)) {
    const poor = performanceMetrics.filter((metric) => metric.rating === 'poor').length;
    const warnings = performanceMetrics.filter((metric) => metric.rating === 'needs-improvement').length;
    const earned = performanceMetrics.reduce((sum, metric) => sum + (metric.score ?? 0), 0);
    const max = performanceMetrics.reduce((sum, metric) => sum + (metric.score === null ? 0 : 25), 0);
    return {
      id,
      available: true,
      score: max === 0 ? 100 : Math.round((earned / max) * 100),
      issues: poor,
      warnings,
      checked: performanceMetrics.length,
      source: 'module',
    };
  }

  const audit = scan.audit?.[id === 'images' || id === 'accessibility' || id === 'security' || id === 'seo' || id === 'performance' ? id : 'images'];
  if (!scan.audit || (id !== 'images' && id !== 'accessibility' && id !== 'security' && id !== 'seo' && id !== 'performance')) {
    return missing(id);
  }
  const findings = audit?.findings ?? [];
  return counted(
    id,
    findings.filter((finding) => finding.severity === 'error').length,
    findings.filter((finding) => finding.severity === 'warning').length,
    audit?.checked ?? findings.length,
  );
}

function fromLabeled(id: HealthCategoryObservation['id'], rows: readonly { severity: string }[]): HealthCategoryObservation {
  return counted(
    id,
    rows.filter((row) => row.severity === 'fail' || row.severity === 'error').length,
    rows.filter((row) => row.severity === 'warning' || row.severity === 'needs-improvement').length,
    rows.length,
  );
}

function counted(id: HealthCategoryObservation['id'], issues: number, warnings: number, checked: number): HealthCategoryObservation {
  return {
    id,
    available: true,
    score: Math.max(0, Math.min(100, 100 - issues * 12 - warnings * 4)),
    issues,
    warnings,
    checked,
    source: 'scan',
  };
}

function missing(id: HealthCategoryObservation['id']): HealthCategoryObservation {
  return { id, available: false, score: null, issues: 0, warnings: 0, checked: 0, source: 'none' };
}

function linkRowsFor(scan: ScanReport, live: ExportLiveData): ExportLinkRow[] {
  if (samePage(scan.url, live.links.pageUrl) && live.links.status === 'succeeded') {
    return live.links.results.map((result) => ({
      href: result.url || result.href,
      text: result.text,
      severity: linkTone(result),
      reason: result.error ?? linkReason(result),
      outcome: linkTone(result),
    }));
  }

  return scan.links.issues.map((issue) => ({
    href: issue.href,
    text: issue.text,
    severity: issue.severity,
    reason: issue.reason,
    outcome: issue.severity === 'warning' ? 'warning' : 'error',
  }));
}

function apiRowsFor(scan: ScanReport, live: ExportLiveData): ExportApiRow[] {
  if (samePage(scan.url, live.network.pageUrl) && live.network.records.length > 0) {
    return live.network.records.map((record) => ({
      url: record.url,
      method: record.method,
      status: record.status,
      durationMs: record.durationMs,
      reason: apiRowReason(record),
      outcome: apiTone(record),
    }));
  }

  return (scan.api?.calls ?? []).map((call) => ({
    url: call.url,
    method: 'GET',
    status: null,
    durationMs: call.durationMs,
    reason: call.slow ? (call.durationMs > 3000 ? 'Very slow API call' : 'Slow API call') : 'OK',
    outcome: call.slow ? 'warning' : 'success',
  }));
}

function linkChecked(scan: ScanReport, live: ExportLiveData): number {
  if (samePage(scan.url, live.links.pageUrl) && live.links.status === 'succeeded') {
    return live.links.results.length;
  }
  return scan.links.total;
}

function apiChecked(scan: ScanReport, live: ExportLiveData): number {
  if (samePage(scan.url, live.network.pageUrl) && live.network.records.length > 0) {
    return live.network.records.length;
  }
  return scan.api?.total ?? scan.api?.calls.length ?? 0;
}

function linkTone(result: LinkCheckResult): ReportTone {
  if (isLinkError(result)) {
    return 'error';
  }
  if (result.outcome === 'redirect' || result.outcome === 'other') {
    return 'warning';
  }
  return 'success';
}

function linkReason(result: LinkCheckResult): string {
  const status = result.trackedStatus ?? result.finalStatus ?? result.status;
  if (result.outcome === 'redirect') {
    return `Redirect ${status ?? ''}`.trim();
  }
  if (status === null) {
    return 'OK';
  }
  return `HTTP ${status}`;
}

function apiTone(record: NetworkRecord): ReportTone {
  if (record.status === null || record.status >= 400) {
    return 'error';
  }
  if (record.status >= 300 || record.durationMs > 3000) {
    return 'warning';
  }
  return 'success';
}

function apiRowReason(record: NetworkRecord): string {
  if (record.status === null) {
    return 'Request failed';
  }
  if (record.status >= 400) {
    return `HTTP ${record.status}`;
  }
  if (record.status >= 300) {
    return `Redirect ${record.status}`;
  }
  if (record.durationMs > 3000) {
    return 'Slow API call';
  }
  return 'OK';
}

function isLinkError(result: LinkCheckResult): boolean {
  const status = result.trackedStatus ?? result.finalStatus ?? result.status;
  return result.outcome === 'broken' || result.outcome === 'unreachable' || status === 403 || status === 404 || status === 500;
}

function isApiError(record: NetworkRecord): boolean {
  return record.status === null || record.status >= 400 || record.durationMs > 3000;
}

function apiReason(record: NetworkRecord): string {
  if (record.status === null) {
    return 'Request failed';
  }
  if (record.status >= 400) {
    return `HTTP ${record.status}`;
  }
  return 'Slow API call';
}

function samePage(left: string, right: string | null): boolean {
  if (!right) {
    return false;
  }
  try {
    const first = new URL(left);
    const second = new URL(right);
    return first.origin === second.origin && first.pathname === second.pathname && first.search === second.search;
  } catch {
    return left.split('#')[0] === right.split('#')[0];
  }
}
