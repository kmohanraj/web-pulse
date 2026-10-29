import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ScanReport } from '@/shared/types';
import { runScan } from './scanSlice';

export interface SavedReport {
  id: string;
  report: ScanReport;
}

export interface ReportsState {
  items: SavedReport[];
  selectedId: string | null;
}

const MAX_REPORTS = 25;

const initialState: ReportsState = {
  items: [],
  selectedId: null,
};

function reportId(report: ScanReport): string {
  return `${report.scannedAt}:${report.url}`;
}

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    selectReport(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
    },
    clearReports(state) {
      state.items = [];
      state.selectedId = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(runScan.fulfilled, (state, action) => {
      const saved: SavedReport = { id: reportId(action.payload), report: action.payload };
      state.items = [saved, ...state.items.filter((item) => item.id !== saved.id)].slice(0, MAX_REPORTS);
      state.selectedId = saved.id;
    });
  },
});

export const { selectReport, clearReports } = reportsSlice.actions;
export const reportsReducer = reportsSlice.reducer;
