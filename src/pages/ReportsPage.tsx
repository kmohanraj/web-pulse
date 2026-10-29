import { useState } from 'react';
import { ReportExportService, type ExportFormat } from '@/modules/reports';
import { applyExportPreferences, selectExportPreferences } from '@/modules/settings';
import { ScanResults } from '@/popup/components/ScanResults';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearReports, selectReport } from '@/store/slices/reportsSlice';

export function ReportsPage() {
  const dispatch = useAppDispatch();
  const { items, selectedId } = useAppSelector((state) => state.reports);
  const links = useAppSelector((state) => state.links);
  const network = useAppSelector((state) => state.network);
  const seo = useAppSelector((state) => state.seo.report);
  const performance = useAppSelector((state) => state.performance.report);
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const exportPreferences = useAppSelector(selectExportPreferences);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportReport = (format: ExportFormat): void => {
    if (!selected) {
      return;
    }
    setExporting(format);
    setExportError(null);
    void new ReportExportService()
      .collect(selected, {
        links: { pageUrl: links.pageUrl, status: links.status, results: links.results },
        network: { pageUrl: network.pageUrl, records: network.records },
        seo,
        performance,
      })
      .then((report) => new ReportExportService().download(format, applyExportPreferences(report, exportPreferences)))
      .catch((error: unknown) => {
        setExportError(error instanceof Error ? error.message : 'Export failed.');
      })
      .finally(() => setExporting(null));
  };

  return (
    <div className="page">
      <section className="page__intro page__intro--row">
        <div>
          <h2>Reports</h2>
          <p>Scans are kept locally after each successful run.</p>
        </div>
        <div className="report-export">
          <button type="button" className={`btn${exportPreferences.defaultFormat === 'pdf' ? ' btn--primary' : ''}`} disabled={!selected || exporting !== null} onClick={() => exportReport('pdf')}>
            {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
          </button>
          <button type="button" className={`btn${exportPreferences.defaultFormat === 'xlsx' ? ' btn--primary' : ''}`} disabled={!selected || exporting !== null} onClick={() => exportReport('xlsx')}>
            {exporting === 'xlsx' ? 'Exporting...' : 'Excel'}
          </button>
          <button type="button" className={`btn${exportPreferences.defaultFormat === 'json' ? ' btn--primary' : ''}`} disabled={!selected || exporting !== null} onClick={() => exportReport('json')}>
            {exporting === 'json' ? 'Exporting...' : 'JSON'}
          </button>
          <button type="button" className={`btn${exportPreferences.defaultFormat === 'html' ? ' btn--primary' : ''}`} disabled={!selected || exporting !== null} onClick={() => exportReport('html')}>
            {exporting === 'html' ? 'Exporting...' : 'HTML'}
          </button>
          <button type="button" className="btn btn--primary" disabled={items.length === 0} onClick={() => dispatch(clearReports())}>
            Clear
          </button>
        </div>
      </section>
      {exportError && (
        <p className="alert alert--error" role="alert">
          {exportError}
        </p>
      )}

      {items.length === 0 ? (
        <p className="alert">No reports yet. Run a scan from the dashboard.</p>
      ) : (
        <div className="reports">
          <ul className="reports__list">
            {items.map((item) => {
              const isActive = item.id === selected?.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`reports__item${isActive ? ' is-active' : ''}`}
                    onClick={() => dispatch(selectReport(item.id))}
                  >
                    <span>{item.report.title || item.report.url}</span>
                    <small>
                      {item.report.links.issues.length} issues ·{' '}
                      {new Date(item.report.scannedAt).toLocaleString()}
                    </small>
                  </button>
                </li>
              );
            })}
          </ul>
          {selected && <ScanResults report={selected.report} />}
        </div>
      )}
    </div>
  );
}
