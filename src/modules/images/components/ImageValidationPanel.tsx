import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearImageResults, setImageFilter, validatePageImages } from '../imagesSlice';
import { selectFilteredImages, selectImageSummary, selectImagesState } from '../selectors';
import type { ImageStatus } from '../types';
import { ImageResultCard } from './ImageResultCard';

const FILTERS: ReadonlyArray<{ id: ImageStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'broken', label: 'Broken' },
  { id: 'missing_alt', label: 'Missing alt' },
  { id: 'empty_src', label: 'Empty source' },
  { id: 'forbidden', label: '403' },
  { id: 'not_found', label: '404' },
  { id: 'ok', label: 'OK' },
];

export function ImageValidationPanel() {
  const dispatch = useAppDispatch();
  const { status, error, pageUrl, skipped, filter } = useAppSelector(selectImagesState);
  const results = useAppSelector(selectFilteredImages);
  const summary = useAppSelector(selectImageSummary);
  const isRunning = status === 'running';

  return (
    <section className="card image-validation" aria-labelledby="image-validation-title">
      <header className="card__header">
        <h2 id="image-validation-title">Image validation</h2>
      </header>
      <p className="image-validation__hint">
        Broken means the image did not load or the URL is invalid. Use View to open it in a new tab. Missing alt text and HTTP 403 or 404 are reported separately.
      </p>
      <div className="image-validation__actions">
        <button type="button" className="btn btn--primary" disabled={isRunning} onClick={() => void dispatch(validatePageImages())}>
          {isRunning ? 'Checking images...' : 'Validate images'}
        </button>
        <button type="button" className="btn" disabled={summary.total === 0 || isRunning} onClick={() => dispatch(clearImageResults())}>
          Clear
        </button>
      </div>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      {pageUrl && <p className="image-validation__page">{pageUrl}</p>}
      {summary.total > 0 && (
        <>
          <div className="stats-grid">
            <Stat label="Total" value={summary.total} />
            <Stat label="Broken" value={summary.broken} />
            <Stat label="Missing alt" value={summary.missing_alt} />
            <Stat label="Empty source" value={summary.empty_src} />
            <Stat label="403" value={summary.forbidden} />
            <Stat label="404" value={summary.not_found} />
          </div>
          {skipped > 0 && <p className="image-validation__hint">Skipped {skipped} extra image URLs after the check limit.</p>}
          <div className="link-filters" role="toolbar" aria-label="Filter images">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`link-filters__button${filter === item.id ? ' is-active' : ''}`}
                aria-pressed={filter === item.id}
                onClick={() => dispatch(setImageFilter(item.id))}
              >
                {item.label}
              </button>
            ))}
          </div>
          {results.length === 0 ? (
            <p className="image-validation__hint">No images match this filter.</p>
          ) : (
            <div className="image-grid">
              {results.map((result) => (
                <ImageResultCard key={result.id} result={result} />
              ))}
            </div>
          )}
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
