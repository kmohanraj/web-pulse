interface SecurityScoreChartProps {
  score: number;
}

export function SecurityScoreChart({ score }: SecurityScoreChartProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const tone = score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor';

  return (
    <figure className={`security-score security-score--${tone}`}>
      <svg viewBox="0 0 120 120" role="img" aria-label={`Security score ${score} out of 100`}>
        <circle className="security-score__track" cx="60" cy="60" r={radius} />
        <circle
          className="security-score__value"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <figcaption>
        <strong>{score}</strong>
        <span>Security score</span>
      </figcaption>
    </figure>
  );
}
