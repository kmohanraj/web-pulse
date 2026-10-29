export type LinkKind = 'internal' | 'external' | 'anchor';

export const TRACKED_STATUSES = [200, 301, 302, 403, 404, 500] as const;

export type TrackedStatus = (typeof TRACKED_STATUSES)[number];

export type LinkOutcome = 'ok' | 'redirect' | 'broken' | 'other' | 'unreachable';

export interface CollectedLink {
  href: string;
  url: string;
  text: string;
  kind: LinkKind;
  hash: string;
  anchorFound: boolean | null;
  malformed: boolean;
}

export interface LinkCheckResult {
  id: string;
  href: string;
  url: string;
  text: string;
  kind: LinkKind;
  status: number | null;
  finalStatus: number | null;
  trackedStatus: TrackedStatus | null;
  outcome: LinkOutcome;
  error: string | null;
}

export interface LinkValidationPayload {
  pageUrl: string;
  results: LinkCheckResult[];
  skipped: number;
}

export interface LinksState {
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  pageUrl: string | null;
  results: LinkCheckResult[];
  skipped: number;
}

export interface CollectLinksRequest {
  type: 'WEBPULSE_COLLECT_LINKS';
}

export type CollectLinksResponse =
  | { ok: true; pageUrl: string; links: CollectedLink[] }
  | { ok: false; error: string };
