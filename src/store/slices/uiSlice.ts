import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { pageFromHash } from '@/navigation/pages';
import type { ShellPage } from '@/shared/types';

export interface UiState {
  activePage: ShellPage;
  sidebarOpen: boolean;
}

const initialState: UiState = {
  activePage: typeof window === 'undefined' ? 'dashboard' : pageFromHash(window.location.hash),
  sidebarOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActivePage(state, action: PayloadAction<ShellPage>) {
      state.activePage = action.payload;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const { setActivePage, setSidebarOpen, toggleSidebar } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
