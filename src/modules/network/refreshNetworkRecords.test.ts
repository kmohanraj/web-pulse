import { describe, expect, it } from 'vitest';
import { chooseFreshStatus, mergeNetworkRecords } from './refreshNetworkRecords';
import type { NetworkRecord } from './types';

function record(overrides: Partial<NetworkRecord> = {}): NetworkRecord {
  return {
    id: 'hook-1',
    pageUrl: 'https://example.com/',
    url: 'https://example.com/api',
    method: 'POST',
    status: 201,
    durationMs: 20,
    requestSize: 4,
    responseSize: 8,
    channel: 'fetch',
    transport: 'fetch',
    operationName: null,
    startedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mergeNetworkRecords', () => {
  it('keeps a captured call and does not add a second row for the same URL', () => {
    const merged = mergeNetworkRecords(
      [record()],
      [
        {
          pageUrl: 'https://example.com/',
          url: 'https://example.com/api',
          status: 200,
          durationMs: 10,
          responseSize: 1,
          transport: 'fetch',
          startedAt: '2026-01-01T00:00:01.000Z',
        },
      ],
      'https://example.com/',
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.method).toBe('POST');
  });

  it('adds a call the page already made when the hook did not see it', () => {
    const merged = mergeNetworkRecords(
      [],
      [
        {
          pageUrl: 'https://example.com/',
          url: 'https://example.com/items',
          status: 200,
          durationMs: 12,
          responseSize: 30,
          transport: 'xhr',
          startedAt: '2026-01-01T00:00:02.000Z',
        },
      ],
      'https://example.com/',
    );

    expect(merged[0]).toMatchObject({ url: 'https://example.com/items', method: 'GET', status: 200, transport: 'xhr' });
  });
});

describe('chooseFreshStatus', () => {
  it('keeps a successful page status when the extension check is blocked', () => {
    expect(chooseFreshStatus(200, 401)).toBe(200);
  });

  it('uses a newer successful status', () => {
    expect(chooseFreshStatus(500, 200)).toBe(200);
  });
});
