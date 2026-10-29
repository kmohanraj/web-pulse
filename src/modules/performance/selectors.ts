import type { RootState } from '@/store/rootReducer';

export const selectPerformanceState = (state: RootState) => state.performance;

export const selectPerformanceReport = (state: RootState) => state.performance.report;

export const selectPerformanceScore = (state: RootState) => state.performance.report?.score ?? null;

export const selectPerformanceMetrics = (state: RootState) => state.performance.report?.metrics ?? [];
