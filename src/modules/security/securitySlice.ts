import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { selectValidationPolicy } from '@/modules/settings/selectors';
import type { RootState } from '@/store/rootReducer';
import type { CollectSecurityRequest, CollectSecurityResponse, SecurityReport, SecurityState } from './types';
import { SecurityAnalyzerService } from './SecurityAnalyzerService';
import { SecurityHeaderService } from './SecurityHeaderService';

const CONTENT_SCRIPT_FILE = 'assets/content.js';

const initialState: SecurityState = {
  status: 'idle',
  error: null,
  report: null,
};

export const analyzePageSecurity = createAsyncThunk<SecurityReport, void, { state: RootState; rejectValue: string }>(
  'security/analyzePage',
  async (_, { getState, rejectWithValue }) => {
    try {
      const tab = await activeWebTab();
      if (!tab || tab.id === undefined) {
        return rejectWithValue('No active web tab found. Open a page, then validate again.');
      }

      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [CONTENT_SCRIPT_FILE] });
      const request: CollectSecurityRequest = { type: 'WEBPULSE_COLLECT_SECURITY' };
      const response = (await chrome.tabs.sendMessage(tab.id, request)) as CollectSecurityResponse | undefined;
      if (!response) {
        return rejectWithValue('The page did not return security data.');
      }
      if (!response.ok) {
        return rejectWithValue(response.error);
      }

      const captured = await new SecurityHeaderService().capture(response.snapshot.pageUrl, selectValidationPolicy(getState()));
      return new SecurityAnalyzerService().analyze(response.snapshot, captured.headers, captured.cookies);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Security validation failed.');
    }
  },
);

const securitySlice = createSlice({
  name: 'security',
  initialState,
  reducers: {
    clearSecurityReport(state) {
      state.status = 'idle';
      state.error = null;
      state.report = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzePageSecurity.pending, (state) => {
        state.status = 'running';
        state.error = null;
      })
      .addCase(analyzePageSecurity.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.report = action.payload;
      })
      .addCase(analyzePageSecurity.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Security validation failed.';
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

export const { clearSecurityReport } = securitySlice.actions;
export const securityReducer = securitySlice.reducer;
