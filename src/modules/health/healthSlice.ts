import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store/rootReducer';
import { collectHealthInput } from './collectInput';
import { HealthScoreEngine } from './HealthScoreEngine';
import type { HealthScoreResult, HealthScoreState } from './types';

const initialState: HealthScoreState = {
  status: 'idle',
  result: null,
};

export const recalculateHealthScore = createAsyncThunk<HealthScoreResult, void, { state: RootState }>(
  'health/recalculate',
  (_, { getState }) => new HealthScoreEngine().calculate(collectHealthInput(getState())),
);

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    healthScoreCalculated(state, action: PayloadAction<HealthScoreResult>) {
      state.status = 'ready';
      state.result = action.payload;
    },
    clearHealthScore(state) {
      state.status = 'idle';
      state.result = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(recalculateHealthScore.fulfilled, (state, action) => {
      state.status = 'ready';
      state.result = action.payload;
    });
  },
});

export const { healthScoreCalculated, clearHealthScore } = healthSlice.actions;
export const healthReducer = healthSlice.reducer;
