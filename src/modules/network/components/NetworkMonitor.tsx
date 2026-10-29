import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearNetworkRecords,
  loadNetworkRecords,
  networkRecordReceived,
  networkTabCleared,
  setNetworkChannel,
  setNetworkSearch,
  setNetworkStatusFilter,
} from '../networkSlice';
import { selectFilteredNetworkRecords, selectNetworkCounts, selectNetworkState } from '../selectors';
import type { NetworkChannelFilter, NetworkRecord, NetworkStatusFilter } from '../types';

const CHANNELS: ReadonlyArray<{ id: NetworkChannelFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'fetch', label: 'Fetch' },
  { id: 'xhr', label: 'XHR' },
  { id: 'graphql', label: 'GraphQL' },
];

const STATUSES: ReadonlyArray<{ id: NetworkStatusFilter; label: string }> = [
  { id: 'all', label: 'Any status' },
  { id: '2xx', label: '2xx' },
  { id: '3xx', label: '3xx' },
  { id: '4xx', label: '4xx' },
  { id: '5xx', label: '5xx' },
  { id: 'failed', label: 'Failed' },
];

export function NetworkMonitor() {
  const dispatch = useAppDispatch();
  const { status, error, pageUrl, search, channel, statusFilter, tabId } = useAppSelector(selectNetworkState);
  const records = useAppSelector(selectFilteredNetworkRecords);
  const counts = useAppSelector(selectNetworkCounts);

  useEffect(() => {
    void dispatch(loadNetworkRecords());

    const onMessage = (message: unknown): void => {
      if (!isObject(message)) {
        return;
      }
      if (message.type === 'WEBPULSE_NETWORK_UPDATED' && typeof message.tabId === 'number' && isRecord(message.record)) {
        dispatch(networkRecordReceived({ tabId: message.tabId, record: message.record }));
      }
      if (message.type === 'WEBPULSE_NETWORK_CLEARED' && typeof message.tabId === 'number') {
        dispatch(networkTabCleared(message.tabId));
        void dispatch(loadNetworkRecords());
      }
    };

    const onActivated = (): void => {
      void dispatch(loadNetworkRecords());
    };

    chrome.runtime.onMessage.addListener(onMessage);
    chrome.tabs.onActivated.addListener(onActivated);
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
      chrome.tabs.onActivated.removeListener(onActivated);
    };
  }, [dispatch]);

  return (
    <section className="card network-monitor" aria-labelledby="network-monitor-title">
      <header className="card__header">
        <h2 id="network-monitor-title">Network monitor</h2>
      </header>
      <p className="network-monitor__hint">
        Reads Fetch and XHR calls already made on the open page, then checks GET calls again. A page reload is not required.
      </p>
      {pageUrl && <p className="network-monitor__page">{pageUrl}</p>}

      <div className="network-monitor__toolbar">
        <input
          className="network-monitor__search"
          type="search"
          value={search}
          placeholder="Search URL, method, status, or operation"
          aria-label="Search network calls"
          onChange={(event) => dispatch(setNetworkSearch(event.target.value))}
        />
        <button type="button" className="btn" disabled={tabId === null} onClick={() => void dispatch(loadNetworkRecords())}>
          Refresh
        </button>
        <button type="button" className="btn" disabled={counts.total === 0} onClick={() => void dispatch(clearNetworkRecords())}>
          Clear
        </button>
      </div>

      <div className="link-filters" role="toolbar" aria-label="Filter by API type">
        {CHANNELS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`link-filters__button${channel === item.id ? ' is-active' : ''}`}
            aria-pressed={channel === item.id}
            onClick={() => dispatch(setNetworkChannel(item.id))}
          >
            {item.label}
            {item.id === 'all' ? ` ${counts.total}` : ''}
          </button>
        ))}
      </div>
      <div className="link-filters" role="toolbar" aria-label="Filter by status">
        {STATUSES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`link-filters__button${statusFilter === item.id ? ' is-active' : ''}`}
            aria-pressed={statusFilter === item.id}
            onClick={() => dispatch(setNetworkStatusFilter(item.id))}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      {status === 'loading' && counts.total === 0 && <p className="network-monitor__hint">Loading captured calls...</p>}
      {status !== 'loading' && counts.total === 0 && (
        <p className="network-monitor__hint">No calls found yet. Use the page, then run the scan again. A reload is not required.</p>
      )}
      {counts.total > 0 && (
        <div className="stats-grid">
          <Stat label="Total" value={counts.total} />
          <Stat label="Fetch" value={counts.fetch} />
          <Stat label="XHR" value={counts.xhr} />
          <Stat label="GraphQL" value={counts.graphql} />
        </div>
      )}
      {counts.total > 0 && <NetworkTable records={records} />}
    </section>
  );
}

function NetworkTable({ records }: { records: NetworkRecord[] }) {
  if (records.length === 0) {
    return <p className="link-table__empty">No calls match this filter.</p>;
  }

  return (
    <div className="link-table-wrap">
      <table className="link-table network-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Method</th>
            <th>Status</th>
            <th>URL</th>
            <th>Duration</th>
            <th>Request</th>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.channel}</td>
              <td>{record.method}</td>
              <td>{record.status ?? 'failed'}</td>
              <td>
                <span className="link-table__text">{record.operationName ?? record.method}</span>
                <code className="link-table__url">{record.url}</code>
              </td>
              <td>{formatDuration(record.durationMs)}</td>
              <td>{formatBytes(record.requestSize)}</td>
              <td>{formatBytes(record.responseSize)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isRecord(value: unknown): value is NetworkRecord {
  return typeof value === 'object' && value !== null && typeof (value as NetworkRecord).id === 'string';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
