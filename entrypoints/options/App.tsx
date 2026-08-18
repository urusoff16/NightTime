import { useEffect, useRef, useState } from 'react';

import {
  DEFAULT_EXTENSION_SETTINGS,
  type ExtensionSettings,
  type SiteListMode,
} from '../../src/shared/settings-model';
import { resolveUiLanguage, t } from '../../src/shared/i18n';
import { readExtensionSettings, saveExtensionSettings } from '../../src/shared/settings-storage';
import {
  findThemePreset,
  getPresetDescription,
  getPresetName,
  THEME_PRESETS,
} from '../../src/themes/presets';

function normalizeHostname(value: string): string | null {
  const candidate =
    value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0] ?? '';
  return /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(candidate) ? candidate : null;
}

export function App() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_EXTENSION_SETTINGS);
  const [newSite, setNewSite] = useState('');
  const [status, setStatus] = useState('');
  const settingsRef = useRef<ExtensionSettings>(DEFAULT_EXTENSION_SETTINGS);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestSaveIdRef = useRef(0);
  const nightShiftTimerRef = useRef<number | null>(null);
  const language = resolveUiLanguage(settings.language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  function showSettings(next: ExtensionSettings): void {
    settingsRef.current = next;
    setSettings(next);
  }

  useEffect(() => {
    void readExtensionSettings()
      .then((stored) => {
        showSettings(stored);
        setStatus(t('localSettings', resolveUiLanguage(stored.language)));
      })
      .catch(() => {
        setStatus(t('settingsReadError', language));
      });
  }, []);

  async function save(next: ExtensionSettings, message?: string): Promise<void> {
    const saveId = ++latestSaveIdRef.current;
    showSettings(next);
    const operation = saveQueueRef.current.then(async () => {
      const saved = await saveExtensionSettings(next);
      if (saveId === latestSaveIdRef.current) {
        showSettings(saved);
        setStatus(message ?? t('settingsApplied', resolveUiLanguage(saved.language)));
      }
    });
    saveQueueRef.current = operation.catch(() => undefined);
    try {
      await operation;
    } catch {
      if (saveId === latestSaveIdRef.current) {
        setStatus(t('settingsSaveError', resolveUiLanguage(settingsRef.current.language)));
      }
    }
  }

  function addSite(): void {
    const hostname = normalizeHostname(newSite);
    if (!hostname) {
      setStatus(t('enterDomain', language));
      return;
    }
    void save(
      { ...settingsRef.current, siteList: [...settingsRef.current.siteList, hostname] },
      t('siteAdded', language),
    );
    setNewSite('');
  }

  function applyPreset(id: string): void {
    const preset = findThemePreset(id);
    if (!preset) return;
    void save(
      {
        ...settingsRef.current,
        activePresetId: preset.id,
        engine: preset.engine,
        theme: { ...settingsRef.current.theme, ...preset.theme },
      },
      t('profileApplied', language, { name: getPresetName(preset, language) }),
    );
  }

  function updateSchedule(
    patch: Partial<ExtensionSettings['schedule']>,
    message = t('scheduleSaved', resolveUiLanguage(settingsRef.current.language)),
  ): void {
    void save(
      { ...settingsRef.current, schedule: { ...settingsRef.current.schedule, ...patch } },
      message,
    );
  }

  function updateNightShiftIntensity(intensity: number): void {
    showSettings({
      ...settingsRef.current,
      nightShift: { ...settingsRef.current.nightShift, intensity },
    });
    if (nightShiftTimerRef.current !== null) window.clearTimeout(nightShiftTimerRef.current);
    nightShiftTimerRef.current = window.setTimeout(() => {
      nightShiftTimerRef.current = null;
      void save(
        settingsRef.current,
        t('settingsApplied', resolveUiLanguage(settingsRef.current.language)),
      );
    }, 160);
  }

  return (
    <main className="options-shell">
      <header className="options-hero">
        <p className="eyebrow">NightTime</p>
        <h1>{t('settings', language)}</h1>
        <select
          className="options-language-picker"
          aria-label={t('language', language)}
          value={settings.language}
          onChange={(event) => {
            const nextLanguage = event.target.value as ExtensionSettings['language'];
            void save(
              { ...settingsRef.current, language: nextLanguage },
              t('languageChanged', resolveUiLanguage(nextLanguage)),
            );
          }}
        >
          <option value="auto">{t('auto', language)}</option>
          <option value="ru">{t('languageRussian', language)}</option>
          <option value="en">{t('languageEnglish', language)}</option>
        </select>
        <p>{status || t('loadingSettings', language)}</p>
      </header>
      <section className="options-card" aria-labelledby="preset-heading">
        <h2 id="preset-heading">{t('profileHeading', language)}</h2>
        <p>{t('profileDescription', language)}</p>
        <label className="field-label" htmlFor="theme-preset">
          {t('chooseProfile', language)}
        </label>
        <select
          id="theme-preset"
          value={settings.activePresetId ?? ''}
          onChange={(event) => applyPreset(event.target.value)}
        >
          <option value="" disabled>
            {t('chooseVariant', language)}
          </option>
          {THEME_PRESETS.map((preset) => (
            <option value={preset.id} key={preset.id}>
              {getPresetName(preset, language)}
            </option>
          ))}
        </select>
        {findThemePreset(settings.activePresetId) && (
          <p className="preset-description">
            {getPresetDescription(findThemePreset(settings.activePresetId)!, language)}
          </p>
        )}
      </section>
      <section className="options-card" aria-labelledby="schedule-heading">
        <h2 id="schedule-heading">{t('schedule', language)}</h2>
        <p>{t('scheduleDescription', language)}</p>
        <label className="field-label" htmlFor="schedule-mode">
          {t('weekdays', language)}
        </label>
        <select
          id="schedule-mode"
          value={settings.schedule.mode}
          onChange={(event) =>
            updateSchedule(
              {
                mode: event.target.value as ExtensionSettings['schedule']['mode'],
                enabled: event.target.value !== 'off',
              },
              t('scheduleModeSaved', language),
            )
          }
        >
          <option value="off">{t('always', language)}</option>
          <option value="custom-time">{t('customTime', language)}</option>
          <option value="system-theme">{t('systemTheme', language)}</option>
        </select>
        {settings.schedule.mode === 'custom-time' && (
          <div className="time-range">
            <label>
              <span>{t('from', language)}</span>
              <input
                type="time"
                value={settings.schedule.startTime}
                onChange={(event) => updateSchedule({ startTime: event.target.value })}
              />
            </label>
            <label>
              <span>{t('to', language)}</span>
              <input
                type="time"
                value={settings.schedule.endTime}
                onChange={(event) => updateSchedule({ endTime: event.target.value })}
              />
            </label>
          </div>
        )}
      </section>
      <section className="options-card" aria-labelledby="night-shift-heading">
        <h2 id="night-shift-heading">{t('nightShift', language)}</h2>
        <p>{t('nightShiftDescription', language)}</p>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={settings.nightShift.enabled}
            onChange={(event) =>
              void save({
                ...settingsRef.current,
                nightShift: { ...settingsRef.current.nightShift, enabled: event.target.checked },
              })
            }
          />
          <span>{t('enableNightShift', language)}</span>
        </label>
        <label className="field-label" htmlFor="night-shift-intensity">
          {t('lightWarmth', language)}: {settings.nightShift.intensity}%
        </label>
        <input
          className="range-control"
          id="night-shift-intensity"
          type="range"
          min="0"
          max="100"
          value={settings.nightShift.intensity}
          onChange={(event) => updateNightShiftIntensity(Number(event.target.value))}
        />
      </section>
      <section className="options-card" aria-labelledby="list-heading">
        <h2 id="list-heading">{t('siteList', language)}</h2>
        <p>{t('siteListDescription', language)}</p>
        <label className="field-label" htmlFor="site-list-mode">
          {t('siteList', language)}
        </label>
        <select
          id="site-list-mode"
          value={settings.siteListMode}
          onChange={(event) =>
            void save({ ...settingsRef.current, siteListMode: event.target.value as SiteListMode })
          }
        >
          <option value="blacklist">{t('blacklist', language)}</option>
          <option value="whitelist">{t('whitelist', language)}</option>
        </select>
        <div className="add-site">
          <input
            value={newSite}
            onChange={(event) => setNewSite(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && addSite()}
            placeholder="example.com"
            aria-label={t('siteDomain', language)}
          />
          <button type="button" onClick={addSite}>
            {t('add', language)}
          </button>
        </div>
        <ul className="site-list">
          {settings.siteList.map((site) => (
            <li key={site}>
              <span>{site}</span>
              <button
                type="button"
                onClick={() =>
                  void save(
                    {
                      ...settingsRef.current,
                      siteList: settingsRef.current.siteList.filter((item) => item !== site),
                    },
                    t('siteRemoved', language),
                  )
                }
              >
                {t('remove', language)}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="options-card" aria-labelledby="overrides-heading">
        <h2 id="overrides-heading">{t('individualSettings', language)}</h2>
        {Object.keys(settings.siteOverrides).length === 0 ? (
          <p>{t('noOverrides', language)}</p>
        ) : (
          <ul className="site-list">
            {Object.keys(settings.siteOverrides).map((site) => (
              <li key={site}>
                <span>{site}</span>
                <button
                  type="button"
                  onClick={() => {
                    const siteOverrides = { ...settingsRef.current.siteOverrides };
                    delete siteOverrides[site];
                    void save({ ...settingsRef.current, siteOverrides }, t('siteReset', language));
                  }}
                >
                  {t('reset', language)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
