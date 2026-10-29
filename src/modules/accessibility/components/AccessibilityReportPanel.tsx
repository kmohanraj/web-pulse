import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { analyzePageAccessibility, clearAccessibilityReport } from '../accessibilitySlice';
import { selectAccessibilityChecks, selectAccessibilityReport, selectAccessibilityState } from '../selectors';
import { AccessibilityCheckList } from './AccessibilityCheckList';
import { AccessibilityScore } from './AccessibilityScore';

export function AccessibilityReportPanel() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector(selectAccessibilityState);
  const report = useAppSelector(selectAccessibilityReport);
  const checks = useAppSelector(selectAccessibilityChecks);
  const isRunning = status === 'running';

  return (
    <section className="card a11y-report" aria-labelledby="a11y-report-title">
      <header className="card__header">
        <h2 id="a11y-report-title">Accessibility report</h2>
      </header>
      <p className="a11y-report__hint">
        Scores missing labels, missing alt text, heading hierarchy, ARIA issues, empty buttons, and empty anchors.
      </p>
      <div className="a11y-report__actions">
        <button type="button" className="btn btn--primary" disabled={isRunning} onClick={() => void dispatch(analyzePageAccessibility())}>
          {isRunning ? 'Analyzing...' : 'Analyze accessibility'}
        </button>
        <button type="button" className="btn" disabled={report === null || isRunning} onClick={() => dispatch(clearAccessibilityReport())}>
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
          <AccessibilityScore score={report.score} />
          <p className="a11y-report__page">{report.pageUrl}</p>
          <AccessibilityCheckList checks={checks} />
        </>
      )}
    </section>
  );
}
