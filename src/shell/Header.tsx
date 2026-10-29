import { NAV_ITEMS, extensionPageUrl } from '@/navigation/pages';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar } from '@/store/slices/uiSlice';

interface HeaderProps {
  variant: 'popup' | 'page';
}

export function Header({ variant }: HeaderProps) {
  const dispatch = useAppDispatch();
  const activePage = useAppSelector((state) => state.ui.activePage);
  const current = NAV_ITEMS.find((item) => item.id === activePage);

  const embedded = variant === 'popup' && window.parent !== window;

  const openFullPage = (): void => {
    void chrome.tabs.create({ url: extensionPageUrl(activePage) });
  };

  const closePanel = (): void => {
    window.parent.postMessage({ source: 'webpulse-qa', type: 'close-panel' }, '*');
  };

  if (variant === 'popup') {
    return (
      <header className="shell-header shell-header--popup">
        <p className="shell-header__brand">WebPulse QA</p>
        <div className="shell-header__actions">
          <ThemeSwitcher compact />
          <button type="button" className="btn shell-header__expand" onClick={openFullPage}>
            Open
          </button>
          {embedded && (
            <button type="button" className="btn shell-header__close" aria-label="Close panel" onClick={closePanel}>
              Close
            </button>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="shell-header">
      <div className="shell-header__start">
        <button
          type="button"
          className="shell-header__menu"
          aria-label="Toggle navigation"
          onClick={() => dispatch(toggleSidebar())}
        >
          Menu
        </button>
        <div>
          <p className="shell-header__eyebrow">WebPulse QA</p>
          <h1 className="shell-header__title">{current?.label ?? 'Dashboard'}</h1>
        </div>
      </div>
      <div className="shell-header__actions">
        <ThemeSwitcher />
      </div>
    </header>
  );
}
