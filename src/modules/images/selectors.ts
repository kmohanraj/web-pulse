import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/rootReducer';
import type { ImageIssueCode } from './types';

const ISSUE_CODES: readonly ImageIssueCode[] = ['empty_src', 'missing_alt', 'broken', 'forbidden', 'not_found'];

export const selectImagesState = (state: RootState): RootState['images'] => state.images;

export const selectImageResults = createSelector(selectImagesState, (images) => images.results);

export const selectFilteredImages = createSelector(selectImagesState, (images) => {
  const filter = images.filter;
  if (filter === 'all') {
    return images.results;
  }
  if (filter === 'ok') {
    return images.results.filter((result) => result.status === 'ok');
  }
  return images.results.filter((result) => result.issues.includes(filter));
});

export const selectImageSummary = createSelector(selectImageResults, (results) => {
  const counts = Object.fromEntries(ISSUE_CODES.map((code) => [code, 0])) as Record<ImageIssueCode, number>;
  for (const result of results) {
    for (const issue of result.issues) {
      counts[issue] += 1;
    }
  }
  return {
    total: results.length,
    ok: results.filter((result) => result.status === 'ok').length,
    ...counts,
  };
});
