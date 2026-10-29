import type { ExportApiRow, ExportLinkRow, QaExportReport, ReportTone } from './types';

interface Cell {
  text: string;
  tone?: ReportTone;
  kind?: 'text' | 'badge' | 'code' | 'method';
}

interface TableModel {
  title: string;
  headers: string[];
  rows: TableRow[];
  checked: number;
}

interface TableRow {
  tone: ReportTone;
  cells: Cell[];
}

export function renderHtmlReport(report: QaExportReport): string {
  const score = report.healthScore === null ? 'n/a' : String(report.healthScore);
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(`WebPulse QA report — ${report.websiteUrl}`)}</title>`,
    `<style>${REPORT_CSS}</style>`,
    '</head>',
    '<body>',
    '<main>',
    '<header class="mast">',
    '<p class="eyebrow">WebPulse QA</p>',
    '<h1>Scan report</h1>',
    legend(),
    '</header>',
    renderReportBody(report, score, scoreToneFor(report.healthScore)),
    '</main>',
    '</body>',
    '</html>',
  ].join('\n');
}

function legend(): string {
  return [
    '<ul class="legend">',
    '<li><span class="badge badge--error">Error</span> Failed or broken</li>',
    '<li><span class="badge badge--warning">Warning</span> Needs attention</li>',
    '<li><span class="badge badge--success">Success</span> Passed</li>',
    '</ul>',
  ].join('');
}

function renderReportBody(report: QaExportReport, score: string, tone: ReportTone): string {
  const models = [linkTable(report), apiTable(report), consoleTable(report), seoTable(report), performanceTable(report)];
  const counted = models.map((model) => ({ model, counts: countRows(model.rows, model.checked) }));
  const overall = counted.reduce(addCounts, emptyCounts());
  const sections = [...counted]
    .sort((left, right) => compareCounts(left.counts, right.counts))
    .map((item) => renderSection(item.model, item.counts));
  return `${summary(report.websiteUrl, report.scanTime, score, tone, overall)}${sections.join('')}`;
}

function summary(websiteUrl: string, scanTime: string, score: string, tone: ReportTone, counts: RowCounts): string {
  return [
    '<section class="summary">',
    '<div class="summary__facts">',
    field('Website URL', websiteUrl),
    field('Scan time', scanTime),
    `<p><strong>Health score</strong> <span class="badge badge--${tone}">${escapeHtml(score)}</span></p>`,
    '</div>',
    '<div class="summary__overall">',
    '<h2>Overall</h2>',
    countPills(counts),
    '</div>',
    '</section>',
  ].join('');
}

function field(label: string, value: string): string {
  return `<p><strong>${escapeHtml(label)}</strong> <span>${escapeHtml(value)}</span></p>`;
}

function linkTable(report: QaExportReport): TableModel {
  const rows = linkRows(report);
  return {
    title: 'Links',
    headers: ['Status', 'URL', 'Text', 'Reason'],
    checked: report.linkChecked ?? rows.length,
    rows: rows.map((item) => ({
      tone: item.outcome,
      cells: [badge(item.outcome), code(item.href), text(item.text), text(item.reason)],
    })),
  };
}

function apiTable(report: QaExportReport): TableModel {
  const rows = apiRows(report);
  return {
    title: 'API calls',
    headers: ['Status', 'Method', 'HTTP', 'Duration', 'URL', 'Reason'],
    checked: report.apiChecked ?? rows.length,
    rows: rows.map((item) => ({
      tone: item.outcome,
      cells: [badge(item.outcome), method(item.method), statusBadge(item.status), text(`${item.durationMs} ms`), code(item.url), text(item.reason)],
    })),
  };
}

function consoleTable(report: QaExportReport): TableModel {
  const rows = report.consoleErrors.map((item) => ({
    tone: 'error' as const,
    cells: [badge('error'), text(item.message), text(item.source ?? ''), text(item.timestamp)],
  }));
  return { title: 'Console', headers: ['Status', 'Message', 'Source', 'Time'], checked: rows.length, rows };
}

function seoTable(report: QaExportReport): TableModel {
  const rows = report.seoResults.map((item) => {
    const tone = toneFromLabel(item.severity);
    return { tone, cells: [badge(tone), text(item.label), text(item.value), text(item.recommendation)] };
  });
  return { title: 'SEO', headers: ['Status', 'Check', 'Value', 'Recommendation'], checked: rows.length, rows };
}

function performanceTable(report: QaExportReport): TableModel {
  const rows = report.performanceMetrics.map((item) => {
    const tone = toneFromLabel(item.rating);
    return { tone, cells: [badge(tone), text(item.label), text(item.value), text(item.score === null ? '' : String(item.score))] };
  });
  return { title: 'Performance', headers: ['Status', 'Metric', 'Value', 'Score'], checked: rows.length, rows };
}

function linkRows(report: QaExportReport): ExportLinkRow[] {
  if (report.linkRows) {
    return report.linkRows;
  }
  return report.linkErrors.map((item) => ({ ...item, outcome: toneFromLabel(item.severity) }));
}

function apiRows(report: QaExportReport): ExportApiRow[] {
  if (report.apiRows) {
    return report.apiRows;
  }
  return report.apiErrors.map((item) => ({ ...item, outcome: apiFallbackTone(item.status, item.reason) }));
}

function renderSection(model: TableModel, counts: RowCounts): string {
  const heading = `<summary class="section__head"><h2>${escapeHtml(model.title)}</h2>${countPills(counts)}</summary>`;
  if (model.rows.length === 0) {
    return `<details class="section">${heading}<p class="empty">None</p></details>`;
  }
  const head = `<tr>${model.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>`;
  const body = sortByResult(model.rows)
    .map((row) => `<tr class="row row--${row.tone}">${row.cells.map(cellHtml).join('')}</tr>`)
    .join('');
  return `<details class="section">${heading}<div class="table-wrap"><table><thead>${head}</thead><tbody>${body}</tbody></table></div></details>`;
}

function sortByResult(rows: readonly TableRow[]): TableRow[] {
  return [...rows].sort((left, right) => toneRank(left.tone) - toneRank(right.tone));
}

function toneRank(tone: ReportTone): number {
  if (tone === 'error') {
    return 0;
  }
  if (tone === 'warning') {
    return 1;
  }
  if (tone === 'success') {
    return 2;
  }
  return 3;
}

function compareCounts(left: RowCounts, right: RowCounts): number {
  return right.error - left.error || right.warning - left.warning || right.checked - left.checked;
}

function addCounts(total: RowCounts, item: { counts: RowCounts }): RowCounts {
  return {
    checked: total.checked + item.counts.checked,
    error: total.error + item.counts.error,
    warning: total.warning + item.counts.warning,
    success: total.success + item.counts.success,
  };
}

function emptyCounts(): RowCounts {
  return { checked: 0, error: 0, warning: 0, success: 0 };
}

function countPills(counts: RowCounts): string {
  return [
    '<p class="counts">',
    `<span class="count">${counts.checked} checked</span>`,
    `<span class="count count--error">${counts.error} error</span>`,
    `<span class="count count--warning">${counts.warning} warning</span>`,
    `<span class="count count--success">${counts.success} success</span>`,
    '</p>',
  ].join('');
}

interface RowCounts {
  checked: number;
  error: number;
  warning: number;
  success: number;
}

function countRows(rows: readonly TableRow[], checked: number): RowCounts {
  const error = rows.filter((row) => row.tone === 'error').length;
  const warning = rows.filter((row) => row.tone === 'warning').length;
  const listedSuccess = rows.filter((row) => row.tone === 'success').length;
  return {
    checked,
    error,
    warning,
    success: listedSuccess + Math.max(0, checked - rows.length),
  };
}

function cellHtml(cell: Cell): string {
  const safe = escapeHtml(cell.text || '—');
  if (cell.kind === 'badge') {
    return `<td><span class="badge badge--${cell.tone ?? 'neutral'}">${safe}</span></td>`;
  }
  if (cell.kind === 'method') {
    return `<td><span class="method">${safe}</span></td>`;
  }
  if (cell.kind === 'code') {
    return `<td><code>${safe}</code></td>`;
  }
  return `<td>${safe}</td>`;
}

function badge(tone: ReportTone): Cell {
  return { text: toneLabel(tone), tone, kind: 'badge' };
}

function statusBadge(status: number | null): Cell {
  return { text: status === null ? 'failed' : String(status), tone: httpTone(status), kind: 'badge' };
}

function method(value: string): Cell {
  return { text: value || 'GET', kind: 'method' };
}

function code(value: string): Cell {
  return { text: value, kind: 'code' };
}

function text(value: string): Cell {
  return { text: value };
}

function toneLabel(tone: ReportTone): string {
  if (tone === 'success') {
    return 'Success';
  }
  if (tone === 'warning') {
    return 'Warning';
  }
  if (tone === 'error') {
    return 'Error';
  }
  return 'Info';
}

function toneFromLabel(value: string): ReportTone {
  const label = value.toLowerCase();
  if (label === 'pass' || label === 'ok' || label === 'good' || label === 'success') {
    return 'success';
  }
  if (label === 'warning' || label === 'needs-improvement' || label === 'redirect') {
    return 'warning';
  }
  if (label === 'error' || label === 'fail' || label === 'failed' || label === 'poor' || label === 'unhandled' || label === 'broken') {
    return 'error';
  }
  return 'neutral';
}

function apiFallbackTone(status: number | null, reason: string): ReportTone {
  if (status === null || status >= 400) {
    return 'error';
  }
  if (status >= 300 || /slow/i.test(reason)) {
    return 'warning';
  }
  return 'success';
}

function httpTone(status: number | null): ReportTone {
  if (status === null || status >= 400) {
    return 'error';
  }
  if (status >= 300) {
    return 'warning';
  }
  return 'success';
}

function scoreToneFor(score: number | null): ReportTone {
  if (score === null) {
    return 'neutral';
  }
  if (score >= 80) {
    return 'success';
  }
  if (score >= 50) {
    return 'warning';
  }
  return 'error';
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const REPORT_CSS = `
:root {
  --ink: #172033;
  --muted: #5c6b82;
  --line: #d7deea;
  --paper: #ffffff;
  --canvas: #f4f6fb;
  --error: #b42318;
  --error-bg: #fdeceb;
  --warning: #b54708;
  --warning-bg: #fff4e5;
  --success: #067647;
  --success-bg: #e8f7ef;
  --neutral: #475467;
  --neutral-bg: #eef2f6;
}
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.45 "Segoe UI", system-ui, sans-serif; color: var(--ink); background: var(--canvas); }
main { max-width: 1100px; margin: 0 auto; padding: 28px 20px 56px; }
.mast h1 { margin: 0 0 12px; font-size: 28px; }
.eyebrow { margin: 0 0 4px; color: var(--muted); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
.legend { display: flex; flex-wrap: wrap; gap: 14px 18px; margin: 0; padding: 0; list-style: none; color: var(--muted); }
.legend li { display: flex; align-items: center; gap: 8px; }
.summary, .section { background: var(--paper); border: 1px solid var(--line); border-radius: 12px; }
.summary { display: grid; gap: 14px; margin: 18px 0 0; padding: 16px; }
.summary__facts { display: grid; gap: 4px; }
.summary p { margin: 0; }
.summary span { word-break: break-all; }
.summary__overall { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 16px; align-items: center; padding-top: 12px; border-top: 1px solid var(--line); }
.summary__overall h2 { margin: 0; font-size: 18px; }
.section { margin-top: 16px; }
.section { overflow: hidden; }
.section__head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 16px; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--line); cursor: pointer; list-style: none; }
.section__head::-webkit-details-marker { display: none; }
.section__head::before { content: "▸"; color: var(--muted); font-size: 14px; }
details[open] > .section__head::before { content: "▾"; }
.section h2 { margin: 0; font-size: 18px; }
.counts { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; }
.count { border-radius: 999px; padding: 3px 8px; background: var(--neutral-bg); color: var(--neutral); font-size: 12px; font-weight: 650; }
.count--error { background: var(--error-bg); color: var(--error); }
.count--warning { background: var(--warning-bg); color: var(--warning); }
.count--success { background: var(--success-bg); color: var(--success); }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 720px; }
th, td { padding: 10px 12px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
th { background: #f8fafc; color: var(--muted); font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
tr:last-child td { border-bottom: 0; }
.row--error td:first-child { box-shadow: inset 3px 0 0 var(--error); }
.row--warning td:first-child { box-shadow: inset 3px 0 0 var(--warning); }
.row--success td:first-child { box-shadow: inset 3px 0 0 var(--success); }
.row--error { background: #fffafa; }
.row--warning { background: #fffaf3; }
.row--success { background: #f7fdf9; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; }
.badge, .method { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.badge--error { background: var(--error-bg); color: var(--error); }
.badge--warning { background: var(--warning-bg); color: var(--warning); }
.badge--success { background: var(--success-bg); color: var(--success); }
.badge--neutral { background: var(--neutral-bg); color: var(--neutral); }
.method { background: #e8eefc; color: #243b80; }
.empty { margin: 0; padding: 16px; color: var(--muted); }
@media print {
  body { background: #fff; }
  details, details > * { display: block; }
  .badge, .count, .row--error, .row--warning, .row--success { print-color-adjust: exact; }
}
`.trim();
