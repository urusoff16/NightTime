import { describe, expect, it } from 'vitest';

import { DEFAULT_SPIKE_SETTINGS, normalizeSpikeSettings } from '../../src/shared/settings';
import { DEFAULT_EXTENSION_SETTINGS } from '../../src/shared/settings-model';
import { normalizeExtensionSettings } from '../../src/shared/settings-validation';

describe('normalizeSpikeSettings', () => {
  it('uses defaults for invalid data', () => {
    expect(normalizeSpikeSettings('broken')).toEqual(DEFAULT_SPIKE_SETTINGS);
  });

  it('clamps brightness and contrast to permitted ranges', () => {
    expect(normalizeSpikeSettings({ enabled: true, brightness: 200, contrast: 10 })).toEqual({
      enabled: true,
      brightness: 120,
      contrast: 50,
    });
  });

  it('migrates the removed quick mode to smart mode', () => {
    const settings = normalizeExtensionSettings({
      ...DEFAULT_EXTENSION_SETTINGS,
      engine: 'filter',
    });

    expect(settings.engine).toBe('smart');
  });

  it('disables unreliable native-theme detection while migrating schema 1', () => {
    const settings = normalizeExtensionSettings({
      ...DEFAULT_EXTENSION_SETTINGS,
      schemaVersion: 1,
      respectNativeDark: true,
    });

    expect(settings.schemaVersion).toBe(2);
    expect(settings.respectNativeDark).toBe(false);
  });
});
