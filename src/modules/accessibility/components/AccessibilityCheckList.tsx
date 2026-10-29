import type { A11yCheck } from '../types';

export function AccessibilityCheckList({ checks }: { checks: A11yCheck[] }) {
  return (
    <ol className="a11y-checks">
      {checks.map((check) => (
        <li key={check.id} className={`a11y-check a11y-check--${check.severity}`}>
          <header className="a11y-check__header">
            <h3>{check.label}</h3>
            <span className={`a11y-check__badge a11y-check__badge--${check.severity}`}>{check.severity}</span>
            <span className="a11y-check__points">
              {check.score}/{check.maxScore}
            </span>
          </header>
          <p className="a11y-check__value">{check.value}</p>
          <p className="a11y-check__recommendation">{check.recommendation}</p>
          {check.issues.length > 0 && (
            <ul className="a11y-issues">
              {check.issues.map((item) => (
                <li key={`${item.target}:${item.message}`}>
                  <span className={`a11y-issues__severity a11y-issues__severity--${item.severity}`}>{item.severity}</span>
                  <span className="a11y-issues__target">{item.target}</span>
                  <span className="a11y-issues__message">{item.message}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
