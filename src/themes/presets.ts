import type { UiLanguage } from '../shared/i18n';
import {
  DEFAULT_THEME_SETTINGS,
  type EngineMode,
  type ExtensionSettings,
  type ThemeSettings,
} from '../shared/settings-model';

export interface ThemePreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  engine: EngineMode;
  theme: Partial<ThemeSettings>;
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'quiet-night',
    name: 'Тихая ночь',
    nameEn: 'Quiet Night',
    description: 'Нейтральный тёмный режим для повседневной работы.',
    descriptionEn: 'A neutral dark mode for everyday work.',
    engine: 'smart',
    theme: { brightness: 96, contrast: 100, warmth: 0, grayscale: 0, dimming: 0 },
  },
  {
    id: 'polar-shadow',
    name: 'Полярная тень',
    nameEn: 'Polar Shadow',
    description: 'Холодный и глубокий профиль с мягким затемнением.',
    descriptionEn: 'A cool, deep profile with gentle dimming.',
    engine: 'smart',
    theme: { brightness: 88, contrast: 108, warmth: 0, grayscale: 0, dimming: 14 },
  },
  {
    id: 'warm-evening',
    name: 'Тёплый вечер',
    nameEn: 'Warm Evening',
    description: 'Меньше синего света для поздней работы.',
    descriptionEn: 'Less blue light for late work.',
    engine: 'smart',
    theme: { brightness: 90, contrast: 98, warmth: 38, grayscale: 0, dimming: 10 },
  },
  {
    id: 'clear-focus',
    name: 'Чёткий фокус',
    nameEn: 'Clear Focus',
    description: 'Больше контраста для текста и таблиц.',
    descriptionEn: 'More contrast for text and tables.',
    engine: 'smart',
    theme: { brightness: 100, contrast: 122, warmth: 0, grayscale: 0, dimming: 0 },
  },
  {
    id: 'abyss',
    name: 'Бездна',
    nameEn: 'Abyss',
    description: 'Максимально тёмный профиль для ярких экранов.',
    descriptionEn: 'A very dark profile for bright screens.',
    engine: 'smart',
    theme: { brightness: 74, contrast: 108, warmth: 0, grayscale: 0, dimming: 38 },
  },
  {
    id: 'moon-indigo',
    name: 'Лунный индиго',
    nameEn: 'Moon Indigo',
    description: 'Глубокая сине-фиолетовая палитра для вечернего чтения.',
    descriptionEn: 'A deep blue-violet palette for evening reading.',
    engine: 'smart',
    theme: {
      brightness: 92,
      contrast: 106,
      warmth: 4,
      grayscale: 0,
      dimming: 7,
      backgroundColor: '#0f1321',
      surfaceColor: '#191e32',
      textColor: '#e6e9f8',
      mutedTextColor: '#a7aec8',
      borderColor: '#343d63',
    },
  },
  {
    id: 'dark-emerald',
    name: 'Тёмный изумруд',
    nameEn: 'Dark Emerald',
    description: 'Спокойная зелёно-графитовая палитра с мягким контрастом.',
    descriptionEn: 'A calm green-charcoal palette with gentle contrast.',
    engine: 'smart',
    theme: {
      brightness: 93,
      contrast: 104,
      warmth: 6,
      grayscale: 0,
      dimming: 6,
      backgroundColor: '#0e1715',
      surfaceColor: '#172420',
      textColor: '#e1eee9',
      mutedTextColor: '#9eb7ad',
      borderColor: '#315047',
    },
  },
];

export function findThemePreset(id: string | null): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}

export function getPresetName(preset: ThemePreset, language: UiLanguage): string {
  return language === 'en' ? preset.nameEn : preset.name;
}

export function getPresetDescription(preset: ThemePreset, language: UiLanguage): string {
  return language === 'en' ? preset.descriptionEn : preset.description;
}

export function resolvePresetTheme(preset: ThemePreset): ThemeSettings {
  return { ...DEFAULT_THEME_SETTINGS, ...preset.theme };
}

export function reconcileActiveThemePreset(settings: ExtensionSettings): ExtensionSettings {
  const preset = findThemePreset(settings.activePresetId);
  if (!preset) return settings;
  return {
    ...settings,
    engine: preset.engine,
    theme: resolvePresetTheme(preset),
  };
}
