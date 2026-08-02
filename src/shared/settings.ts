export interface SmartThemeSettings {
  brightness: number;
  contrast: number;
}

export interface SpikeSettings extends SmartThemeSettings {
  enabled: boolean;
}

export const SPIKE_SETTINGS_KEY = 'engineSpikeSettings';

export const DEFAULT_SPIKE_SETTINGS: Readonly<SpikeSettings> = {
  enabled: false,
  brightness: 100,
  contrast: 100,
};

export const SETTINGS_LIMITS = {
  brightness: { min: 50, max: 120 },
  contrast: { min: 50, max: 150 },
} as const;

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeSpikeSettings(value: unknown): SpikeSettings {
  const candidate = value !== null && typeof value === 'object' ? value : {};
  const source = candidate as Partial<SpikeSettings>;

  return {
    enabled: source.enabled === true,
    brightness: clamp(
      source.brightness,
      SETTINGS_LIMITS.brightness.min,
      SETTINGS_LIMITS.brightness.max,
      DEFAULT_SPIKE_SETTINGS.brightness,
    ),
    contrast: clamp(
      source.contrast,
      SETTINGS_LIMITS.contrast.min,
      SETTINGS_LIMITS.contrast.max,
      DEFAULT_SPIKE_SETTINGS.contrast,
    ),
  };
}

export async function readSpikeSettings(): Promise<SpikeSettings> {
  const settings = await readExtensionSettings();
  return {
    enabled: settings.enabled,
    brightness: settings.theme.brightness,
    contrast: settings.theme.contrast,
  };
}

export async function saveSpikeSettings(settings: SpikeSettings): Promise<SpikeSettings> {
  const normalized = normalizeSpikeSettings(settings);
  const current = await readExtensionSettings();
  await saveExtensionSettings({
    ...current,
    enabled: normalized.enabled,
    theme: {
      ...current.theme,
      brightness: normalized.brightness,
      contrast: normalized.contrast,
    },
  });
  return normalized;
}
import { readExtensionSettings, saveExtensionSettings } from './settings-storage';
