import { useEffect, useState } from 'react';
import { hashForPage, isShellPage, pageFromHash } from '@/navigation/pages';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActivePage } from '@/store/slices/uiSlice';
import { ErrorState } from '@/components/ErrorState';
import { APP_ROUTES } from './routes';

interface AppRouterProps {
  variant: 'popup' | 'page';
}

export function AppRouter({ variant }: AppRouterProps) {
  const dispatch = useAppDispatch();
  const activePage = useAppSelector((state) => state.ui.activePage);
  const [unknownHash, setUnknownHash] = useState<string | null>(null);
  const Page = APP_ROUTES[activePage];

  useEffect(() => {
    if (variant === 'popup') {
      return;
    }

    const syncFromHash = (): void => {
      const hash = window.location.hash;
      const id = hash.replace(/^#\/?/, '').split(/[?#]/)[0] ?? '';
      if (id !== '' && !isShellPage(id)) {
        setUnknownHash(hash);
        dispatch(setActivePage('dashboard'));
        return;
      }
      setUnknownHash(null);
      dispatch(setActivePage(pageFromHash(hash)));
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [dispatch, variant]);

  useEffect(() => {
    if (variant === 'popup' || unknownHash) {
      return;
    }
    const next = hashForPage(activePage);
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [activePage, unknownHash, variant]);

  if (unknownHash) {
    return (
      <ErrorState
        title="Unknown page"
        message={`${unknownHash} is not a WebPulse QA route.`}
        onRetry={() => {
          setUnknownHash(null);
          dispatch(setActivePage('dashboard'));
          if (variant === 'page') {
            window.history.replaceState(null, '', hashForPage('dashboard'));
          }
        }}
      />
    );
  }

  return <Page />;
}
