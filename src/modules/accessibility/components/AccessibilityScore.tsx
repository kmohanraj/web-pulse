interface AccessibilityScoreProps {
  score: number;
}

export function AccessibilityScore({ score }: AccessibilityScoreProps) {
  const tone = score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor';

  return (
    <div className={`a11y-score a11y-score--${tone}`} aria-label={`Accessibility score ${score} out of 100`}>
      <span className="a11y-score__value">{score}</span>
      <span className="a11y-score__label">Accessibility score</span>
    </div>
  );
}
