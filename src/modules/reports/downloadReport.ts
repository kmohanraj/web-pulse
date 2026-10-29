import type { ExportFormat, QaExportReport } from './types';
import { exportFileName } from './buildExportReport';
import { renderHtmlReport } from './htmlReport';

export async function downloadReport(format: ExportFormat, report: QaExportReport): Promise<void> {
  if (format === 'json') {
    downloadBlob(exportFileName(report, 'json'), new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    return;
  }
  if (format === 'html') {
    downloadBlob(exportFileName(report, 'html'), new Blob([renderHtmlReport(report)], { type: 'text/html;charset=utf-8' }));
    return;
  }
  if (format === 'pdf') {
    await downloadPdf(report);
    return;
  }
  await downloadExcel(report);
}

async function downloadPdf(report: QaExportReport): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  let y = 48;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('WebPulse QA report', 40, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = writeLine(doc, y + 28, `Website URL: ${report.websiteUrl}`, width);
  y = writeLine(doc, y, `Scan time: ${report.scanTime}`, width);
  y = writeLine(doc, y, `Health score: ${report.healthScore === null ? 'n/a' : String(report.healthScore)}`, width);

  y = section({ doc, y: y + 8, title: 'Link errors', width, lines: report.linkErrors.map((item) => `${item.severity}: ${item.href} — ${item.reason}`) });
  y = section({ doc, y, title: 'API errors', width, lines: report.apiErrors.map((item) => `${item.method} ${item.status ?? 'failed'} ${item.url} — ${item.reason}`) });
  y = section({ doc, y, title: 'Console errors', width, lines: report.consoleErrors.map((item) => `${item.level}: ${item.message}`) });
  y = section({ doc, y, title: 'SEO results', width, lines: report.seoResults.map((item) => `${item.severity}: ${item.label} — ${item.value || item.recommendation}`) });
  section({ doc, y, title: 'Performance metrics', width, lines: report.performanceMetrics.map((item) => `${item.label}: ${item.value} (${item.rating})`) });

  doc.save(exportFileName(report, 'pdf'));
}

interface PdfDoc {
  internal: { pageSize: { getHeight(): number } };
  setFont(font: string, style: string): void;
  setFontSize(size: number): void;
  text(text: string, x: number, y: number): void;
  splitTextToSize(text: string, size: number): string[];
  addPage(): void;
  save(filename: string): void;
}

async function downloadExcel(report: QaExportReport): Promise<void> {
  const loaded: unknown = await import('xlsx');
  const XLSX = xlsxApi(loaded);
  const book = XLSX.utils.book_new();
  const add = (name: string, rows: readonly Record<string, string | number>[]): void => {
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows.length > 0 ? [...rows] : [{ note: 'None' }]), name);
  };

  add('Summary', [
    { field: 'Website URL', value: report.websiteUrl },
    { field: 'Scan time', value: report.scanTime },
    { field: 'Health score', value: report.healthScore ?? 'n/a' },
  ]);
  add('Link errors', report.linkErrors.map((item) => ({ href: item.href, text: item.text, severity: item.severity, reason: item.reason })));
  add('API errors', report.apiErrors.map((item) => ({ url: item.url, method: item.method, status: item.status ?? '', durationMs: item.durationMs, reason: item.reason })));
  add('Console errors', report.consoleErrors.map((item) => ({ level: item.level, message: item.message, source: item.source ?? '', timestamp: item.timestamp })));
  add('SEO results', report.seoResults.map((item) => ({ label: item.label, severity: item.severity, value: item.value, recommendation: item.recommendation })));
  add('Performance', report.performanceMetrics.map((item) => ({ label: item.label, value: item.value, rating: item.rating, score: item.score ?? '' })));

  XLSX.writeFile(book, exportFileName(report, 'xlsx'));
}

interface SectionInput {
  doc: PdfDoc;
  y: number;
  title: string;
  width: number;
  lines: string[];
}

interface XlsxApi {
  utils: {
    book_new(): object;
    json_to_sheet(rows: Record<string, string | number>[]): object;
    book_append_sheet(book: object, sheet: object, name: string): void;
  };
  writeFile(book: object, filename: string): void;
}

function xlsxApi(loaded: unknown): XlsxApi {
  if (isXlsxApi(loaded)) {
    return loaded;
  }
  const fallback = moduleDefault(loaded);
  if (isXlsxApi(fallback)) {
    return fallback;
  }
  throw new Error('Excel export is unavailable');
}

function moduleDefault(loaded: unknown): unknown {
  if (!isRecord(loaded) || !('default' in loaded)) {
    return undefined;
  }
  return loaded.default;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isXlsxApi(value: unknown): value is XlsxApi {
  return Boolean(value && typeof value === 'object' && 'utils' in value && 'writeFile' in value);
}

function section(input: SectionInput): number {
  const { doc, title, width, lines } = input;
  let cursor = ensureSpace(doc, input.y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, 40, cursor);
  cursor += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const rows = lines.length > 0 ? lines : ['None'];
  for (const row of rows) {
    cursor = writeLine(doc, cursor, row, width);
  }
  return cursor;
}

function writeLine(doc: PdfDoc, y: number, text: string, width: number): number {
  const wrapped = doc.splitTextToSize(text, width - 80) as string[];
  let cursor = y;
  for (const line of wrapped) {
    cursor = ensureSpace(doc, cursor);
    doc.text(line, 40, cursor);
    cursor += 14;
  }
  return cursor;
}

function ensureSpace(doc: PdfDoc, y: number): number {
  if (y < doc.internal.pageSize.getHeight() - 40) {
    return y;
  }
  doc.addPage();
  return 48;
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
