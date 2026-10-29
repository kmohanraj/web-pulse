import { ModuleStatusList } from '@/components/ModuleStatusList';
import { PageFrame } from '@/components/PageFrame';
import { DashboardView } from '@/modules/dashboard';
import { LinkValidationPanel } from '@/modules/links';
import { ScanPanel } from '@/popup/components/ScanPanel';

export function DashboardPage() {
  return (
    <PageFrame title="Dashboard" description="Health score, module status, and category results for the active page.">
      <ScanPanel />
      <ModuleStatusList />
      <DashboardView />
      <LinkValidationPanel />
    </PageFrame>
  );
}
