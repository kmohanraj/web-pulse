import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { CollectSeoRequest, CollectSeoResponse, SeoReport, SeoState } from './types';
import { SeoAnalyzerService } from './SeoAnalyzerService';

const CONTENT_SCRIPT_FILE = 'assets/content.js';

const initialState: SeoState = {
  status: 'idle',
  error: null,
  report: null,
};

export const analyzePageSeo = createAsyncThunk<SeoReport, void, { rejectValue: string }>(
  'seo/analyzePage',
  async (_, { rejectWithValue }) => {
    try {
      const tab = await activeWebTab();
      if (!tab || tab.id === undefined) {
        return rejectWithValue('No active web tab found. Open a page, then analyze again.');
      }

      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [CONTENT_SCRIPT_FILE] });
      const request: CollectSeoRequest = { type: 'WEBPULSE_COLLECT_SEO' };
      const response = (await chrome.tabs.sendMessage(tab.id, request)) as CollectSeoResponse | undefined;
      if (!response) {
        return rejectWithValue('The page did not return SEO metadata.');
      }
      if (!response.ok) {
        return rejectWithValue(response.error);
      }

      return new SeoAnalyzerService().analyze(response.snapshot);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'SEO analysis failed.');
    }
  },
);

const seoSlice = createSlice({
  name: 'seo',
  initialState,
  reducers: {
    clearSeoReport(state) {
      state.status = 'idle';
      state.error = null;
      state.report = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzePageSeo.pending, (state) => {
        state.status = 'running';
        state.error = null;
      })
      .addCase(analyzePageSeo.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.report = action.payload;
      })
      .addCase(analyzePageSeo.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'SEO analysis failed.';
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

export const { clearSeoReport } = seoSlice.actions;
export const seoReducer = seoSlice.reducer;
