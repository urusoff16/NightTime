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
});
