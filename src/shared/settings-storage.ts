import { DEFAULT_EXTENSION_SETTINGS, type ExtensionSettings } from './settings-model';
import { normalizeExtensionSettings, parseImportedSettings } from './settings-validation';
import { reconcileActiveThemePreset } from '../themes/presets';

export const EXTENSION_SETTINGS_KEY = 'extensionSettings';
const LEGACY_SPIKE_KEY = 'engineSpikeSettings';

function migrateLegacySpike(value: unknown): ExtensionSettings {
  if (value === null || typeof value !== 'object')
    return normalizeExtensionSettings(DEFAULT_EXTENSION_SETTINGS);
  const legacy = value as { enabled?: unknown; brightness?: unknown; contrast?: unknown };
  return normalizeExtensionSettings({
    ...DEFAULT_EXTENSION_SETTINGS,
    enabled: legacy.enabled,
    theme: {
      ...DEFAULT_EXTENSION_SETTINGS.theme,
      brightness: legacy.brightness,
      contrast: legacy.contrast,
    },
  });
}

export async function readExtensionSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get([EXTENSION_SETTINGS_KEY, LEGACY_SPIKE_KEY]);
  const rawSettings = stored[EXTENSION_SETTINGS_KEY];
  const normalized = rawSettings
    ? normalizeExtensionSettings(rawSettings)
    : migrateLegacySpike(stored[LEGACY_SPIKE_KEY]);
  const settings = reconcileActiveThemePreset(normalized);
  if (JSON.stringify(rawSettings) !== JSON.stringify(settings)) {
    await chrome.storage.local.set({ [EXTENSION_SETTINGS_KEY]: settings });
  }
  return settings;
}

export async function saveExtensionSettings(
  settings: ExtensionSettings,
): Promise<ExtensionSettings> {
  const normalized = reconcileActiveThemePreset(normalizeExtensionSettings(settings));
  await chrome.storage.local.set({ [EXTENSION_SETTINGS_KEY]: normalized });
  return normalized;
}

export function exportSettings(settings: ExtensionSettings): string {
  return JSON.stringify(normalizeExtensionSettings(settings), null, 2);
}

export function importSettings(json: string): ExtensionSettings {
  return parseImportedSettings(json);
}
