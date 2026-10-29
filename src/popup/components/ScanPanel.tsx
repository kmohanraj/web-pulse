import { runIntegratedScan } from '@/app/integrationSlice';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setIncludeApiMonitor } from '@/store/slices/settingsSlice';
import { ScanResults } from './ScanResults';

export function ScanPanel() {
  const dispatch = useAppDispatch();
  const includeApiMonitor = useAppSelector((state) => state.settings.includeApiMonitor);
  const { report, error } = useAppSelector((state) => state.scan);
  const integration = useAppSelector((state) => state.integration);
  const isRunning = integration.status === 'running';

  return (
    <section className="card" aria-labelledby="scan-title">
      <header className="card__header">
        <h2 id="scan-title">Page scan</h2>
      </header>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={includeApiMonitor}
          onChange={(event) => dispatch(setIncludeApiMonitor(event.target.checked))}
        />
        Monitor API calls
      </label>

      <button
        type="button"
        className="btn btn--primary btn--block"
        disabled={isRunning}
        onClick={() => void dispatch(runIntegratedScan())}
      >
        {isRunning ? 'Scanning...' : 'Run full scan'}
      </button>

      {isRunning && <LoadingState label={integration.current ? `Running ${integration.current}` : 'Running full scan'} />}

      {error && <ErrorState title="Page scan failed" message={error} onRetry={() => void dispatch(runIntegratedScan())} />}
      {integration.errors.length > 0 && (
        <ul className="result-list">
          {integration.errors.map((item) => (
            <li key={item.id} className="result-list__item">
              <span className="badge badge--error">error</span>
              <div className="result-list__body">
                <span className="result-list__title">{item.label}</span>
                <span>{item.message}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {report && <ScanResults report={report} />}
    </section>
  );
}
