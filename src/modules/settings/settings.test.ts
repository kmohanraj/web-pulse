import { describe, expect, it } from 'vitest';
import type { QaExportReport } from '@/modules/reports/types';
import { setDarkMode, setTheme, settingsReducer } from './settingsSlice';
import { DEFAULT_SETTINGS } from './types';
import { applyExportPreferences, normalizeSettings, validationPolicyFrom } from './utilities';

const report: QaExportReport = {
  websiteUrl: 'https://example.com',
  scanTime: '2026-01-01T00:00:00.000Z',
  healthScore: 80,
  linkErrors: [{ href: '/a', text: 'A', severity: 'error', reason: '404' }],
  apiErrors: [{ url: '/api', method: 'GET', status: 500, durationMs: 10, reason: 'failed' }],
  consoleErrors: [{ level: 'error', message: 'boom', source: null, timestamp: '2026-01-01T00:00:00.000Z' }],
  seoResults: [{ label: 'Title', severity: 'pass', value: 'Example', recommendation: '' }],
  performanceMetrics: [{ label: 'LCP', value: '1s', rating: 'good', score: 90 }],
};

describe('settings', () => {
  it('fills missing persisted fields and clamps ranges', () => {
    const settings = normalizeSettings({ theme: 'dark', validationTimeoutMs: 99, retryCount: 9, scanDepth: 0 });
    expect(settings.darkMode).toBe(true);
    expect(settings.theme).toBe('dark');
    expect(settings.validationTimeoutMs).toBe(2000);
    expect(settings.retryCount).toBe(5);
    expect(settings.scanDepth).toBe(1);
    expect(settings.exportPreferences.defaultFormat).toBe('pdf');
  });

  it('keeps dark mode and theme in sync', () => {
    const dark = settingsReducer(DEFAULT_SETTINGS, setDarkMode(true));
    expect(dark.darkMode).toBe(true);
    expect(dark.theme).toBe('dark');
    const light = settingsReducer(dark, setTheme('system'));
    expect(light.darkMode).toBe(false);
    expect(light.theme).toBe('system');
  });

  it('builds a validation policy and filters export sections', () => {
    const policy = validationPolicyFrom({ ...DEFAULT_SETTINGS, validationTimeoutMs: 12000, retryCount: 2, scanDepth: 3 });
    expect(policy).toEqual({ timeoutMs: 12000, retryCount: 2, scanDepth: 3 });
    const filtered = applyExportPreferences(report, {
      ...DEFAULT_SETTINGS.exportPreferences,
      includeLinkErrors: false,
      includeConsoleErrors: false,
    });
    expect(filtered.linkErrors).toEqual([]);
    expect(filtered.consoleErrors).toEqual([]);
    expect(filtered.apiErrors).toHaveLength(1);
    expect(filtered.healthScore).toBe(80);
  });
});
