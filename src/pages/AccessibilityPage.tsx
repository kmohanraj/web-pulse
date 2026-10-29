import { AccessibilityReportPanel } from '@/modules/accessibility';

export function AccessibilityPage() {
  return (
    <div className="page">
      <section className="page__intro">
        <h2>Accessibility</h2>
        <p>Labels, alt text, headings, ARIA, buttons, and anchors for the active page.</p>
      </section>
      <AccessibilityReportPanel />
    </div>
  );
}
