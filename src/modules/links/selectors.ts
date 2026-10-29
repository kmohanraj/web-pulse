import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/rootReducer';
import { TRACKED_STATUSES } from './types';
import type { TrackedStatus } from './types';

export const selectLinksState = (state: RootState): RootState['links'] => state.links;

export const selectLinkResults = createSelector(selectLinksState, (links) => links.results);

export const selectLinkSummary = createSelector(selectLinkResults, (results) => {
  const byStatus = Object.fromEntries(TRACKED_STATUSES.map((code) => [code, 0])) as Record<TrackedStatus, number>;
  for (const result of results) {
    if (result.trackedStatus !== null) {
      byStatus[result.trackedStatus] += 1;
    }
  }

  return {
    total: results.length,
    internal: results.filter((result) => result.kind === 'internal').length,
    external: results.filter((result) => result.kind === 'external').length,
    anchor: results.filter((result) => result.kind === 'anchor').length,
    byStatus,
  };
});
