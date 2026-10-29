import { SeoReportPanel } from '@/modules/seo';

export function SeoPage() {
  return (
    <div className="page">
      <section className="page__intro">
        <h2>SEO</h2>
        <p>On-page metadata, social tags, and an SEO score for the active page.</p>
      </section>
      <SeoReportPanel />
    </div>
  );
}
