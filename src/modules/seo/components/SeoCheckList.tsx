import type { SeoCheck } from '../types';

export function SeoCheckList({ checks }: { checks: SeoCheck[] }) {
  return (
    <ol className="seo-checks">
      {checks.map((check) => (
        <li key={check.id} className={`seo-check seo-check--${check.severity}`}>
          <header className="seo-check__header">
            <h3>{check.label}</h3>
            <span className={`seo-check__badge seo-check__badge--${check.severity}`}>{check.severity}</span>
            <span className="seo-check__points">
              {check.score}/{check.maxScore}
            </span>
          </header>
          <p className="seo-check__value">{check.value}</p>
          <p className="seo-check__recommendation">{check.recommendation}</p>
        </li>
      ))}
    </ol>
  );
}
