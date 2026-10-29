import { useEffect, useState } from 'react';
import type { ResolvedTheme } from '@/shared/types';
import { useAppSelector } from '@/store/hooks';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';

/** Resolves the stored theme mode ("system" included) into a concrete light or dark theme. */
export function useResolvedTheme(): ResolvedTheme {
  const mode = useAppSelector((state) => state.settings.theme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent): void => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return mode === 'system' ? systemTheme : mode;
}
