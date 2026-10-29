import type { RootState } from '@/store/rootReducer';

export const selectAccessibilityState = (state: RootState) => state.accessibility;

export const selectAccessibilityReport = (state: RootState) => state.accessibility.report;

export const selectAccessibilityScore = (state: RootState) => state.accessibility.report?.score ?? null;

export const selectAccessibilityChecks = (state: RootState) => state.accessibility.report?.checks ?? [];
