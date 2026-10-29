import type { RootState } from '@/store/rootReducer';
import type { ExportPreferences, SettingsState, ValidationPolicy } from './types';
import { validationPolicyFrom } from './utilities';

export const selectSettings = (state: RootState): SettingsState => state.settings;

export const selectDarkMode = (state: RootState): boolean => state.settings.darkMode;

export const selectExportPreferences = (state: RootState): ExportPreferences => state.settings.exportPreferences;

export const selectValidationPolicy = (state: Pick<RootState, 'settings'>): ValidationPolicy =>
  validationPolicyFrom(state.settings);
