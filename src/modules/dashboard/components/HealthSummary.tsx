import { statusLabel } from '../snapshot';
import type { ValidationStatus } from '../types';

interface HealthSummaryProps {
  score: number | null;
  issues: number;
  warnings: number;
  status: ValidationStatus;
  error: string | null;
  title: string | null;
}

export function HealthSummary({ score, issues, warnings, status, error, title }: HealthSummaryProps) {
  const tone = status === 'passed' ? 'success' : status === 'attention' ? 'warning' : status === 'failed' ? 'danger' : 'neutral';
  const badgeTone = status === 'failed' ? 'error' : status === 'attention' ? 'warning' : status === 'passed' ? 'ok' : 'muted';

  return (
    <section className="health-summary card" aria-label="Validation summary">
      <div
        className={`health-score health-score--${tone}`}
        style={{ ['--score' as string]: score ?? 0 }}
        aria-label={score === null ? 'Health score not available' : `Health score ${score}`}
      >
        <span className="health-score__value">{score === null ? '—' : score}</span>
        <span className="health-score__label">Health</span>
      </div>
      <div className="health-summary__body">
        <div className="health-summary__heading">
          <h2>Overall health</h2>
          <span className={`badge badge--${badgeTone}`}>{statusLabel(status)}</span>
        </div>
        {title && <p className="health-summary__page">{title}</p>}
        <div className="health-metrics">
          <Metric label="Health score" value={score === null ? '—' : String(score)} />
          <Metric label="Total issues" value={String(issues)} tone={issues > 0 ? 'danger' : 'success'} />
          <Metric label="Total warnings" value={String(warnings)} tone={warnings > 0 ? 'warning' : 'success'} />
          <Metric label="Validation status" value={statusLabel(status)} />
        </div>
        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
