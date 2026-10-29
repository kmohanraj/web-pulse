import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/rootReducer';
import type { CategoryCardModel, DashboardSnapshot, ValidationStatus } from './types';

export const selectDashboardState = (state: RootState): RootState['dashboard'] => state.dashboard;

export const selectDashboardSnapshot = createSelector(
  selectDashboardState,
  (dashboard): DashboardSnapshot => dashboard.snapshot,
);

export const selectHealthScore = createSelector(
  selectDashboardSnapshot,
  (snapshot): number | null => snapshot.healthScore,
);

export const selectTotalIssues = createSelector(
  selectDashboardSnapshot,
  (snapshot): number => snapshot.totalIssues,
);

export const selectTotalWarnings = createSelector(
  selectDashboardSnapshot,
  (snapshot): number => snapshot.totalWarnings,
);

export const selectValidationStatus = createSelector(
  selectDashboardSnapshot,
  (snapshot): ValidationStatus => snapshot.status,
);

export const selectCategoryCards = createSelector(
  selectDashboardSnapshot,
  (snapshot): CategoryCardModel[] => snapshot.categories,
);

export const selectSelectedCategoryId = createSelector(
  selectDashboardState,
  (dashboard) => dashboard.selectedCategoryId,
);

export const selectSelectedCategory = createSelector(
  [selectCategoryCards, selectSelectedCategoryId],
  (cards, selectedId): CategoryCardModel | null => cards.find((card) => card.id === selectedId) ?? null,
);
