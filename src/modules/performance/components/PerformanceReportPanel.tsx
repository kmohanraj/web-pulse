import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { analyzePagePerformance, clearPerformanceReport } from '../performanceSlice';
import { selectPerformanceMetrics, selectPerformanceReport, selectPerformanceState } from '../selectors';
import type { PerformanceMetric } from '../types';
import { PerformanceMetricChart, PerformanceScoreChart } from './PerformanceCharts';

export function PerformanceReportPanel() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector(selectPerformanceState);
  const report = useAppSelector(selectPerformanceReport);
  const metrics = useAppSelector(selectPerformanceMetrics);
  const isRunning = status === 'running';

  return (
    <section className="card performance-report" aria-labelledby="performance-report-title">
      <header className="card__header">
        <h2 id="performance-report-title">Performance report</h2>
      </header>
      <p className="performance-report__hint">
        Reads TTFB, FCP, LCP, CLS, and INP from the page Performance APIs. Interact with the page before analyzing so INP can be recorded.
      </p>
      <div className="performance-report__actions">
        <button type="button" className="btn btn--primary" disabled={isRunning} onClick={() => void dispatch(analyzePagePerformance())}>
          {isRunning ? 'Analyzing...' : 'Analyze performance'}
        </button>
        <button type="button" className="btn" disabled={report === null || isRunning} onClick={() => dispatch(clearPerformanceReport())}>
          Clear
        </button>
      </div>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      {report && (
        <>
          <div className="performance-charts">
            <PerformanceScoreChart score={report.score} />
            <PerformanceMetricChart metrics={metrics} />
          </div>
          <p className="performance-report__page">{report.pageUrl}</p>
          <ol className="performance-metrics">
            {metrics.map((metric) => (
              <li key={metric.id} className={`performance-metric performance-metric--${metric.rating}`}>
                <header>
                  <h3>{metric.label}</h3>
                  <span>{metric.rating.replace('-', ' ')}</span>
                  <strong>{formatValue(metric)}</strong>
                </header>
                <p>
                  {metric.score}/{metric.maxScore} · good ≤ {formatThreshold(metric.good, metric.unit)} · poor ≥ {formatThreshold(metric.poor, metric.unit)}
                </p>
                <p>{metric.recommendation}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function formatValue(metric: PerformanceMetric): string {
  if (metric.value === null) {
    return 'n/a';
  }
  return metric.unit === 'ms' ? `${metric.value} ms` : metric.value.toFixed(3);
}

function formatThreshold(value: number, unit: PerformanceMetric['unit']): string {
  return unit === 'ms' ? `${value} ms` : value.toFixed(2);
}
