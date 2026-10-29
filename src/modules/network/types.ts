export type NetworkTransport = 'fetch' | 'xhr';

export type NetworkChannel = NetworkTransport | 'graphql';

export type NetworkChannelFilter = 'all' | NetworkChannel;

export type NetworkStatusFilter = 'all' | '2xx' | '3xx' | '4xx' | '5xx' | 'failed';

export interface NetworkRecord {
  id: string;
  pageUrl: string;
  url: string;
  method: string;
  status: number | null;
  durationMs: number;
  requestSize: number;
  responseSize: number;
  channel: NetworkChannel;
  transport: NetworkTransport;
  operationName: string | null;
  startedAt: string;
}

export interface NetworkSizePatch {
  id: string;
  responseSize: number;
}

export interface NetworkQueryResult {
  ok: true;
  tabId: number;
  pageUrl: string | null;
  records: NetworkRecord[];
}

export interface NetworkState {
  tabId: number | null;
  pageUrl: string | null;
  records: NetworkRecord[];
  status: 'idle' | 'loading' | 'watching' | 'failed';
  error: string | null;
  search: string;
  channel: NetworkChannelFilter;
  statusFilter: NetworkStatusFilter;
}

export const NETWORK_MESSAGE_SOURCE = 'webpulse-qa-network';

export interface NetworkPageMessage {
  source: typeof NETWORK_MESSAGE_SOURCE;
  record?: NetworkRecord;
  patch?: NetworkSizePatch;
}
