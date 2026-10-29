import { createListenerMiddleware } from '@reduxjs/toolkit';
import { recalculateHealthScore } from '@/modules/health/healthSlice';
import type { RootState } from './rootReducer';

const HEALTH_RECALC_ACTIONS = new Set([
  'scan/run/fulfilled',
  'scan/run/rejected',
  'dashboard/clearDashboard',
  'links/validatePage/fulfilled',
  'links/validatePage/rejected',
  'links/clearLinkResults',
  'images/validatePage/fulfilled',
  'images/validatePage/rejected',
  'images/clearImageResults',
  'network/load/fulfilled',
  'network/load/rejected',
  'network/clear/fulfilled',
  'network/networkRecordReceived',
  'network/networkTabCleared',
  'seo/analyzePage/fulfilled',
  'seo/analyzePage/rejected',
  'seo/clearSeoReport',
  'accessibility/analyzePage/fulfilled',
  'accessibility/analyzePage/rejected',
  'accessibility/clearAccessibilityReport',
  'security/analyzePage/fulfilled',
  'security/analyzePage/rejected',
  'security/clearSecurityReport',
  'performance/analyzePage/fulfilled',
  'performance/analyzePage/rejected',
  'performance/clearPerformanceReport',
]);

export const healthListener = createListenerMiddleware<RootState>();

healthListener.startListening({
  predicate: (action) => HEALTH_RECALC_ACTIONS.has(action.type),
  effect: async (_action, api) => {
    await api.dispatch(recalculateHealthScore());
  },
});
