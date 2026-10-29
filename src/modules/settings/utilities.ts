import type { ThemeMode } from '@/shared/types';
import type { QaExportReport } from '@/modules/reports/types';
import {
  DEFAULT_EXPORT_PREFERENCES,
  DEFAULT_SETTINGS,
  RETRY_MAX,
  RETRY_MIN,
  SCAN_DEPTH_MAX,
  SCAN_DEPTH_MIN,
  TIMEOUT_MAX_MS,
  TIMEOUT_MIN_MS,
  type ExportPreferences,
  type SettingsState,
  type ValidationPolicy,
} from './types';

const FORMATS = ['pdf', 'xlsx', 'json', 'html'] as const;

export function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function normalizeExportPreferences(value: unknown): ExportPreferences {
  const source = isRecord(value) ? value : {};
  const format = FORMATS.find((item) => item === source.defaultFormat) ?? DEFAULT_EXPORT_PREFERENCES.defaultFormat;
  return {
    defaultFormat: format,
    includeLinkErrors: booleanOr(source.includeLinkErrors, DEFAULT_EXPORT_PREFERENCES.includeLinkErrors),
    includeApiErrors: booleanOr(source.includeApiErrors, DEFAULT_EXPORT_PREFERENCES.includeApiErrors),
    includeConsoleErrors: booleanOr(source.includeConsoleErrors, DEFAULT_EXPORT_PREFERENCES.includeConsoleErrors),
    includeSeoResults: booleanOr(source.includeSeoResults, DEFAULT_EXPORT_PREFERENCES.includeSeoResults),
    includePerformanceMetrics: booleanOr(source.includePerformanceMetrics, DEFAULT_EXPORT_PREFERENCES.includePerformanceMetrics),
  };
}

export function normalizeSettings(value: unknown): SettingsState {
  const source = isRecord(value) ? value : {};
  const storedTheme = isTheme(source.theme) ? source.theme : DEFAULT_SETTINGS.theme;
  const darkMode = typeof source.darkMode === 'boolean' ? source.darkMode : storedTheme === 'dark';
  const theme: ThemeMode = darkMode ? 'dark' : storedTheme === 'dark' ? 'light' : storedTheme;

  return {
    theme,
    darkMode,
    includeApiMonitor: booleanOr(source.includeApiMonitor, DEFAULT_SETTINGS.includeApiMonitor),
    exportPreferences: normalizeExportPreferences(source.exportPreferences),
    validationTimeoutMs: clampInteger(source.validationTimeoutMs, TIMEOUT_MIN_MS, TIMEOUT_MAX_MS, DEFAULT_SETTINGS.validationTimeoutMs),
    retryCount: clampInteger(source.retryCount, RETRY_MIN, RETRY_MAX, DEFAULT_SETTINGS.retryCount),
    scanDepth: clampInteger(source.scanDepth, SCAN_DEPTH_MIN, SCAN_DEPTH_MAX, DEFAULT_SETTINGS.scanDepth),
  };
}

export function validationPolicyFrom(settings: SettingsState): ValidationPolicy {
  const normalized = normalizeSettings(settings);
  return {
    timeoutMs: normalized.validationTimeoutMs,
    retryCount: normalized.retryCount,
    scanDepth: normalized.scanDepth,
  };
}

export function applyExportPreferences(report: QaExportReport, preferences: ExportPreferences): QaExportReport {
  const selected = normalizeExportPreferences(preferences);
  return {
    ...report,
    linkErrors: selected.includeLinkErrors ? report.linkErrors : [],
    apiErrors: selected.includeApiErrors ? report.apiErrors : [],
    linkRows: selected.includeLinkErrors ? report.linkRows : [],
    apiRows: selected.includeApiErrors ? report.apiRows : [],
    linkChecked: selected.includeLinkErrors ? report.linkChecked : 0,
    apiChecked: selected.includeApiErrors ? report.apiChecked : 0,
    consoleErrors: selected.includeConsoleErrors ? report.consoleErrors : [],
    seoResults: selected.includeSeoResults ? report.seoResults : [],
    performanceMetrics: selected.includePerformanceMetrics ? report.performanceMetrics : [],
  };
}

export function scanDepthLabel(depth: number): string {
  if (depth <= 1) {
    return 'Current page only';
  }
  return `Current page plus ${depth - 1} same-origin hop${depth - 1 === 1 ? '' : 's'}`;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function isTheme(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
