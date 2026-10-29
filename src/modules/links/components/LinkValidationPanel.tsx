import { useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearLinkResults, validatePageLinks } from '../linksSlice';
import { selectLinkResults, selectLinkSummary, selectLinksState } from '../selectors';
import { TRACKED_STATUSES } from '../types';
import type { LinkKind, TrackedStatus } from '../types';
import { LinkResultTable } from './LinkResultTable';

type LinkFilter = 'all' | LinkKind | TrackedStatus;

const FILTERS: ReadonlyArray<{ id: LinkFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'internal', label: 'Internal' },
  { id: 'external', label: 'External' },
  { id: 'anchor', label: 'Anchor' },
  ...TRACKED_STATUSES.map((code) => ({ id: code, label: String(code) })),
];

export function LinkValidationPanel() {
  const dispatch = useAppDispatch();
  const { status, error, pageUrl, skipped } = useAppSelector(selectLinksState);
  const results = useAppSelector(selectLinkResults);
  const summary = useAppSelector(selectLinkSummary);
  const [filter, setFilter] = useState<LinkFilter>('all');
  const isRunning = status === 'running';

  const visible = useMemo(() => {
    if (filter === 'all') {
      return results;
    }
    if (filter === 'internal' || filter === 'external' || filter === 'anchor') {
      return results.filter((result) => result.kind === filter);
    }
    return results.filter((result) => result.trackedStatus === filter);
  }, [filter, results]);

  return (
    <section className="card link-validation" aria-labelledby="link-validation-title">
      <header className="card__header">
        <h2 id="link-validation-title">Link validation</h2>
      </header>
      <p className="link-validation__hint">
        Collects every link on the active page, then checks internal and external URLs for 200, 301, 302, 403, 404, and 500.
      </p>
      <div className="link-validation__actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={isRunning}
          onClick={() => void dispatch(validatePageLinks())}
        >
          {isRunning ? 'Checking links...' : 'Validate links'}
        </button>
        <button type="button" className="btn" disabled={results.length === 0 || isRunning} onClick={() => dispatch(clearLinkResults())}>
          Clear
        </button>
      </div>

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      {pageUrl && <p className="link-validation__page">{pageUrl}</p>}

      {results.length > 0 && (
        <>
          <div className="stats-grid">
            <Stat label="Total" value={summary.total} />
            <Stat label="Internal" value={summary.internal} />
            <Stat label="External" value={summary.external} />
            <Stat label="Anchor" value={summary.anchor} />
            {TRACKED_STATUSES.map((code) => (
              <Stat key={code} label={String(code)} value={summary.byStatus[code]} />
            ))}
          </div>
          {skipped > 0 && <p className="link-validation__hint">Skipped {skipped} extra unique URLs after the check limit.</p>}
          <div className="link-filters" role="toolbar" aria-label="Filter links">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`link-filters__button${filter === item.id ? ' is-active' : ''}`}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <LinkResultTable results={visible} />
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
