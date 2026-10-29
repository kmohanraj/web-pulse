import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { selectValidationPolicy } from '@/modules/settings/selectors';
import { activeWebTab } from '@/shared/webTab';
import type { RootState } from '@/store/rootReducer';
import type { CollectLinksRequest, CollectLinksResponse, LinkValidationPayload, LinksState } from './types';
import { LinkValidatorService } from './LinkValidatorService';

const CONTENT_SCRIPT_FILE = 'assets/content.js';

const initialState: LinksState = {
  status: 'idle',
  error: null,
  pageUrl: null,
  results: [],
  skipped: 0,
};

export const validatePageLinks = createAsyncThunk<LinkValidationPayload, void, { state: RootState; rejectValue: string }>(
  'links/validatePage',
  async (_, { getState, rejectWithValue }) => {
    try {
      const tab = await activeWebTab();
      const tabId = tab?.id;
      if (tabId === undefined) {
        return rejectWithValue('No open web page. Open a page, then run the scan again.');
      }

      await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT_FILE] });

      const request: CollectLinksRequest = { type: 'WEBPULSE_COLLECT_LINKS' };
      const response = (await chrome.tabs.sendMessage(tabId, request)) as CollectLinksResponse | undefined;
      if (!response) {
        return rejectWithValue('The page did not return its links.');
      }
      if (!response.ok) {
        return rejectWithValue(response.error);
      }

      const service = new LinkValidatorService();
      const checked = await service.validate(response.links, {
        pageUrl: response.pageUrl,
        policy: selectValidationPolicy(getState()),
      });
      return { pageUrl: response.pageUrl, results: checked.results, skipped: checked.skipped };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Link validation failed.');
    }
  },
);

const linksSlice = createSlice({
  name: 'links',
  initialState,
  reducers: {
    clearLinkResults(state) {
      state.status = 'idle';
      state.error = null;
      state.pageUrl = null;
      state.results = [];
      state.skipped = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(validatePageLinks.pending, (state) => {
        state.status = 'running';
        state.error = null;
      })
      .addCase(validatePageLinks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.pageUrl = action.payload.pageUrl;
        state.results = action.payload.results;
        state.skipped = action.payload.skipped;
      })
      .addCase(validatePageLinks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Link validation failed.';
      });
  },
});

export const { clearLinkResults } = linksSlice.actions;
export const linksReducer = linksSlice.reducer;
