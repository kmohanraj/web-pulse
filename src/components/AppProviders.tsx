import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { persistor, store } from '@/store';
import { LoadingState } from './LoadingState';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingState label="Restoring saved settings" />} persistor={persistor}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </PersistGate>
    </Provider>
  );
}
