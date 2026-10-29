import { describe, expect, it } from 'vitest';
import { renderHtmlReport } from './htmlReport';
import type { QaExportReport } from './types';

const report: QaExportReport = {
  websiteUrl: 'https://example.com/?q=<script>',
  scanTime: '2026-01-01T00:00:00.000Z',
  healthScore: 80,
  linkErrors: [{ href: 'https://example.com/a', text: '<b>', severity: 'error', reason: 'a&b' }],
  apiErrors: [],
  consoleErrors: [{ level: 'error', message: 'boom', source: null, timestamp: '2026-01-01T00:00:00.000Z' }],
  seoResults: [{ label: 'Title', severity: 'pass', value: 'Example', recommendation: '' }],
  performanceMetrics: [{ label: 'LCP', value: '1s', rating: 'good', score: 90 }],
};

describe('renderHtmlReport', () => {
  it('includes each section and escapes page content', () => {
    const html = renderHtmlReport(report);

    expect(html).toContain('Links');
    expect(html).toContain('API calls');
    expect(html).toContain('Console');
    expect(html).toContain('SEO');
    expect(html).toContain('Performance');
    expect(html).toContain('badge--error');
    expect(html).toContain('badge--success');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('a&amp;b');
    expect(html).toContain('class="empty">None</p>');
    expect(html).toContain('Overall');
    expect(html).toContain('<details class="section">');
    expect(html).not.toContain('<details class="section" open');
    expect(html.indexOf('badge--error')).toBeLessThan(html.indexOf('badge--success'));
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
  });
});
