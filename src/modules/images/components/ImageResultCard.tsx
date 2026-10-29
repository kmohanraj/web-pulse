import type { ImageCheckResult, ImageStatus } from '../types';
import { ImagePreview } from './ImagePreview';

const STATUS_LABEL: Record<ImageStatus, string> = {
  ok: 'OK',
  empty_src: 'Empty source',
  missing_alt: 'Missing alt',
  broken: 'Broken',
  forbidden: '403',
  not_found: '404',
};

export function ImageResultCard({ result }: { result: ImageCheckResult }) {
  const viewUrl = result.previewUrl ?? (isOpenable(result.src) ? result.src : null);

  return (
    <article className={`image-card image-card--${result.status}`}>
      <ImagePreview src={result.previewUrl} alt={result.alt ?? ''} />
      <div className="image-card__body">
        <div className="image-card__meta">
          <span className={`image-status image-status--${result.status}`}>{STATUS_LABEL[result.status]}</span>
          {result.statusCode !== null && <span className="image-card__code">{result.statusCode}</span>}
          {viewUrl && (
            <button type="button" className="image-card__view" onClick={() => openImage(viewUrl)}>
              View
            </button>
          )}
        </div>
        <code className="image-card__src">{result.src || 'No source'}</code>
        <p className="image-card__recommendation">{result.recommendation}</p>
      </div>
    </article>
  );
}

function isOpenable(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/');
}

function openImage(url: string): void {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
