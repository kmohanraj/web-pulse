import { SettingsPanel } from '@/modules/settings';

export function SettingsPage() {
  return (
    <div className="page">
      <section className="page__intro">
        <h2>Settings</h2>
        <p>Dark mode, export preferences, timeout, retries, and scan depth are stored with Redux Persist.</p>
      </section>
      <SettingsPanel />
    </div>
  );
}
