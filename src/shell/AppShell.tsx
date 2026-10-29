import { useEffect } from 'react';
import { AppRouter } from '@/app/AppRouter';
import { useResolvedTheme } from '@/theme/useResolvedTheme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSidebarOpen } from '@/store/slices/uiSlice';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  variant: 'popup' | 'page';
}

export function AppShell({ variant }: AppShellProps) {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const resolvedTheme = useResolvedTheme();
  const isPopup = variant === 'popup';

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  return (
    <div className={`shell shell--${variant}${sidebarOpen ? ' is-sidebar-open' : ''}`}>
      {isPopup && <Header variant="popup" />}
      <Sidebar compact={isPopup} />
      {sidebarOpen && !isPopup && (
        <button
          type="button"
          className="shell__backdrop"
          aria-label="Close navigation"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}
      <div className="shell__main">
        {!isPopup && <Header variant="page" />}
        <div className="shell__content">
          <AppRouter variant={variant} />
        </div>
      </div>
    </div>
  );
}