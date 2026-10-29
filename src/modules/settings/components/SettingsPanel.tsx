import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setDarkMode,
  setExportPreferences,
  setIncludeApiMonitor,
  setRetryCount,
  setScanDepth,
  setValidationTimeoutMs,
  resetSettings,
} from '../settingsSlice';
import { SCAN_DEPTH_MAX, TIMEOUT_MAX_MS, TIMEOUT_MIN_MS } from '../types';
import { scanDepthLabel } from '../utilities';

export function SettingsPanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const exportPreferences = settings.exportPreferences;

  return (
    <div className="settings-panel">
      <section className="card">
        <header className="card__header">
          <h2>Dark mode</h2>
        </header>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={(event) => dispatch(setDarkMode(event.target.checked))}
          />
          Use dark theme
        </label>
        <p className="page__hint">Current mode: {settings.theme}. Dark mode forces dark. Light and System are available below.</p>
        <ThemeSwitcher />
      </section>

      <section className="card">
        <header className="card__header">
          <h2>Export preferences</h2>
        </header>
        <div className="settings-form">
          <label className="settings-field">
            Default format
            <select
              value={exportPreferences.defaultFormat}
              onChange={(event) =>
                dispatch(setExportPreferences({ defaultFormat: event.target.value as typeof exportPreferences.defaultFormat }))
              }
            >
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel</option>
              <option value="json">JSON</option>
              <option value="html">HTML</option>
            </select>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={exportPreferences.includeLinkErrors}
              onChange={(event) => dispatch(setExportPreferences({ includeLinkErrors: event.target.checked }))}
            />
            Include link errors
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={exportPreferences.includeApiErrors}
              onChange={(event) => dispatch(setExportPreferences({ includeApiErrors: event.target.checked }))}
            />
            Include API errors
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={exportPreferences.includeConsoleErrors}
              onChange={(event) => dispatch(setExportPreferences({ includeConsoleErrors: event.target.checked }))}
            />
            Include console errors
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={exportPreferences.includeSeoResults}
              onChange={(event) => dispatch(setExportPreferences({ includeSeoResults: event.target.checked }))}
            />
            Include SEO results
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={exportPreferences.includePerformanceMetrics}
              onChange={(event) => dispatch(setExportPreferences({ includePerformanceMetrics: event.target.checked }))}
            />
            Include performance metrics
          </label>
        </div>
      </section>

      <section className="card">
        <header className="card__header">
          <h2>Validation</h2>
        </header>
        <div className="settings-form">
          <label className="settings-field">
            Validation timeout
            <input
              type="range"
              min={TIMEOUT_MIN_MS}
              max={TIMEOUT_MAX_MS}
              step={1000}
              value={settings.validationTimeoutMs}
              onChange={(event) => dispatch(setValidationTimeoutMs(Number(event.target.value)))}
            />
            <small>{settings.validationTimeoutMs / 1000} seconds. Used by link, image, and security requests.</small>
          </label>
          <label className="settings-field">
            Retry count
            <input
              type="number"
              min={0}
              max={5}
              value={settings.retryCount}
              onChange={(event) => dispatch(setRetryCount(Number(event.target.value)))}
            />
            <small>Extra attempts after a timed-out or failed request. Range 0–5.</small>
          </label>
          <label className="settings-field">
            Scan depth
            <input
              type="range"
              min={1}
              max={SCAN_DEPTH_MAX}
              step={1}
              value={settings.scanDepth}
              onChange={(event) => dispatch(setScanDepth(Number(event.target.value)))}
            />
            <small>
              {scanDepthLabel(settings.scanDepth)}. Deeper scans follow same-origin HTML links, up to 16 pages.
            </small>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.includeApiMonitor}
              onChange={(event) => dispatch(setIncludeApiMonitor(event.target.checked))}
            />
            Include API call monitoring in page scans
          </label>
        </div>
      </section>

      <section className="card">
        <header className="card__header">
          <h2>Storage</h2>
        </header>
        <p className="page__hint">These settings are saved with Redux Persist in extension storage and shared by the popup and dashboard.</p>
        <button type="button" className="btn" onClick={() => dispatch(resetSettings())}>
          Reset settings
        </button>
      </section>
    </div>
  );
}
