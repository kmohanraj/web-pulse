import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { analyzePageSeo, clearSeoReport } from '../seoSlice';
import { SeoCheckList } from './SeoCheckList';
import { SeoScore } from './SeoScore';

export function SeoReportPanel() {
  const dispatch = useAppDispatch();
  const { status, error, report } = useAppSelector((state) => state.seo);
  const isRunning = status === 'running';

  return (
    <section className="card seo-report" aria-labelledby="seo-report-title">
      <header className="card__header">
        <h2 id="seo-report-title">SEO report</h2>
      </header>
      <p className="seo-report__hint">
        Scores the title, meta description, canonical URL, H1 tags, Open Graph tags, Twitter tags, and robots meta.
      </p>
      <div className="seo-report__actions">
        <button type="button" className="btn btn--primary" disabled={isRunning} onClick={() => void dispatch(analyzePageSeo())}>
          {isRunning ? 'Analyzing...' : 'Analyze SEO'}
        </button>
        <button type="button" className="btn" disabled={report === null || isRunning} onClick={() => dispatch(clearSeoReport())}>
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
          <SeoScore score={report.score} />
          <p className="seo-report__page">{report.pageUrl}</p>
          <SeoCheckList checks={report.checks} />
        </>
      )}
    </section>
  );
}
