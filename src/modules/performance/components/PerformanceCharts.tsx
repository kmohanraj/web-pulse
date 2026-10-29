import { useEffect, useRef } from 'react';
import type { PerformanceMetric } from '../types';
import { Chart, chartColor } from '../chartSetup';

export function PerformanceScoreChart({ score }: { score: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Score', 'Remaining'],
        datasets: [
          {
            data: [score, Math.max(0, 100 - score)],
            backgroundColor: [scoreColor(score), chartColor('--color-surface-muted', '#e2e8f0')],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
      },
    });
    return () => chart.destroy();
  }, [score]);

  return (
    <figure className="performance-chart performance-chart--score">
      <canvas ref={canvasRef} aria-label={`Performance score ${score} out of 100`} />
      <figcaption>
        <strong>{score}</strong>
        <span>Performance score</span>
      </figcaption>
    </figure>
  );
}

export function PerformanceMetricChart({ metrics }: { metrics: PerformanceMetric[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: metrics.map((metric) => metric.label),
        datasets: [
          {
            label: 'Points',
            data: metrics.map((metric) => metric.score),
            backgroundColor: metrics.map((metric) => ratingColor(metric.rating)),
            borderWidth: 0,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 25,
            ticks: { color: chartColor('--color-text-muted', '#64748b') },
            grid: { color: chartColor('--color-border', '#e2e8f0') },
          },
          x: {
            ticks: { color: chartColor('--color-text-muted', '#64748b') },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => {
                const metric = metrics[item.dataIndex];
                return metric ? `${metric.score}/${metric.maxScore} · ${formatMetric(metric)}` : '';
              },
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [metrics]);

  return (
    <figure className="performance-chart performance-chart--bars">
      <canvas ref={canvasRef} aria-label="Performance points by metric" />
    </figure>
  );
}

function formatMetric(metric: PerformanceMetric): string {
  if (metric.value === null) {
    return 'unavailable';
  }
  return metric.unit === 'ms' ? `${metric.value} ms` : metric.value.toFixed(3);
}

function scoreColor(score: number): string {
  if (score >= 80) {
    return chartColor('--color-success', '#16a34a');
  }
  if (score >= 50) {
    return chartColor('--color-warning', '#d97706');
  }
  return chartColor('--color-danger', '#dc2626');
}

function ratingColor(rating: PerformanceMetric['rating']): string {
  if (rating === 'good') {
    return chartColor('--color-success', '#16a34a');
  }
  if (rating === 'needs-improvement') {
    return chartColor('--color-warning', '#d97706');
  }
  if (rating === 'poor') {
    return chartColor('--color-danger', '#dc2626');
  }
  return chartColor('--color-text-muted', '#64748b');
}
