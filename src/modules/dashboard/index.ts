export { DashboardView } from './components/DashboardView';
export { dashboardReducer, selectCategory, clearDashboard } from './dashboardSlice';
export {
  selectCategoryCards,
  selectDashboardSnapshot,
  selectHealthScore,
  selectSelectedCategory,
  selectTotalIssues,
  selectTotalWarnings,
  selectValidationStatus,
} from './selectors';
export { buildDashboardSnapshot, emptyDashboardSnapshot, statusLabel } from './snapshot';
export type {
  CategoryCardModel,
  DashboardCategoryId,
  DashboardSnapshot,
  DashboardState,
  ValidationStatus,
} from './types';
