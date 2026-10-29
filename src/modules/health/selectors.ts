import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/rootReducer';

export const selectHealthState = (state: RootState) => state.health;

export const selectHealthResult = createSelector(selectHealthState, (health) => health.result);

export const selectOverallHealthScore = createSelector(selectHealthResult, (result) => result?.score ?? null);

export const selectHealthCategories = createSelector(selectHealthResult, (result) => result?.categories ?? []);
