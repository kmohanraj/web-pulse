import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PerformanceReport, PerformanceSnapshot, PerformanceState } from './types';
import { PerformanceAnalyzerService } from './PerformanceAnalyzerService';
import { collectPagePerformance } from './pageCollector';

const initialState: PerformanceState = {
  status: 'idle',
  error: null,
  report: null,
};

export const analyzePagePerformance = createAsyncThunk<PerformanceReport, void, { rejectValue: string }>(
  'performance/analyzePage',
  async (_, { rejectWithValue }) => {
    try {
      const tab = await activeWebTab();
      if (!tab || tab.id === undefined) {
        return rejectWithValue('No active web tab found. Open a page, then analyze again.');
      }

      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: collectPagePerformance,
      });
      const snapshot = injection?.result as PerformanceSnapshot | undefined;
      if (!snapshot || typeof snapshot.pageUrl !== 'string') {
        return rejectWithValue('The page did not return performance timings.');
      }

      return new PerformanceAnalyzerService().analyze(snapshot);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Performance analysis failed.');
    }
  },
);

const performanceSlice = createSlice({
  name: 'performance',
  initialState,
  reducers: {
    clearPerformanceReport(state) {
      state.status = 'idle';
      state.error = null;
      state.report = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzePagePerformance.pending, (state) => {
        state.status = 'running';
        state.error = null;
      })
      .addCase(analyzePagePerformance.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.report = action.payload;
      })
      .addCase(analyzePagePerformance.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Performance analysis failed.';
      });
  },
});

async function activeWebTab(): Promise<chrome.tabs.Tab | undefined> {
  const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (isWebTab(current)) {
    return current;
  }
  const [focused] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (isWebTab(focused)) {
    return focused;
  }
  const tabs = await chrome.tabs.query({ active: true });
  return tabs.filter((tab) => isWebTab(tab)).sort((left, right) => (right.lastAccessed ?? 0) - (left.lastAccessed ?? 0))[0];
}

function isWebTab(tab: chrome.tabs.Tab | undefined): tab is chrome.tabs.Tab {
  return tab?.id !== undefined && (tab.url?.startsWith('http://') === true || tab.url?.startsWith('https://') === true);
}

export const { clearPerformanceReport } = performanceSlice.actions;
export const performanceReducer = performanceSlice.reducer;
