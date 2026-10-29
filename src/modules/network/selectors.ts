import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/rootReducer';
import type { NetworkRecord, NetworkStatusFilter } from './types';

export const selectNetworkState = (state: RootState): RootState['network'] => state.network;

export const selectNetworkRecords = createSelector(selectNetworkState, (network) => network.records);

export const selectFilteredNetworkRecords = createSelector(selectNetworkState, (network) =>
  network.records.filter((record) => matchesChannel(record, network.channel) && matchesStatus(record, network.statusFilter) && matchesSearch(record, network.search)),
);

export const selectNetworkCounts = createSelector(selectNetworkRecords, (records) => ({
  total: records.length,
  fetch: records.filter((record) => record.transport === 'fetch').length,
  xhr: records.filter((record) => record.transport === 'xhr').length,
  graphql: records.filter((record) => record.channel === 'graphql').length,
}));

function matchesChannel(record: NetworkRecord, channel: RootState['network']['channel']): boolean {
  if (channel === 'all') {
    return true;
  }
  if (channel === 'graphql') {
    return record.channel === 'graphql';
  }
  return record.transport === channel;
}

function matchesStatus(record: NetworkRecord, filter: NetworkStatusFilter): boolean {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'failed') {
    return record.status === null || record.status === 0;
  }
  const status = record.status;
  if (status === null) {
    return false;
  }
  const group = Math.floor(status / 100);
  return String(group) + 'xx' === filter;
}

function matchesSearch(record: NetworkRecord, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (query === '') {
    return true;
  }
  const haystack = [record.url, record.method, record.channel, record.operationName ?? '', record.status === null ? 'failed' : String(record.status)]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}
