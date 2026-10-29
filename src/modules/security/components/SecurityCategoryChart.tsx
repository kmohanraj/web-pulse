import type { SecurityCheck } from '../types';

export function SecurityCategoryChart({ checks }: { checks: SecurityCheck[] }) {
  const width = 280;
  const row = 22;
  const height = checks.length * row + 8;

  return (
    <figure className="security-bars">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Security score by category">
        {checks.map((check, index) => {
          const y = index * row + 4;
          const percent = check.maxScore === 0 ? 0 : check.score / check.maxScore;
          return (
            <g key={check.id} transform={`translate(0 ${y})`}>
              <text className="security-bars__label" x="0" y="11">
                {check.label}
              </text>
              <rect className="security-bars__track" x="92" y="2" width={150} height="10" rx="5" />
              <rect
                className={`security-bars__fill security-bars__fill--${check.severity}`}
                x="92"
                y="2"
                width={Math.max(0, 150 * percent)}
                height="10"
                rx="5"
              />
              <text className="security-bars__points" x={width} y="11" textAnchor="end">
                {check.score}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
