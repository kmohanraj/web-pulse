import { SecurityReportPanel } from '@/modules/security';

export function SecurityPage() {
  return (
    <div className="page">
      <section className="page__intro">
        <h2>Security</h2>
        <p>Transport, headers, cookies, and frame restrictions for the active page.</p>
      </section>
      <SecurityReportPanel />
    </div>
  );
}
