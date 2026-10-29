import { useEffect } from 'react';
import { pageForCategory, selectConnectedCards } from '@/app/connections';
import { HealthScoreBreakdown, recalculateHealthScore, selectHealthResult } from '@/modules/health';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActivePage, setSidebarOpen } from '@/store/slices/uiSlice';
import { selectCategory } from '../dashboardSlice';
import {
  selectDashboardSnapshot,
  selectHealthScore,
  selectSelectedCategory,
  selectTotalIssues,
  selectTotalWarnings,
  selectValidationStatus,
} from '../selectors';
import { CategoryGrid } from './CategoryGrid';
import { HealthSummary } from './HealthSummary';

export function DashboardView() {
  const dispatch = useAppDispatch();
  const snapshot = useAppSelector(selectDashboardSnapshot);
  const scanScore = useAppSelector(selectHealthScore);
  const scanIssues = useAppSelector(selectTotalIssues);
  const scanWarnings = useAppSelector(selectTotalWarnings);
  const scanStatus = useAppSelector(selectValidationStatus);
  const engine = useAppSelector(selectHealthResult);
  const cards = useAppSelector(selectConnectedCards);
  const selected = useAppSelector(selectSelectedCategory);
  const summary =
    engine && engine.score !== null
      ? { score: engine.score, issues: engine.totalIssues, warnings: engine.totalWarnings, status: engine.status }
      : { score: scanScore, issues: scanIssues, warnings: scanWarnings, status: scanStatus };

  useEffect(() => {
    void dispatch(recalculateHealthScore());
  }, [dispatch]);

  return (
    <div className="dashboard">
      <HealthSummary
        score={summary.score}
        issues={summary.issues}
        warnings={summary.warnings}
        status={summary.status}
        error={snapshot.error}
        title={snapshot.title}
      />
      {engine && engine.score !== null && (
        <section className="card" aria-label="Health score by category">
          <header className="card__header">
            <h2>Health score</h2>
          </header>
          <HealthScoreBreakdown categories={engine.categories} />
        </section>
      )}
      <CategoryGrid
        cards={cards}
        selectedId={selected?.id ?? null}
        onSelect={(id) => dispatch(selectCategory(selected?.id === id ? null : id))}
      />
      {selected && (
        <section className="card dashboard-findings" aria-label={`${selected.label} findings`}>
          <header className="card__header">
            <h2>{selected.label}</h2>
            {pageForCategory(selected.id) !== 'dashboard' && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  dispatch(setActivePage(pageForCategory(selected.id)));
                  dispatch(setSidebarOpen(false));
                }}
              >
                Open module
              </button>
            )}
          </header>
          {selected.findings.length === 0 ? (
            <p className="dashboard-findings__empty">No findings in this category.</p>
          ) : (
            <ul className="result-list">
              {selected.findings.map((finding, index) => (
                <li key={`${finding.message}-${index}`} className="result-list__item">
                  <span className={`badge badge--${finding.severity}`}>{finding.severity}</span>
                  <div className="result-list__body">
                    <span className="result-list__title">{finding.message}</span>
                    {finding.target && <code>{finding.target}</code>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
