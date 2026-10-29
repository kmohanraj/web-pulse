import type { ThemeMode } from '@/shared/types';
import type { ExportFormat } from '@/modules/reports/types';

export type { ExportFormat };

export interface ExportPreferences {
  defaultFormat: ExportFormat;
  includeLinkErrors: boolean;
  includeApiErrors: boolean;
  includeConsoleErrors: boolean;
  includeSeoResults: boolean;
  includePerformanceMetrics: boolean;
}

export interface SettingsState {
  theme: ThemeMode;
  darkMode: boolean;
  includeApiMonitor: boolean;
  exportPreferences: ExportPreferences;
  validationTimeoutMs: number;
  retryCount: number;
  scanDepth: number;
}

export interface ValidationPolicy {
  timeoutMs: number;
  retryCount: number;
  scanDepth: number;
}

export const TIMEOUT_MIN_MS = 2000;
export const TIMEOUT_MAX_MS = 30000;
export const TIMEOUT_DEFAULT_MS = 8000;
export const RETRY_MIN = 0;
export const RETRY_MAX = 5;
export const RETRY_DEFAULT = 1;
export const SCAN_DEPTH_MIN = 1;
export const SCAN_DEPTH_MAX = 5;
export const SCAN_DEPTH_DEFAULT = 1;

export const DEFAULT_EXPORT_PREFERENCES: ExportPreferences = {
  defaultFormat: 'pdf',
  includeLinkErrors: true,
  includeApiErrors: true,
  includeConsoleErrors: true,
  includeSeoResults: true,
  includePerformanceMetrics: true,
};

export const DEFAULT_SETTINGS: SettingsState = {
  theme: 'system',
  darkMode: false,
  includeApiMonitor: true,
  exportPreferences: DEFAULT_EXPORT_PREFERENCES,
  validationTimeoutMs: TIMEOUT_DEFAULT_MS,
  retryCount: RETRY_DEFAULT,
  scanDepth: SCAN_DEPTH_DEFAULT,
};
