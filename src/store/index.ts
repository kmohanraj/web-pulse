import { configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  createMigrate,
  persistReducer,
  persistStore,
  type PersistedState,
} from 'redux-persist';
import { normalizeSettings } from '@/modules/settings/utilities';
import { healthListener } from './healthListener';
import { rootReducer } from './rootReducer';
import { chromeStorage } from './storage';

const migrations = {
  2: (state: PersistedState): PersistedState => {
    if (!state || typeof state !== 'object') {
      return state;
    }
    const current = state as PersistedState & { settings?: unknown };
    const migrated = {
      ...current,
      settings: normalizeSettings(current.settings),
    };
    return migrated as PersistedState;
  },
};

const persistConfig = {
  key: 'webpulse-qa',
  version: 2,
  storage: chromeStorage,
  whitelist: ['settings', 'reports'],
  migrate: createMigrate(migrations),
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).prepend(healthListener.middleware),
});

export const persistor = persistStore(store);

export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
export type { RootState } from './rootReducer';
