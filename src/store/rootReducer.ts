import { combineReducers } from '@reduxjs/toolkit';
import { integrationReducer } from '@/app/integrationSlice';
import { accessibilityReducer } from '@/modules/accessibility/accessibilitySlice';
import { dashboardReducer } from '@/modules/dashboard/dashboardSlice';
import { healthReducer } from '@/modules/health/healthSlice';
import { imagesReducer } from '@/modules/images/imagesSlice';
import { linksReducer } from '@/modules/links/linksSlice';
import { networkReducer } from '@/modules/network/networkSlice';
import { performanceReducer } from '@/modules/performance/performanceSlice';
import { securityReducer } from '@/modules/security/securitySlice';
import { seoReducer } from '@/modules/seo/seoSlice';
import { reportsReducer } from './slices/reportsSlice';
import { scanReducer } from './slices/scanSlice';
import { settingsReducer } from './slices/settingsSlice';
import { uiReducer } from './slices/uiSlice';

export const rootReducer = combineReducers({
  settings: settingsReducer,
  scan: scanReducer,
  integration: integrationReducer,
  reports: reportsReducer,
  ui: uiReducer,
  dashboard: dashboardReducer,
  health: healthReducer,
  links: linksReducer,
  network: networkReducer,
  images: imagesReducer,
  seo: seoReducer,
  accessibility: accessibilityReducer,
  security: securityReducer,
  performance: performanceReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
