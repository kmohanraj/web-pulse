import { createAsyncThunk, createSlice, type PayloadAction, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit';
import { analyzePageAccessibility } from '@/modules/accessibility/accessibilitySlice';
import { recalculateHealthScore } from '@/modules/health/healthSlice';
import { validatePageImages } from '@/modules/images/imagesSlice';
import { validatePageLinks } from '@/modules/links/linksSlice';
import { loadNetworkRecords } from '@/modules/network/networkSlice';
import { analyzePagePerformance } from '@/modules/performance/performanceSlice';
import { analyzePageSecurity } from '@/modules/security/securitySlice';
import { analyzePageSeo } from '@/modules/seo/seoSlice';
import { runScan } from '@/store/slices/scanSlice';
import type { RootState } from '@/store/rootReducer';

type ScanDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;

interface ScanStep {
  id: string;
  label: string;
  run: (dispatch: ScanDispatch) => Promise<StepResult>;
}

interface StepResult {
  meta?: { requestStatus?: string };
  payload?: unknown;
  error?: { message?: string };
}

export interface ModuleRunError {
  id: string;
  label: string;
  message: string;
}

export interface IntegrationState {
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  current: string | null;
  errors: ModuleRunError[];
}

const initialState: IntegrationState = {
  status: 'idle',
  current: null,
  errors: [],
};

const STEPS: readonly ScanStep[] = [
  { id: 'scan', label: 'Page scan', run: (dispatch) => dispatch(runScan()) },
  { id: 'links', label: 'Links', run: (dispatch) => dispatch(validatePageLinks()) },
  { id: 'apis', label: 'APIs', run: (dispatch) => dispatch(loadNetworkRecords()) },
  { id: 'images', label: 'Images', run: (dispatch) => dispatch(validatePageImages()) },
  { id: 'seo', label: 'SEO', run: (dispatch) => dispatch(analyzePageSeo()) },
  { id: 'accessibility', label: 'Accessibility', run: (dispatch) => dispatch(analyzePageAccessibility()) },
  { id: 'security', label: 'Security', run: (dispatch) => dispatch(analyzePageSecurity()) },
  { id: 'performance', label: 'Performance', run: (dispatch) => dispatch(analyzePagePerformance()) },
];

export const runIntegratedScan = createAsyncThunk<ModuleRunError[], void, { state: RootState; rejectValue: string }>(
  'integration/run',
  async (_, { dispatch, rejectWithValue }) => {
    const errors: ModuleRunError[] = [];
    for (const step of STEPS) {
      dispatch(setIntegrationStep(step.label));
      const action = await step.run(dispatch);
      const message = failureMessage(action);
      if (message) {
        errors.push({ id: step.id, label: step.label, message });
      }
    }
    await dispatch(recalculateHealthScore());
    if (errors.length === STEPS.length) {
      return rejectWithValue(errors.map((item) => `${item.label}: ${item.message}`).join(' '));
    }
    return errors;
  },
);

const integrationSlice = createSlice({
  name: 'integration',
  initialState,
  reducers: {
    setIntegrationStep(state, action: PayloadAction<string>) {
      state.current = action.payload;
    },
    clearIntegrationErrors(state) {
      state.errors = [];
      if (state.status !== 'running') {
        state.status = 'idle';
        state.current = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runIntegratedScan.pending, (state) => {
        state.status = 'running';
        state.current = STEPS[0]?.label ?? null;
        state.errors = [];
      })
      .addCase(runIntegratedScan.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = null;
        state.errors = action.payload;
      })
      .addCase(runIntegratedScan.rejected, (state, action) => {
        state.status = 'failed';
        state.current = null;
        state.errors = [{ id: 'scan', label: 'Full scan', message: action.payload ?? action.error.message ?? 'Full scan failed.' }];
      });
  },
});

export const { clearIntegrationErrors, setIntegrationStep } = integrationSlice.actions;
export const integrationReducer = integrationSlice.reducer;

function failureMessage(action: StepResult): string | null {
  if (action.meta?.requestStatus !== 'rejected') {
    return null;
  }
  if (typeof action.payload === 'string' && action.payload.trim() !== '') {
    return action.payload;
  }
  return action.error?.message ?? 'Module failed.';
}
