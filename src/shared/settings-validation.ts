import {
  DEFAULT_EXTENSION_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  type EngineMode,
  type ExtensionSettings,
  type ScheduleMode,
  type SiteListMode,
  type SiteOverride,
  type ThemeSettings,
} from './settings-model';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const ENGINE_MODES: readonly EngineMode[] = ['smart'];
const SCHEDULE_MODES: readonly ScheduleMode[] = ['off', 'custom-time', 'system-theme'];
const LIST_MODES: readonly SiteListMode[] = ['blacklist', 'whitelist'];
const LANGUAGES = ['auto', 'ru', 'en'] as const;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toLowerCase() : fallback;
}

function time(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}

function hostname(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/^\.+/, '');
  return /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(normalized) ? normalized : null;
}

export function normalizeThemeSettings(value: unknown): ThemeSettings {
  const source = record(value);
  return {
    brightness: number(source.brightness, DEFAULT_THEME_SETTINGS.brightness, 50, 120),
    contrast: number(source.contrast, DEFAULT_THEME_SETTINGS.contrast, 50, 150),
    warmth: number(source.warmth, DEFAULT_THEME_SETTINGS.warmth, 0, 100),
    grayscale: number(source.grayscale, DEFAULT_THEME_SETTINGS.grayscale, 0, 100),
    dimming: number(source.dimming, DEFAULT_THEME_SETTINGS.dimming, 0, 80),
    backgroundColor: color(source.backgroundColor, DEFAULT_THEME_SETTINGS.backgroundColor),
    surfaceColor: color(source.surfaceColor, DEFAULT_THEME_SETTINGS.surfaceColor),
    textColor: color(source.textColor, DEFAULT_THEME_SETTINGS.textColor),
    mutedTextColor: color(source.mutedTextColor, DEFAULT_THEME_SETTINGS.mutedTextColor),
    borderColor: color(source.borderColor, DEFAULT_THEME_SETTINGS.borderColor),
  };
}

function normalizeOverride(value: unknown): SiteOverride {
  const source = record(value);
  const theme = normalizeThemeSettings(source.theme);
  const partialTheme = record(source.theme);
  const themeKeys = Object.keys(partialTheme) as Array<keyof ThemeSettings>;
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : null,
    engine: ENGINE_MODES.includes(source.engine as EngineMode)
      ? (source.engine as EngineMode)
      : null,
    respectNativeDark:
      typeof source.respectNativeDark === 'boolean' ? source.respectNativeDark : null,
    theme: Object.fromEntries(themeKeys.map((key) => [key, theme[key]])) as Partial<ThemeSettings>,
    updatedAt: number(source.updatedAt, 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function normalizeExtensionSettings(value: unknown): ExtensionSettings {
  const source = record(value);
  const sourceSchemaVersion = typeof source.schemaVersion === 'number' ? source.schemaVersion : 0;
  const schedule = record(source.schedule);
  const overrides = record(source.siteOverrides);
  const normalizedOverrides = Object.fromEntries(
    Object.entries(overrides)
      .map(([key, item]) => [hostname(key), normalizeOverride(item)] as const)
      .filter((entry): entry is [string, SiteOverride] => entry[0] !== null),
  );

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    enabled: source.enabled === true,
    engine: ENGINE_MODES.includes(source.engine as EngineMode)
      ? (source.engine as EngineMode)
      : DEFAULT_EXTENSION_SETTINGS.engine,
    respectNativeDark:
      sourceSchemaVersion >= SETTINGS_SCHEMA_VERSION &&
      typeof source.respectNativeDark === 'boolean'
        ? source.respectNativeDark
        : DEFAULT_EXTENSION_SETTINGS.respectNativeDark,
    siteListMode: LIST_MODES.includes(source.siteListMode as SiteListMode)
      ? (source.siteListMode as SiteListMode)
      : DEFAULT_EXTENSION_SETTINGS.siteListMode,
    siteList: Array.isArray(source.siteList)
      ? Array.from(
          new Set(source.siteList.map(hostname).filter((item): item is string => item !== null)),
        )
      : [],
    theme: normalizeThemeSettings(source.theme),
    schedule: {
      mode: SCHEDULE_MODES.includes(schedule.mode as ScheduleMode)
        ? (schedule.mode as ScheduleMode)
        : DEFAULT_EXTENSION_SETTINGS.schedule.mode,
      enabled: schedule.enabled === true,
      startTime: time(schedule.startTime, DEFAULT_EXTENSION_SETTINGS.schedule.startTime),
      endTime: time(schedule.endTime, DEFAULT_EXTENSION_SETTINGS.schedule.endTime),
      weekdays: Array.isArray(schedule.weekdays)
        ? Array.from(
            new Set(
              schedule.weekdays.filter(
                (day): day is number => Number.isInteger(day) && day >= 0 && day <= 6,
              ),
            ),
          )
        : DEFAULT_EXTENSION_SETTINGS.schedule.weekdays,
    },
    nightShift: {
      enabled: record(source.nightShift).enabled === true,
      intensity: number(record(source.nightShift).intensity, 35, 0, 100),
    },
    siteOverrides: normalizedOverrides,
    activePresetId: typeof source.activePresetId === 'string' ? source.activePresetId : null,
    language: LANGUAGES.includes(source.language as (typeof LANGUAGES)[number])
      ? (source.language as ExtensionSettings['language'])
      : 'auto',
  };
}

export function parseImportedSettings(json: string): ExtensionSettings {
  return normalizeExtensionSettings(JSON.parse(json) as unknown);
}
