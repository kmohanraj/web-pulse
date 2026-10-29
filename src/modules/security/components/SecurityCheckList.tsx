import type { SecurityCheck } from '../types';

export function SecurityCheckList({ checks }: { checks: SecurityCheck[] }) {
  return (
    <ol className="security-checks">
      {checks.map((check) => (
        <li key={check.id} className={`security-check security-check--${check.severity}`}>
          <header className="security-check__header">
            <h3>{check.label}</h3>
            <span className={`security-check__badge security-check__badge--${check.severity}`}>{check.severity}</span>
            <span className="security-check__points">
              {check.score}/{check.maxScore}
            </span>
          </header>
          <p className="security-check__value">{check.value}</p>
          <p className="security-check__recommendation">{check.recommendation}</p>
          {check.issues.length > 0 && (
            <ul className="security-issues">
              {check.issues.map((item) => (
                <li key={`${item.target}:${item.message}`}>
                  <span className={`security-issues__severity security-issues__severity--${item.severity}`}>{item.severity}</span>
                  <span className="security-issues__target">{item.target}</span>
                  <span className="security-issues__message">{item.message}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
