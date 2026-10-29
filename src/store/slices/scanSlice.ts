import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { buildDashboardSnapshot } from '@/modules/dashboard/snapshot';
import { activeWebTab } from '@/shared/webTab';
import type { ScanReport, ScanRequest, ScanResponse } from '@/shared/types';
import type { RootState } from '@/store/rootReducer';

export type ScanStatus = 'idle' | 'running' | 'succeeded' | 'failed';

export interface ScanState {
  status: ScanStatus;
  report: ScanReport | null;
  error: string | null;
}

const initialState: ScanState = {
  status: 'idle',
  report: null,
  error: null,
};

const CONTENT_SCRIPT_FILE = 'assets/content.js';
const BADGE_COLOR = '#dc2626';

export const runScan = createAsyncThunk<ScanReport, void, { state: RootState; rejectValue: string }>(
  'scan/run',
  async (_, { getState, rejectWithValue }) => {
    const { includeApiMonitor } = getState().settings;

    try {
      const tab = await activeWebTab();
      const tabId = tab?.id;
      if (tabId === undefined) {
        return rejectWithValue('No open web page. Open a page, then run the scan again.');
      }

      await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT_FILE] });

      const request: ScanRequest = { type: 'WEBPULSE_RUN_SCAN', includeApiMonitor };
      const response = (await chrome.tabs.sendMessage(tabId, request)) as ScanResponse | undefined;
      if (!response) {
        return rejectWithValue('The page did not respond to the scan.');
      }
      if (!response.ok) {
        return rejectWithValue(response.error);
      }

      const issueCount = buildDashboardSnapshot(response.report).totalIssues;
      await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
      await chrome.action.setBadgeText({ tabId, text: issueCount > 0 ? String(issueCount) : '' });

      return response.report;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Scan failed.');
    }
  },
);

const scanSlice = createSlice({
  name: 'scan',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(runScan.pending, (state) => {
        state.status = 'running';
        state.error = null;
      })
      .addCase(runScan.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.report = action.payload;
      })
      .addCase(runScan.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Scan failed.';
      });
  },
});

export const scanReducer = scanSlice.reducer;
