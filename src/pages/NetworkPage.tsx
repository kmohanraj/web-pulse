import { NetworkMonitor } from '@/modules/network';

export function NetworkPage() {
  return (
    <div className="page">
      <section className="page__intro">
        <h2>Network</h2>
        <p>Live Fetch, XHR, and GraphQL traffic for the active tab.</p>
      </section>
      <NetworkMonitor />
    </div>
  );
}
