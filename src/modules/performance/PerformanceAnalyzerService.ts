import type { PerformanceMetric, PerformanceMetricId, PerformanceRating, PerformanceReport, PerformanceSnapshot } from './types';

const METRICS: readonly {
  id: PerformanceMetricId;
  label: string;
  unit: PerformanceMetric['unit'];
  good: number;
  poor: number;
  maxScore: number;
  recommendation: string;
}[] = [
  {
    id: 'ttfb',
    label: 'TTFB',
    unit: 'ms',
    good: 800,
    poor: 1800,
    maxScore: 15,
    recommendation: 'Reduce server wait time. Target a TTFB of 800 ms or less.',
  },
  {
    id: 'fcp',
    label: 'FCP',
    unit: 'ms',
    good: 1800,
    poor: 3000,
    maxScore: 15,
    recommendation: 'Render meaningful content sooner. Target an FCP of 1.8 s or less.',
  },
  {
    id: 'lcp',
    label: 'LCP',
    unit: 'ms',
    good: 2500,
    poor: 4000,
    maxScore: 25,
    recommendation: 'Speed up the largest visible element. Target an LCP of 2.5 s or less.',
  },
  {
    id: 'cls',
    label: 'CLS',
    unit: 'score',
    good: 0.1,
    poor: 0.25,
    maxScore: 20,
    recommendation: 'Reserve space for images, ads, and late content. Target a CLS of 0.1 or less.',
  },
  {
    id: 'inp',
    label: 'INP',
    unit: 'ms',
    good: 200,
    poor: 500,
    maxScore: 25,
    recommendation: 'Shorten interaction handlers. Interact with the page, then analyze again if INP is missing.',
  },
];

export class PerformanceAnalyzerService {
  analyze(snapshot: PerformanceSnapshot): PerformanceReport {
    const metrics = METRICS.map((definition) => scoreMetric(definition, snapshot[definition.id]));
    return {
      pageUrl: snapshot.pageUrl,
      score: metrics.reduce((total, metric) => total + metric.score, 0),
      metrics,
      analyzedAt: new Date().toISOString(),
    };
  }
}

function scoreMetric(
  definition: (typeof METRICS)[number],
  value: number | null,
): PerformanceMetric {
  if (value === null) {
    const noInteractions = definition.id === 'inp';
    return {
      ...definition,
      value: null,
      rating: 'unavailable',
      score: noInteractions ? definition.maxScore : 0,
      recommendation: noInteractions
        ? 'No interactions recorded yet. Interact with the page, then analyze again.'
        : `${definition.label} was not recorded for this page yet. Run the scan again after the page finishes. A reload is not required.`,
    };
  }

  const rating = rate(value, definition.good, definition.poor);
  const ratio = value <= definition.good ? 1 : value >= definition.poor ? 0 : (definition.poor - value) / (definition.poor - definition.good);
  return {
    ...definition,
    value,
    rating,
    score: Math.round(definition.maxScore * ratio),
  };
}

function rate(value: number, good: number, poor: number): PerformanceRating {
  if (value <= good) {
    return 'good';
  }
  if (value < poor) {
    return 'needs-improvement';
  }
  return 'poor';
}
