import type { UiLanguage } from '../shared/i18n';
import type { EngineMode, ExtensionSettings, ThemeSettings } from '../shared/settings-model';

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
    theme: { brightness: 96, contrast: 100, saturation: 90, warmth: 0, dimming: 0 },
  },
  {
    id: 'polar-shadow',
    name: 'Полярная тень',
    nameEn: 'Polar Shadow',
    description: 'Холодный и глубокий профиль с мягким затемнением.',
    descriptionEn: 'A cool, deep profile with gentle dimming.',
    engine: 'smart',
    theme: { brightness: 88, contrast: 108, saturation: 82, warmth: 0, dimming: 14 },
  },
  {
    id: 'warm-evening',
    name: 'Тёплый вечер',
    nameEn: 'Warm Evening',
    description: 'Меньше синего света для поздней работы.',
    descriptionEn: 'Less blue light for late work.',
    engine: 'smart',
    theme: { brightness: 90, contrast: 98, saturation: 84, warmth: 38, dimming: 10 },
  },
  {
    id: 'clear-focus',
    name: 'Чёткий фокус',
    nameEn: 'Clear Focus',
    description: 'Больше контраста для текста и таблиц.',
    descriptionEn: 'More contrast for text and tables.',
    engine: 'smart',
    theme: { brightness: 100, contrast: 122, saturation: 78, warmth: 0, dimming: 0 },
  },
  {
    id: 'abyss',
    name: 'Бездна',
    nameEn: 'Abyss',
    description: 'Максимально тёмный профиль для ярких экранов.',
    descriptionEn: 'A very dark profile for bright screens.',
    engine: 'smart',
    theme: { brightness: 74, contrast: 108, saturation: 68, warmth: 0, dimming: 38 },
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

export function reconcileActiveThemePreset(settings: ExtensionSettings): ExtensionSettings {
  const preset = findThemePreset(settings.activePresetId);
  if (!preset) return settings;
  return {
    ...settings,
    engine: preset.engine,
    theme: { ...settings.theme, ...preset.theme },
  };
}
