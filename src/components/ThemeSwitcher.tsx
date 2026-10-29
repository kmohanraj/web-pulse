import type { ThemeMode } from '@/shared/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme } from '@/store/slices/settingsSlice';

const THEME_OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

interface ThemeSwitcherProps {
  compact?: boolean;
}

export function ThemeSwitcher({ compact = false }: ThemeSwitcherProps) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.settings.theme);

  return (
    <div className={`theme-switcher${compact ? ' theme-switcher--compact' : ''}`} role="radiogroup" aria-label="Theme">
      {THEME_OPTIONS.map((option) => {
        const isActive = option.value === theme;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`theme-switcher__option${isActive ? ' is-active' : ''}`}
            onClick={() => dispatch(setTheme(option.value))}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
