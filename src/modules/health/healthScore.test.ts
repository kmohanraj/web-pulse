import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import { emptyDashboardSnapshot } from '@/modules/dashboard/snapshot';
import type { LinkCheckResult } from '@/modules/links/types';
import type { NetworkRecord } from '@/modules/network/types';
import { collectHealthInput, type HealthScoreSources } from './collectInput';
import { HealthScoreEngine } from './HealthScoreEngine';
import { clearHealthScore, healthReducer, healthScoreCalculated } from './healthSlice';
import type { HealthCategoryObservation, HealthScoreResult } from './types';
import { clampScore, scoreFromIssueCounts, weightedHealthScore } from './utilities';

describe('health score utilities', () => {
  it('clamps scores to 0-100', () => {
    expect(clampScore(-4)).toBe(0);
    expect(clampScore(140)).toBe(100);
    expect(clampScore(79.6)).toBe(80);
    expect(clampScore(Number.NaN)).toBe(0);
  });

  it('applies issue and warning penalties', () => {
    expect(scoreFromIssueCounts(0, 0)).toBe(100);
    expect(scoreFromIssueCounts(1, 1)).toBe(84);
    expect(scoreFromIssueCounts(10, 0)).toBe(0);
  });

  it('redistributes weight when categories are missing', () => {
    expect(
      weightedHealthScore([
        { score: 50, weight: 20 },
        { score: null, weight: 80 },
      ]),
    ).toBe(50);
    expect(weightedHealthScore([{ score: null, weight: 15 }])).toBeNull();
  });
});

describe('HealthScoreEngine', () => {
  const engine = new HealthScoreEngine(() => '2026-01-01T00:00:00.000Z');

  it('returns 100 when every category is clean', () => {
    const result = engine.calculate({ categories: observations(100) });
    expect(result.score).toBe(100);
    expect(result.status).toBe('passed');
    expect(result.calculatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.categories.reduce((sum, category) => sum + category.weightedPoints, 0)).toBe(100);
  });

  it('returns null before any category is available', () => {
    const result = engine.calculate({
      categories: observations(null).map((category) => ({ ...category, available: false, score: null, source: 'none' })),
    });
    expect(result.score).toBeNull();
    expect(result.status).toBe('not_started');
  });

  it('fails when the weighted score drops below 50', () => {
    const result = engine.calculate({ categories: observations(40) });
    expect(result.score).toBe(40);
    expect(result.status).toBe('failed');
  });
});

describe('collectHealthInput', () => {
  it('prefers a module score over the scan snapshot', () => {
    const sources = emptySources();
    sources.dashboard.snapshot = {
      ...emptyDashboardSnapshot(),
      categories: emptyDashboardSnapshot().categories.map((card) =>
        card.id === 'seo' ? { ...card, status: 'passed', checked: 7, issues: 0, warnings: 0 } : card,
      ),
    };
    sources.seo.report = {
      pageUrl: 'https://example.com',
      score: 40,
      analyzedAt: '2026-01-01T00:00:00.000Z',
      checks: [
        { id: 'title', label: 'Title', severity: 'fail', score: 0, maxScore: 20, value: '', recommendation: 'Add a title' },
      ],
    };

    const seo = collectHealthInput(sources).categories.find((category) => category.id === 'seo');
    expect(seo).toMatchObject({ score: 40, issues: 1, source: 'module' });
  });

  it('scores broken links and slow APIs from module results', () => {
    const sources = emptySources();
    sources.links = { status: 'succeeded', results: [link('broken', 404), link('ok', 200), link('redirect', 301)] };
    sources.network = { status: 'watching', records: [request(200, 200), request(500, 100), request(200, 1500)] };

    const input = collectHealthInput(sources);
    expect(input.categories.find((category) => category.id === 'links')).toMatchObject({
      issues: 1,
      warnings: 1,
      score: 84,
      source: 'module',
    });
    expect(input.categories.find((category) => category.id === 'apis')).toMatchObject({
      issues: 1,
      warnings: 1,
      score: 84,
    });
  });

  it('falls back to scanned category counts', () => {
    const sources = emptySources();
    sources.dashboard.snapshot = {
      ...emptyDashboardSnapshot(),
      categories: emptyDashboardSnapshot().categories.map((card) =>
        card.id === 'images' ? { ...card, status: 'failed', checked: 4, issues: 2, warnings: 0 } : card,
      ),
    };

    expect(collectHealthInput(sources).categories.find((category) => category.id === 'images')).toMatchObject({
      score: 76,
      source: 'scan',
    });
  });
});

describe('health reducer', () => {
  it('stores a calculated result and clears it', () => {
    const store = configureStore({ reducer: { health: healthReducer } });
    const result = sampleResult();
    store.dispatch(healthScoreCalculated(result));
    expect(store.getState().health).toEqual({ status: 'ready', result });
    store.dispatch(clearHealthScore());
    expect(store.getState().health).toEqual({ status: 'idle', result: null });
  });
});

function observations(score: number | null): HealthCategoryObservation[] {
  return (['links', 'apis', 'images', 'seo', 'accessibility', 'security', 'performance'] as const).map((id) => ({
    id,
    available: score !== null,
    score,
    issues: 0,
    warnings: 0,
    checked: 1,
    source: 'module',
  }));
}

function emptySources(): HealthScoreSources {
  return {
    links: { status: 'idle', results: [] },
    images: { status: 'idle', results: [] },
    network: { status: 'idle', records: [] },
    seo: { report: null },
    accessibility: { report: null },
    security: { report: null },
    performance: { report: null },
    dashboard: { snapshot: emptyDashboardSnapshot() },
  };
}

function link(outcome: LinkCheckResult['outcome'], status: number): LinkCheckResult {
  return {
    id: `${outcome}-${status}`,
    href: 'https://example.com',
    url: 'https://example.com',
    text: 'Example',
    kind: 'external',
    status,
    finalStatus: status,
    trackedStatus: status === 200 || status === 301 || status === 302 || status === 403 || status === 404 || status === 500 ? status : null,
    outcome,
    error: null,
  };
}

function request(status: number, durationMs: number): NetworkRecord {
  return {
    id: `${status}-${durationMs}`,
    pageUrl: 'https://example.com',
    url: 'https://example.com/api',
    method: 'GET',
    status,
    durationMs,
    requestSize: 0,
    responseSize: 0,
    channel: 'fetch',
    transport: 'fetch',
    operationName: null,
    startedAt: '2026-01-01T00:00:00.000Z',
  };
}

function sampleResult(): HealthScoreResult {
  return {
    score: 88,
    status: 'passed',
    categories: [],
    totalIssues: 0,
    totalWarnings: 1,
    calculatedAt: '2026-01-01T00:00:00.000Z',
  };
}
