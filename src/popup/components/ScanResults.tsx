import type { ApiSummary, LinkIssue, ScanReport } from '@/shared/types';

const MAX_ISSUES = 50;
const MAX_API_ROWS = 20;

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

interface StatProps {
  label: string;
  value: number;
  tone?: Tone;
}

function Stat({ label, value, tone = 'neutral' }: StatProps) {
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

function IssueList({ issues }: { issues: LinkIssue[] }) {
  const visible = issues.slice(0, MAX_ISSUES);

  return (
    <section>
      <h3 className="section-title">Link issues ({issues.length})</h3>
      <ul className="result-list">
        {visible.map((issue, index) => (
          <li key={`${index}-${issue.href}`} className="result-list__item">
            <span className={`badge badge--${issue.severity}`}>{issue.severity}</span>
            <div className="result-list__body">
              <span className="result-list__title">{issue.reason}</span>
              {issue.text && <span>{issue.text}</span>}
              <code>{issue.href}</code>
            </div>
          </li>
        ))}
      </ul>
      {issues.length > MAX_ISSUES && (
        <p className="scan-results__time">Showing first {MAX_ISSUES} issues.</p>
      )}
    </section>
  );
}

function ApiList({ api }: { api: ApiSummary }) {
  const visible = api.calls.slice(0, MAX_API_ROWS);

  return (
    <section>
      <h3 className="section-title">API calls</h3>
      <ul className="result-list">
        {visible.map((call, index) => (
          <li key={`${index}-${call.url}`} className="result-list__item">
            <span className={`badge ${call.slow ? 'badge--warning' : 'badge--ok'}`}>
              {call.durationMs} ms
            </span>
            <code className="result-list__body">{call.url}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ScanResults({ report }: { report: ScanReport }) {
  const { links, api } = report;
  const issueCount = links.issues.length;

  return (
    <div className="scan-results">
      <div>
        <p className="scan-results__meta" title={report.url}>
          {report.title || report.url}
        </p>
        <p className="scan-results__time">
          Scanned at {new Date(report.scannedAt).toLocaleTimeString()}
        </p>
      </div>

      <div className="stats-grid">
        <Stat label="Links" value={links.total} />
        <Stat label="Internal" value={links.internal} />
        <Stat label="External" value={links.external} />
        <Stat label="Issues" value={issueCount} tone={issueCount > 0 ? 'danger' : 'success'} />
        {api && <Stat label="API calls" value={api.total} />}
        {api && <Stat label="Slow API" value={api.slow} tone={api.slow > 0 ? 'warning' : 'success'} />}
      </div>

      {issueCount > 0 && <IssueList issues={links.issues} />}
      {api && api.total > 0 && <ApiList api={api} />}
    </div>
  );
}
