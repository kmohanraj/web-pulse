import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode } from '@/shared/types';
import {
  DEFAULT_SETTINGS,
  RETRY_MAX,
  RETRY_MIN,
  SCAN_DEPTH_MAX,
  SCAN_DEPTH_MIN,
  TIMEOUT_MAX_MS,
  TIMEOUT_MIN_MS,
  type ExportPreferences,
  type SettingsState,
} from './types';
import { clampInteger, normalizeExportPreferences, normalizeSettings } from './utilities';

const initialState: SettingsState = DEFAULT_SETTINGS;

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
      state.darkMode = action.payload === 'dark';
    },
    setDarkMode(state, action: PayloadAction<boolean>) {
      state.darkMode = action.payload;
      state.theme = action.payload ? 'dark' : 'light';
    },
    setIncludeApiMonitor(state, action: PayloadAction<boolean>) {
      state.includeApiMonitor = action.payload;
    },
    setExportPreferences(state, action: PayloadAction<Partial<ExportPreferences>>) {
      state.exportPreferences = normalizeExportPreferences({ ...state.exportPreferences, ...action.payload });
    },
    setValidationTimeoutMs(state, action: PayloadAction<number>) {
      state.validationTimeoutMs = clampInteger(action.payload, TIMEOUT_MIN_MS, TIMEOUT_MAX_MS, state.validationTimeoutMs);
    },
    setRetryCount(state, action: PayloadAction<number>) {
      state.retryCount = clampInteger(action.payload, RETRY_MIN, RETRY_MAX, state.retryCount);
    },
    setScanDepth(state, action: PayloadAction<number>) {
      state.scanDepth = clampInteger(action.payload, SCAN_DEPTH_MIN, SCAN_DEPTH_MAX, state.scanDepth);
    },
    replaceSettings(state, action: PayloadAction<unknown>) {
      return normalizeSettings({ ...state, ...(isRecord(action.payload) ? action.payload : {}) });
    },
    resetSettings() {
      return DEFAULT_SETTINGS;
    },
  },
});

export const {
  setTheme,
  setDarkMode,
  setIncludeApiMonitor,
  setExportPreferences,
  setValidationTimeoutMs,
  setRetryCount,
  setScanDepth,
  replaceSettings,
  resetSettings,
} = settingsSlice.actions;

export const settingsReducer = settingsSlice.reducer;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
