export type EngineMode = 'smart';
export type SiteListMode = 'blacklist' | 'whitelist';
export type ScheduleMode = 'off' | 'custom-time' | 'system-theme';

export interface ThemeSettings {
  brightness: number;
  contrast: number;
  warmth: number;
  grayscale: number;
  dimming: number;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
}

export interface ScheduleSettings {
  mode: ScheduleMode;
  enabled: boolean;
  startTime: string;
  endTime: string;
  weekdays: number[];
}

export interface NightShiftSettings {
  enabled: boolean;
  intensity: number;
}

export interface SiteOverride {
  enabled: boolean | null;
  engine: EngineMode | null;
  respectNativeDark: boolean | null;
  theme: Partial<ThemeSettings>;
  updatedAt: number;
}

export interface ExtensionSettings {
  schemaVersion: 2;
  enabled: boolean;
  engine: EngineMode;
  respectNativeDark: boolean;
  siteListMode: SiteListMode;
  siteList: string[];
  theme: ThemeSettings;
  schedule: ScheduleSettings;
  nightShift: NightShiftSettings;
  siteOverrides: Record<string, SiteOverride>;
  activePresetId: string | null;
  language: 'auto' | 'ru' | 'en';
}

export const SETTINGS_SCHEMA_VERSION = 2 as const;

export const DEFAULT_THEME_SETTINGS: Readonly<ThemeSettings> = {
  brightness: 100,
  contrast: 100,
  warmth: 0,
  grayscale: 0,
  dimming: 0,
  backgroundColor: '#16181d',
  surfaceColor: '#1e2230',
  textColor: '#e8edf5',
  mutedTextColor: '#aeb8c8',
  borderColor: '#414b60',
};

export const DEFAULT_EXTENSION_SETTINGS: Readonly<ExtensionSettings> = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  enabled: false,
  engine: 'smart',
  respectNativeDark: false,
  siteListMode: 'blacklist',
  siteList: [],
  theme: DEFAULT_THEME_SETTINGS,
  schedule: {
    mode: 'off',
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
  },
  nightShift: {
    enabled: false,
    intensity: 35,
  },
  siteOverrides: {},
  activePresetId: null,
  language: 'auto',
};
