import type { SavedReport } from '@/store/slices/reportsSlice';
import { buildExportReport, type ExportLiveData } from './buildExportReport';
import { downloadReport } from './downloadReport';
import { readPageConsoleErrors } from './readPageConsoleErrors';
import type { ExportConsoleError, ExportFormat, QaExportReport } from './types';

export class ReportExportService {
  async collect(saved: SavedReport, live: ExportLiveData): Promise<QaExportReport> {
    const consoleErrors = await readConsoleErrors(saved.report.url);
    return buildExportReport(saved, live, consoleErrors);
  }

  async download(format: ExportFormat, report: QaExportReport): Promise<void> {
    await downloadReport(format, report);
  }
}

async function readConsoleErrors(pageUrl: string): Promise<ExportConsoleError[]> {
  try {
    const tab = await activeWebTab(pageUrl);
    if (!tab?.id) {
      return [];
    }
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: readPageConsoleErrors,
    });
    return Array.isArray(injection?.result) ? injection.result : [];
  } catch {
    return [];
  }
}

async function activeWebTab(pageUrl: string): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({});
  const match = tabs.find((tab) => tab.id !== undefined && samePage(pageUrl, tab.url ?? null));
  if (match) {
    return match;
  }
  const [current] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return current?.url && samePage(pageUrl, current.url) ? current : undefined;
}

function samePage(left: string, right: string | null): boolean {
  if (!right) {
    return false;
  }
  return left.split('#')[0] === right.split('#')[0];
}
