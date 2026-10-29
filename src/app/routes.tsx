import type { ComponentType } from 'react';
import type { ShellPage } from '@/shared/types';
import { AccessibilityPage } from '@/pages/AccessibilityPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ImagesPage } from '@/pages/ImagesPage';
import { NetworkPage } from '@/pages/NetworkPage';
import { PerformancePage } from '@/pages/PerformancePage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SecurityPage } from '@/pages/SecurityPage';
import { SeoPage } from '@/pages/SeoPage';
import { SettingsPage } from '@/pages/SettingsPage';

export const APP_ROUTES: Record<ShellPage, ComponentType> = {
  dashboard: DashboardPage,
  network: NetworkPage,
  images: ImagesPage,
  seo: SeoPage,
  accessibility: AccessibilityPage,
  security: SecurityPage,
  performance: PerformancePage,
  reports: ReportsPage,
  settings: SettingsPage,
};
