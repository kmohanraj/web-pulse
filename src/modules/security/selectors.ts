import type { RootState } from '@/store/rootReducer';

export const selectSecurityState = (state: RootState) => state.security;

export const selectSecurityReport = (state: RootState) => state.security.report;

export const selectSecurityScore = (state: RootState) => state.security.report?.score ?? null;

export const selectSecurityChecks = (state: RootState) => state.security.report?.checks ?? [];
