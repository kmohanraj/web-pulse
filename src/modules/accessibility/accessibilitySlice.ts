import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { A11yReport, A11yState, CollectAccessibilityRequest, CollectAccessibilityResponse } from './types';
import { AccessibilityAnalyzerService } from './AccessibilityAnalyzerService';

const CONTENT_SCRIPT_FILE = 'assets/content.js';

const initialState: A11yState = {
  status: 'idle',
  error: null,
  report: null,
};

export const analyzePageAccessibility = createAsyncThunk<A11yReport, void, { rejectValue: string }>(
  'accessibility/analyzePage',
  async (_, { rejectWithValue }) => {
    try {
      const tab = await activeWebTab();
      if (!tab || tab.id === undefined) {
        return rejectWithValue('No active web tab found. Open a page, then analyze again.');
      }

      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [CONTENT_SCRIPT_FILE] });
      const request: CollectAccessibilityRequest = { type: 'WEBPULSE_COLLECT_ACCESSIBILITY' };
      const response = (await chrome.tabs.sendMessage(tab.id, request)) as CollectAccessibilityResponse | undefined;
      if (!response) {
        return rejectWithValue('The page did not return accessibility data.');
      }
      if (!response.ok) {
        return rejectWithValue(response.error);
      }

      return new AccessibilityAnalyzerService().analyze(response.snapshot);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Accessibility analysis failed.');
    }
  },
);

const accessibilitySlice = createSlice({
  name: 'accessibility',
  initialState,
  reducers: {
    clearAccessibilityReport(state) {
      state.status = 'idle';
      state.error = null;
      state.report = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzePageAccessibility.pending, (state) => {
        state.status = 'running';
        state.error = null;
      })
      .addCase(analyzePageAccessibility.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.report = action.payload;
      })
      .addCase(analyzePageAccessibility.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Accessibility analysis failed.';
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

export const { clearAccessibilityReport } = accessibilitySlice.actions;
export const accessibilityReducer = accessibilitySlice.reducer;
