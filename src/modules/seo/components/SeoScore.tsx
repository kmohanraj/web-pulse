interface SeoScoreProps {
  score: number;
}

export function SeoScore({ score }: SeoScoreProps) {
  const tone = score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor';

  return (
    <div className={`seo-score seo-score--${tone}`} aria-label={`SEO score ${score} out of 100`}>
      <span className="seo-score__value">{score}</span>
      <span className="seo-score__label">SEO score</span>
    </div>
  );
}
