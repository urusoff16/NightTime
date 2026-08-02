import { describe, expect, it } from 'vitest';

import { DEFAULT_EXTENSION_SETTINGS } from '../../src/shared/settings-model';
import { resolveEffectiveSettings } from '../../src/shared/settings-resolver';

describe('Night Shift resolver', () => {
  it('can remain active while the dark theme is globally off', () => {
    const result = resolveEffectiveSettings({
      settings: {
        ...DEFAULT_EXTENSION_SETTINGS,
        enabled: false,
        nightShift: { enabled: true, intensity: 42 },
      },
      hostname: 'example.com',
      now: new Date('2026-08-02T22:00:00'),
      systemPrefersDark: false,
      nativeDark: false,
      pageAvailable: true,
    });
    expect(result).toMatchObject({
      enabled: false,
      nightShiftEnabled: true,
      nightShiftIntensity: 42,
    });
  });
});
