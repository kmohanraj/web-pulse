import type { NetworkPageMessage, NetworkRecord, NetworkSizePatch } from '@/modules/network/types';

const NETWORK_MESSAGE_SOURCE = 'webpulse-qa-network';

const BRIDGE_FLAG = '__webpulseNetworkBridge';
const pageWindow = window as Window & { [BRIDGE_FLAG]?: boolean };

if (!pageWindow[BRIDGE_FLAG]) {
  pageWindow[BRIDGE_FLAG] = true;

  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (event.source !== window || !isNetworkMessage(event.data)) {
      return;
    }

    if (event.data.record) {
      void chrome.runtime.sendMessage({ type: 'WEBPULSE_NETWORK_EVENT', record: event.data.record });
      return;
    }

    if (event.data.patch) {
      void chrome.runtime.sendMessage({ type: 'WEBPULSE_NETWORK_PATCH', patch: event.data.patch });
    }
  });
}

function isNetworkMessage(value: unknown): value is NetworkPageMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const message = value as NetworkPageMessage;
  if (message.source !== NETWORK_MESSAGE_SOURCE) {
    return false;
  }
  if (message.record !== undefined && !isRecord(message.record)) {
    return false;
  }
  if (message.patch !== undefined && !isPatch(message.patch)) {
    return false;
  }
  return message.record !== undefined || message.patch !== undefined;
}

function isRecord(value: unknown): value is NetworkRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as NetworkRecord;
  return (
    typeof record.id === 'string' &&
    typeof record.pageUrl === 'string' &&
    typeof record.url === 'string' &&
    typeof record.method === 'string' &&
    (record.channel === 'fetch' || record.channel === 'xhr' || record.channel === 'graphql') &&
    (record.transport === 'fetch' || record.transport === 'xhr')
  );
}

function isPatch(value: unknown): value is NetworkSizePatch {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const patch = value as NetworkSizePatch;
  return typeof patch.id === 'string' && typeof patch.responseSize === 'number';
}
