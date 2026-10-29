import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { analyzePageSecurity, clearSecurityReport } from '../securitySlice';
import { selectSecurityChecks, selectSecurityReport, selectSecurityState } from '../selectors';
import { SecurityCategoryChart } from './SecurityCategoryChart';
import { SecurityCheckList } from './SecurityCheckList';
import { SecurityScoreChart } from './SecurityScoreChart';

export function SecurityReportPanel() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector(selectSecurityState);
  const report = useAppSelector(selectSecurityReport);
  const checks = useAppSelector(selectSecurityChecks);
  const isRunning = status === 'running';

  return (
    <section className="card security-report" aria-labelledby="security-report-title">
      <header className="card__header">
        <h2 id="security-report-title">Security report</h2>
      </header>
      <p className="security-report__hint">
        Scores HTTPS, mixed content, CSP, HSTS, cookie flags, XSS protections, and iframe restrictions.
      </p>
      <div className="security-report__actions">
        <button type="button" className="btn btn--primary" disabled={isRunning} onClick={() => void dispatch(analyzePageSecurity())}>
          {isRunning ? 'Validating...' : 'Validate security'}
        </button>
        <button type="button" className="btn" disabled={report === null || isRunning} onClick={() => dispatch(clearSecurityReport())}>
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
          <div className="security-charts">
            <SecurityScoreChart score={report.score} />
            <SecurityCategoryChart checks={checks} />
          </div>
          <p className="security-report__page">{report.pageUrl}</p>
          <SecurityCheckList checks={checks} />
        </>
      )}
    </section>
  );
}
