import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { selectValidationPolicy } from '@/modules/settings/selectors';
import type { RootState } from '@/store/rootReducer';
import type { CollectImagesRequest, CollectImagesResponse, ImageStatus, ImageValidationPayload, ImagesState } from './types';
import { ImageValidatorService } from './ImageValidatorService';

const CONTENT_SCRIPT_FILE = 'assets/content.js';

const initialState: ImagesState = {
  status: 'idle',
  error: null,
  pageUrl: null,
  results: [],
  skipped: 0,
  filter: 'all',
};

export const validatePageImages = createAsyncThunk<ImageValidationPayload, void, { state: RootState; rejectValue: string }>(
  'images/validatePage',
  async (_, { getState, rejectWithValue }) => {
    try {
      const tab = await activeWebTab();
      if (!tab || tab.id === undefined) {
        return rejectWithValue('No active web tab found. Open a page, then validate again.');
      }

      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [CONTENT_SCRIPT_FILE] });

      const request: CollectImagesRequest = { type: 'WEBPULSE_COLLECT_IMAGES' };
      const response = (await chrome.tabs.sendMessage(tab.id, request)) as CollectImagesResponse | undefined;
      if (!response) {
        return rejectWithValue('The page did not return its images.');
      }
      if (!response.ok) {
        return rejectWithValue(response.error);
      }

      const service = new ImageValidatorService();
      const checked = await service.validate(response.images, selectValidationPolicy(getState()));
      return { pageUrl: response.pageUrl, results: checked.results, skipped: checked.skipped };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Image validation failed.');
    }
  },
);

const imagesSlice = createSlice({
  name: 'images',
  initialState,
  reducers: {
    clearImageResults(state) {
      state.status = 'idle';
      state.error = null;
      state.pageUrl = null;
      state.results = [];
      state.skipped = 0;
      state.filter = 'all';
    },
    setImageFilter(state, action: PayloadAction<ImageStatus | 'all'>) {
      state.filter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(validatePageImages.pending, (state) => {
        state.status = 'running';
        state.error = null;
      })
      .addCase(validatePageImages.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.pageUrl = action.payload.pageUrl;
        state.results = action.payload.results;
        state.skipped = action.payload.skipped;
      })
      .addCase(validatePageImages.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Image validation failed.';
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

export const { clearImageResults, setImageFilter } = imagesSlice.actions;
export const imagesReducer = imagesSlice.reducer;
