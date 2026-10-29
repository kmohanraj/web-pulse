import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/components/AppProviders';
import App from './App';
import '@/styles/main.scss';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
