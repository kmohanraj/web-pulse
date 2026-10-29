import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { runScan } from '@/store/slices/scanSlice';
import { buildDashboardSnapshot, emptyDashboardSnapshot } from './snapshot';
import type { DashboardCategoryId, DashboardState } from './types';

const initialState: DashboardState = {
  snapshot: emptyDashboardSnapshot(),
  selectedCategoryId: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    selectCategory(state, action: PayloadAction<DashboardCategoryId | null>) {
      state.selectedCategoryId = action.payload;
    },
    clearDashboard(state) {
      state.snapshot = emptyDashboardSnapshot();
      state.selectedCategoryId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runScan.pending, (state) => {
        state.snapshot.status = 'running';
        state.snapshot.error = null;
      })
      .addCase(runScan.fulfilled, (state, action) => {
        const selected = state.selectedCategoryId;
        state.snapshot = buildDashboardSnapshot(action.payload);
        state.selectedCategoryId = selected;
      })
      .addCase(runScan.rejected, (state, action) => {
        state.snapshot.status = 'failed';
        state.snapshot.error = action.payload ?? action.error.message ?? 'Scan failed.';
      });
  },
});

export const { selectCategory, clearDashboard } = dashboardSlice.actions;
export const dashboardReducer = dashboardSlice.reducer;
