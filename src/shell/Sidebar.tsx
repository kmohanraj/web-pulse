import { NAV_ITEMS } from '@/navigation/pages';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActivePage, setSidebarOpen } from '@/store/slices/uiSlice';

interface SidebarProps {
  compact?: boolean;
}

export function Sidebar({ compact = false }: SidebarProps) {
  const dispatch = useAppDispatch();
  const activePage = useAppSelector((state) => state.ui.activePage);
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <aside
      className={`sidebar${sidebarOpen ? ' is-open' : ''}${compact ? ' sidebar--compact' : ''}`}
      aria-label="Primary"
    >
      <p className="sidebar__brand">
        <span>WebPulse</span>
        {!compact && sidebarOpen && <small>QA</small>}
      </p>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activePage;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar__link${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              title={item.description}
              onClick={() => {
                dispatch(setActivePage(item.id));
                dispatch(setSidebarOpen(false));
              }}
            >
              <span className="sidebar__label">{item.label}</span>
              {!compact && sidebarOpen && <span className="sidebar__hint">{item.description}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
