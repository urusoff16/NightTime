import { describe, expect, it } from 'vitest';

import { DEFAULT_EXTENSION_SETTINGS } from '../../src/shared/settings-model';
import {
  THEME_PRESETS,
  findThemePreset,
  reconcileActiveThemePreset,
} from '../../src/themes/presets';

describe('theme presets', () => {
  it('has unique names and identifiers', () => {
    expect(new Set(THEME_PRESETS.map((preset) => preset.id)).size).toBe(THEME_PRESETS.length);
    expect(new Set(THEME_PRESETS.map((preset) => preset.name)).size).toBe(THEME_PRESETS.length);
  });

  it('finds a preset by identifier', () => {
    expect(findThemePreset('warm-evening')?.name).toBe('Тёплый вечер');
  });

  it('keeps every visual profile on the smart engine', () => {
    expect(THEME_PRESETS.every((preset) => preset.engine === 'smart')).toBe(true);
  });

  it('updates a previously saved Abyss profile to the smart engine', () => {
    const reconciled = reconcileActiveThemePreset({
      ...DEFAULT_EXTENSION_SETTINGS,
      activePresetId: 'abyss',
    });

    expect(reconciled.engine).toBe('smart');
    expect(reconciled.theme.brightness).toBe(74);
  });

  it('does not retain palette colors from the previously selected profile', () => {
    const reconciled = reconcileActiveThemePreset({
      ...DEFAULT_EXTENSION_SETTINGS,
      activePresetId: 'clear-focus',
      theme: {
        ...DEFAULT_EXTENSION_SETTINGS.theme,
        backgroundColor: '#0e1715',
        surfaceColor: '#172420',
        textColor: '#e1eee9',
        mutedTextColor: '#9eb7ad',
        borderColor: '#315047',
      },
    });

    expect(reconciled.theme).toMatchObject({
      backgroundColor: DEFAULT_EXTENSION_SETTINGS.theme.backgroundColor,
      surfaceColor: DEFAULT_EXTENSION_SETTINGS.theme.surfaceColor,
      textColor: DEFAULT_EXTENSION_SETTINGS.theme.textColor,
      mutedTextColor: DEFAULT_EXTENSION_SETTINGS.theme.mutedTextColor,
      borderColor: DEFAULT_EXTENSION_SETTINGS.theme.borderColor,
      brightness: 100,
      contrast: 122,
    });
  });
});
