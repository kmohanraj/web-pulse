import type { HealthCategoryScore } from '../types';

export function HealthScoreBreakdown({ categories }: { categories: HealthCategoryScore[] }) {
  return (
    <ol className="health-breakdown">
      {categories.map((category) => (
        <li key={category.id}>
          <span>{category.label}</span>
          <span className="health-breakdown__track" aria-hidden="true">
            <span style={{ width: `${category.score ?? 0}%` }} />
          </span>
          <strong>{category.score === null ? '—' : category.score}</strong>
        </li>
      ))}
    </ol>
  );
}
