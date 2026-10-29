import { PerformanceReportPanel } from '@/modules/performance';

export function PerformancePage() {
  return (
    <div className="page">
      <section className="page__intro">
        <h2>Performance</h2>
        <p>Core Web Vitals and TTFB for the active page.</p>
      </section>
      <PerformanceReportPanel />
    </div>
  );
}
