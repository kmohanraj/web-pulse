import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { selectValidationPolicy } from '@/modules/settings/selectors';
import { activeWebTab } from '@/shared/webTab';
import type { RootState } from '@/store/rootReducer';
import { collectObservedRequests, type ObservedRequest } from './collectObservedRequests';
import { mergeNetworkRecords, refreshSafeRequests } from './refreshNetworkRecords';
import type { NetworkChannelFilter, NetworkRecord, NetworkState, NetworkStatusFilter } from './types';

const initialState: NetworkState = {
  tabId: null,
  pageUrl: null,
  records: [],
  status: 'idle',
  error: null,
  search: '',
  channel: 'all',
  statusFilter: 'all',
};

export const loadNetworkRecords = createAsyncThunk<
  { tabId: number; pageUrl: string | null; records: NetworkRecord[] },
  void,
  { state: RootState; rejectValue: string }
>('network/load', async (_, { getState, rejectWithValue }) => {
  try {
    const tab = await activeWebTab();
    if (!tab || tab.id === undefined) {
      return rejectWithValue('No open web page. Open a page, then run the scan again.');
    }
    await attachNetworkObservers(tab.id);
    const observed = await readObservedRequests(tab.id);
    const response = (await chrome.runtime.sendMessage({ type: 'WEBPULSE_NETWORK_QUERY', tabId: tab.id })) as
      | { ok: true; pageUrl: string | null; records: NetworkRecord[] }
      | undefined;
    if (!response?.ok) {
      return rejectWithValue('Network monitor did not respond.');
    }
    const pageUrl = response.pageUrl ?? tab.url ?? null;
    const merged = mergeNetworkRecords(response.records, observed, pageUrl ?? '');
    const records = await refreshSafeRequests(merged, selectValidationPolicy(getState()));
    return { tabId: tab.id, pageUrl, records };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Could not load network records.');
  }
});

export const clearNetworkRecords = createAsyncThunk<number, void, { state: { network: NetworkState }; rejectValue: string }>(
  'network/clear',
  async (_, { getState, rejectWithValue }) => {
    const tabId = getState().network.tabId;
    if (tabId === null) {
      return rejectWithValue('No tab is being monitored.');
    }
    await chrome.runtime.sendMessage({ type: 'WEBPULSE_NETWORK_CLEAR', tabId });
    return tabId;
  },
);

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setNetworkSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setNetworkChannel(state, action: PayloadAction<NetworkChannelFilter>) {
      state.channel = action.payload;
    },
    setNetworkStatusFilter(state, action: PayloadAction<NetworkStatusFilter>) {
      state.statusFilter = action.payload;
    },
    networkRecordReceived(state, action: PayloadAction<{ tabId: number; record: NetworkRecord }>) {
      if (state.tabId !== action.payload.tabId) {
        return;
      }
      const index = state.records.findIndex((record) => record.id === action.payload.record.id);
      if (index === -1) {
        state.records.push(action.payload.record);
        return;
      }
      state.records[index] = action.payload.record;
    },
    networkTabCleared(state, action: PayloadAction<number>) {
      if (state.tabId === action.payload) {
        state.records = [];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNetworkRecords.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadNetworkRecords.fulfilled, (state, action) => {
        state.status = 'watching';
        state.tabId = action.payload.tabId;
        state.pageUrl = action.payload.pageUrl;
        state.records = action.payload.records;
      })
      .addCase(loadNetworkRecords.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Could not load network records.';
      })
      .addCase(clearNetworkRecords.fulfilled, (state) => {
        state.records = [];
      });
  },
});

async function attachNetworkObservers(tabId: number): Promise<void> {
  await chrome.scripting
    .executeScript({ target: { tabId, allFrames: true }, files: ['assets/networkBridge.js'] })
    .catch(() => undefined);
  await chrome.scripting
    .executeScript({ target: { tabId, allFrames: true }, files: ['assets/networkHook.js'], world: 'MAIN' })
    .catch(() => undefined);
}

async function readObservedRequests(tabId: number): Promise<ObservedRequest[]> {
  try {
    const injections = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: 'MAIN',
      func: collectObservedRequests,
    });
    return injections.flatMap((injection) => (Array.isArray(injection.result) ? injection.result : []));
  } catch {
    return [];
  }
}

export const {
  networkRecordReceived,
  networkTabCleared,
  setNetworkChannel,
  setNetworkSearch,
  setNetworkStatusFilter,
} = networkSlice.actions;
export const networkReducer = networkSlice.reducer;
