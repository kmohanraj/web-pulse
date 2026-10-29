import type { AuditFinding, IssueSeverity, ScanReport } from '@/shared/types';
import type { CategoryCardModel, DashboardCategoryId, DashboardSnapshot, ValidationStatus } from './types';

const ISSUE_PENALTY = 12;
const WARNING_PENALTY = 4;

const CATEGORY_META: ReadonlyArray<{
  id: DashboardCategoryId;
  label: string;
  description: string;
}> = [
  { id: 'links', label: 'Links', description: 'Href health and accessible names' },
  { id: 'apis', label: 'APIs', description: 'Fetch and XHR timings' },
  { id: 'images', label: 'Images', description: 'Sources, alt text, and dimensions' },
  { id: 'seo', label: 'SEO', description: 'Title, description, and headings' },
  { id: 'accessibility', label: 'Accessibility', description: 'Language, names, and labels' },
  { id: 'security', label: 'Security', description: 'Transport and mixed content' },
  { id: 'performance', label: 'Performance', description: 'Resource timing and page weight' },
];

export function emptyDashboardSnapshot(status: ValidationStatus = 'not_started'): DashboardSnapshot {
  return {
    url: null,
    title: null,
    scannedAt: null,
    status,
    healthScore: null,
    totalIssues: 0,
    totalWarnings: 0,
    error: null,
    categories: CATEGORY_META.map((meta) => emptyCard(meta)),
  };
}

export function buildDashboardSnapshot(report: ScanReport): DashboardSnapshot {
  const categories = CATEGORY_META.map((meta) => buildCard(meta, report));
  const totalIssues = categories.reduce((sum, card) => sum + card.issues, 0);
  const totalWarnings = categories.reduce((sum, card) => sum + card.warnings, 0);

  return {
    url: report.url,
    title: report.title,
    scannedAt: report.scannedAt,
    status: overallStatus(totalIssues, totalWarnings),
    healthScore: scoreFromCounts(totalIssues, totalWarnings),
    totalIssues,
    totalWarnings,
    error: null,
    categories,
  };
}

function emptyCard(meta: (typeof CATEGORY_META)[number]): CategoryCardModel {
  return {
    ...meta,
    checked: 0,
    issues: 0,
    warnings: 0,
    status: 'not_started',
    findings: [],
  };
}

function buildCard(meta: (typeof CATEGORY_META)[number], report: ScanReport): CategoryCardModel {
  if (meta.id === 'links') {
    return fromFindings(
      meta,
      report.links.total,
      report.links.issues.map((issue) => ({
        severity: issue.severity,
        message: issue.reason,
        target: issue.href,
      })),
    );
  }
  if (meta.id === 'apis') {
    if (!report.api) {
      return emptyCard(meta);
    }
    const findings = report.api.calls
      .filter((call) => call.slow)
      .map((call) => ({
        severity: (call.durationMs > 3000 ? 'error' : 'warning') as IssueSeverity,
        message: call.durationMs > 3000 ? 'Very slow API call' : 'Slow API call',
        target: call.url,
      }));
    return fromFindings(meta, report.api.total, findings);
  }

  const audit = report.audit?.[meta.id];
  if (!audit) {
    return emptyCard(meta);
  }
  return fromFindings(meta, audit.checked, audit.findings);
}

function fromFindings(
  meta: (typeof CATEGORY_META)[number],
  checked: number,
  findings: ReadonlyArray<{ severity: IssueSeverity; message: string; target?: string }>,
): CategoryCardModel {
  const issues = findings.filter((item) => item.severity === 'error').length;
  const warnings = findings.filter((item) => item.severity === 'warning').length;
  return {
    ...meta,
    checked,
    issues,
    warnings,
    status: categoryStatus(issues, warnings),
    findings: findings.map(toFinding),
  };
}

function toFinding(item: { severity: IssueSeverity; message: string; target?: string }): AuditFinding {
  return item.target ? { severity: item.severity, message: item.message, target: item.target } : item;
}

function categoryStatus(issues: number, warnings: number): ValidationStatus {
  if (issues > 0) {
    return 'failed';
  }
  if (warnings > 0) {
    return 'attention';
  }
  return 'passed';
}

function overallStatus(issues: number, warnings: number): ValidationStatus {
  if (issues > 0) {
    return 'failed';
  }
  if (warnings > 0) {
    return 'attention';
  }
  return 'passed';
}

function scoreFromCounts(issues: number, warnings: number): number {
  return Math.max(0, Math.min(100, 100 - issues * ISSUE_PENALTY - warnings * WARNING_PENALTY));
}

export function statusLabel(status: ValidationStatus): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'passed':
      return 'Passed';
    case 'attention':
      return 'Needs attention';
    case 'failed':
      return 'Failed';
    default:
      return 'Not started';
  }
}


