import { useEffect, useRef, useState } from 'react';

import type { ContentCommand, ContentState, MessageResult } from '../../src/shared/messages';
import {
  DEFAULT_EXTENSION_SETTINGS,
  type ExtensionSettings,
  type SiteOverride,
} from '../../src/shared/settings-model';
import { resolveUiLanguage, t } from '../../src/shared/i18n';
import { readExtensionSettings, saveExtensionSettings } from '../../src/shared/settings-storage';
import {
  findThemePreset,
  getPresetName,
  resolvePresetTheme,
  THEME_PRESETS,
} from '../../src/themes/presets';

type PopupStatus = 'ready' | 'working' | 'error';

async function getActiveHostname(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.url) return null;
  try {
    const url = new URL(tab.url);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.hostname : null;
  } catch {
    return null;
  }
}

async function refreshActiveTab(): Promise<MessageResult<ContentState>> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id === undefined || !tab.url?.match(/^https?:\/\//i)) {
    return { ok: true };
  }
  return chrome.tabs.sendMessage(tab.id, {
    type: 'NIGHT_MODE_REFRESH_SETTINGS',
  } satisfies ContentCommand) as Promise<MessageResult<ContentState>>;
}

function emptyOverride(): SiteOverride {
  return {
    enabled: null,
    engine: null,
    respectNativeDark: null,
    theme: {},
    updatedAt: 0,
  };
}

export function App() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_EXTENSION_SETTINGS);
  const [hostname, setHostname] = useState<string | null>(null);
  const [status, setStatus] = useState<PopupStatus>('working');
  const [statusText, setStatusText] = useState('');
  const settingsRef = useRef<ExtensionSettings>(DEFAULT_EXTENSION_SETTINGS);
  const applyQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestApplyIdRef = useRef(0);
  const brightnessTimerRef = useRef<number | null>(null);

  function showSettings(next: ExtensionSettings): void {
    settingsRef.current = next;
    setSettings(next);
  }

  const language = resolveUiLanguage(settings.language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    void Promise.all([readExtensionSettings(), getActiveHostname()])
      .then(([stored, host]) => {
        showSettings(stored);
        setHostname(host);
        setStatus('ready');
        setStatusText(
          t(stored.enabled ? 'nightModeOn' : 'nightModeOff', resolveUiLanguage(stored.language)),
        );
      })
      .catch(() => {
        setStatus('error');
        setStatusText(t('settingsReadError', language));
      });
  }, []);

  async function apply(next: ExtensionSettings, message: string): Promise<void> {
    const applyId = ++latestApplyIdRef.current;
    showSettings(next);
    setStatus('working');
    const operation = applyQueueRef.current.then(async () => {
      const saved = await saveExtensionSettings(next);
      let result: MessageResult<ContentState>;
      try {
        result = await refreshActiveTab();
      } catch {
        throw new Error(t('tabRefreshError', resolveUiLanguage(settingsRef.current.language)));
      }
      if (!result.ok) throw new Error(result.error?.message ?? t('unknownError', language));
      if (applyId === latestApplyIdRef.current) {
        showSettings(saved);
        setStatus('ready');
        setStatusText(message);
      }
    });
    applyQueueRef.current = operation.catch(() => undefined);
    try {
      await operation;
    } catch (error) {
      if (applyId === latestApplyIdRef.current) {
        setStatus('error');
        setStatusText(error instanceof Error ? error.message : t('unknownError', language));
      }
    }
  }

  function applyPreset(id: string): void {
    const preset = findThemePreset(id);
    if (!preset) return;
    void apply(
      {
        ...settingsRef.current,
        activePresetId: preset.id,
        engine: preset.engine,
        theme: resolvePresetTheme(preset),
      },
      t('profileApplied', language, { name: getPresetName(preset, language) }),
    );
  }

  function updateBrightness(value: number): void {
    const current = settingsRef.current;
    showSettings({
      ...current,
      activePresetId: null,
      theme: { ...current.theme, brightness: value },
    });
    setStatus('ready');
    setStatusText(`${t('brightness', resolveUiLanguage(current.language))}: ${value}%`);
    if (brightnessTimerRef.current !== null) window.clearTimeout(brightnessTimerRef.current);
    brightnessTimerRef.current = window.setTimeout(() => {
      brightnessTimerRef.current = null;
      void apply(
        settingsRef.current,
        t('brightnessApplied', resolveUiLanguage(settingsRef.current.language)),
      );
    }, 160);
  }

  function commitBrightness(): void {
    if (brightnessTimerRef.current === null) return;
    window.clearTimeout(brightnessTimerRef.current);
    brightnessTimerRef.current = null;
    void apply(
      settingsRef.current,
      t('brightnessApplied', resolveUiLanguage(settingsRef.current.language)),
    );
  }

  const override = hostname
    ? (settings.siteOverrides[hostname] ?? emptyOverride())
    : emptyOverride();
  const siteMode =
    override.enabled === true ? 'on' : override.enabled === false ? 'off' : 'inherit';
  const hasSiteOverride = hostname ? settings.siteOverrides[hostname] !== undefined : false;

  return (
    <main className="popup-shell" aria-busy={status === 'working'}>
      <header>
        <p className="eyebrow">
          NightTime
          <span className="version">v{chrome.runtime.getManifest().version}</span>
        </p>
        <h1>{t('comfort', language)}</h1>
        <select
          className="language-picker"
          aria-label={t('language', language)}
          value={settings.language}
          disabled={status === 'working'}
          onChange={(event) => {
            const nextLanguage = event.target.value as ExtensionSettings['language'];
            void apply(
              { ...settingsRef.current, language: nextLanguage },
              t('languageChanged', resolveUiLanguage(nextLanguage)),
            );
          }}
        >
          <option value="auto">{t('auto', language)}</option>
          <option value="ru">{t('languageRussian', language)}</option>
          <option value="en">{t('languageEnglish', language)}</option>
        </select>
        <p className={`status status--${status}`} role="status">
          {statusText || t('loadingSettings', language)}
        </p>
      </header>

      <button
        className={`toggle ${settings.enabled ? 'toggle--on' : ''}`}
        type="button"
        onClick={() =>
          void apply(
            { ...settingsRef.current, enabled: !settingsRef.current.enabled },
            t(settingsRef.current.enabled ? 'nightModeOff' : 'nightModeOn', language),
          )
        }
        disabled={status === 'working'}
        aria-pressed={settings.enabled}
      >
        <span className="toggle__indicator" aria-hidden="true" />
        {settings.enabled ? t('turnOff', language) : t('enableNightMode', language)}
      </button>

      <section className="controls" aria-label={t('settings', language)}>
        <label htmlFor="preset">
          <span>{t('profile', language)}</span>
        </label>
        <select
          id="preset"
          value={settings.activePresetId ?? ''}
          onChange={(event) => applyPreset(event.target.value)}
          disabled={status === 'working'}
        >
          <option value="" disabled>
            {t('chooseProfile', language)}
          </option>
          {THEME_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {getPresetName(preset, language)}
            </option>
          ))}
        </select>
        <label htmlFor="brightness">
          <span>{t('brightness', language)}</span>
          <output>{settings.theme.brightness}%</output>
        </label>
        <input
          id="brightness"
          type="range"
          min="50"
          max="120"
          value={settings.theme.brightness}
          onChange={(event) => updateBrightness(Number(event.target.value))}
          onPointerUp={commitBrightness}
          onKeyUp={commitBrightness}
          onBlur={commitBrightness}
        />
      </section>

      <section className="site-card" aria-label={t('site', language)}>
        <div>
          <span className="site-card__label">{t('site', language)}</span>
          <strong>{hostname ?? t('unavailable', language)}</strong>
        </div>
        <label className="site-mode">
          <span>{t('enableOnSite', language)}</span>
          <select
            value={siteMode}
            disabled={!hostname || status === 'working'}
            onChange={(event) => {
              if (!hostname) return;
              const mode = event.target.value as 'inherit' | 'on' | 'off';
              const enabled = mode === 'inherit' ? null : mode === 'on';
              const messageKey =
                mode === 'inherit'
                  ? 'siteFollowRules'
                  : mode === 'on'
                    ? 'siteEnabled'
                    : 'siteDisabled';
              void apply(
                {
                  ...settingsRef.current,
                  siteOverrides: {
                    ...settingsRef.current.siteOverrides,
                    [hostname]: { ...override, enabled, updatedAt: Date.now() },
                  },
                },
                t(messageKey, language),
              );
            }}
          >
            <option value="inherit">{t('siteFollowRules', language)}</option>
            <option value="on">{t('siteForceOn', language)}</option>
            <option value="off">{t('siteForceOff', language)}</option>
          </select>
        </label>
        {hasSiteOverride && (
          <button
            className="site-reset"
            type="button"
            disabled={status === 'working'}
            onClick={() => {
              if (!hostname) return;
              const siteOverrides = { ...settingsRef.current.siteOverrides };
              delete siteOverrides[hostname];
              void apply({ ...settingsRef.current, siteOverrides }, t('siteReset', language));
            }}
          >
            {t('reset', language)}
          </button>
        )}
      </section>
    </main>
  );
}
