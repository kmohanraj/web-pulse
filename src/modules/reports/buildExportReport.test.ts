import { describe, expect, it } from 'vitest';
import type { ScanReport } from '@/shared/types';
import { buildExportReport, exportFileName } from './buildExportReport';
import type { ExportLiveData } from './buildExportReport';

describe('buildExportReport', () => {
  it('includes the required report sections and a 0-100 health score', () => {
    const report = buildExportReport(saved(), emptyLive(), [
      { level: 'error', message: 'boom', source: 'app.js', timestamp: '2026-01-01T00:00:00.000Z' },
    ]);

    expect(report.websiteUrl).toBe('https://example.com/docs');
    expect(report.scanTime).toBe('2026-01-01T00:00:00.000Z');
    expect(report.healthScore).toBeGreaterThanOrEqual(0);
    expect(report.healthScore).toBeLessThanOrEqual(100);
    expect(report.linkErrors).toEqual([
      { href: 'https://example.com/missing', text: 'Missing', severity: 'error', reason: 'Broken link' },
    ]);
    expect(report.linkRows?.map((item) => item.outcome)).toEqual(['error', 'warning']);
    expect(report.apiErrors[0]?.reason).toBe('Very slow API call');
    expect(report.consoleErrors).toHaveLength(1);
    expect(report.seoResults[0]?.label).toBe('Missing title');
    expect(report.performanceMetrics[0]?.label).toBe('Large image');
    expect(exportFileName(report, 'json')).toBe('webpulse-qa-2026-01-01-00-00-00.json');
  });

  it('prefers live module results for the same page', () => {
    const live = emptyLive();
    live.seo = {
      pageUrl: 'https://example.com/docs',
      score: 40,
      analyzedAt: '2026-01-01T00:00:00.000Z',
      checks: [{ id: 'title', label: 'Title', severity: 'fail', score: 0, maxScore: 20, value: '', recommendation: 'Add a title' }],
    };
    live.performance = {
      pageUrl: 'https://example.com/docs',
      score: 70,
      analyzedAt: '2026-01-01T00:00:00.000Z',
      metrics: [
        {
          id: 'lcp',
          label: 'LCP',
          value: 2600,
          unit: 'ms',
          rating: 'needs-improvement',
          score: 20,
          maxScore: 25,
          good: 2500,
          poor: 4000,
          recommendation: 'Speed up LCP',
        },
      ],
    };

    const report = buildExportReport(saved(), live, []);
    expect(report.seoResults[0]).toMatchObject({ label: 'Title', severity: 'fail' });
    expect(report.performanceMetrics[0]).toMatchObject({ label: 'LCP', value: '2600 ms' });
  });
});

function saved() {
  return { id: 'report-1', report: scan() };
}

function scan(): ScanReport {
  return {
    url: 'https://example.com/docs',
    title: 'Docs',
    scannedAt: '2026-01-01T00:00:00.000Z',
    links: {
      total: 2,
      internal: 1,
      external: 1,
      issues: [
        { href: 'https://example.com/missing', text: 'Missing', severity: 'error', reason: 'Broken link' },
        { href: 'https://example.com/redirect', text: 'Redirect', severity: 'warning', reason: 'Redirect' },
      ],
    },
    api: {
      total: 1,
      slow: 1,
      calls: [{ url: 'https://example.com/api', durationMs: 4200, transferSize: 100, slow: true }],
    },
    audit: {
      images: { checked: 1, findings: [] },
      seo: { checked: 1, findings: [{ severity: 'error', message: 'Missing title', target: 'head' }] },
      accessibility: { checked: 1, findings: [] },
      security: { checked: 1, findings: [] },
      performance: { checked: 1, findings: [{ severity: 'warning', message: 'Large image', target: 'hero.png' }] },
    },
  };
}

function emptyLive(): ExportLiveData {
  return {
    links: { pageUrl: null, status: 'idle', results: [] },
    network: { pageUrl: null, records: [] },
    seo: null,
    performance: null,
  };
}
