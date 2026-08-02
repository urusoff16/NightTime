import { describe, expect, it } from 'vitest';

import { DEFAULT_EXTENSION_SETTINGS } from '../../src/shared/settings-model';
import { matchesDomain, resolveEffectiveSettings } from '../../src/shared/settings-resolver';

const activeSettings = {
  ...DEFAULT_EXTENSION_SETTINGS,
  enabled: true,
};

describe('settings resolver', () => {
  it('matches a domain and its subdomains', () => {
    expect(matchesDomain('docs.example.com', 'example.com')).toBe(true);
    expect(matchesDomain('badexample.com', 'example.com')).toBe(false);
  });

  it('gives an explicit site disable priority over the schedule', () => {
    const result = resolveEffectiveSettings({
      settings: {
        ...activeSettings,
        schedule: { ...activeSettings.schedule, mode: 'custom-time', enabled: false },
        siteOverrides: {
          'example.com': {
            enabled: false,
            engine: null,
            respectNativeDark: null,
            invertImages: null,
            theme: {},
            updatedAt: 1,
          },
        },
      },
      hostname: 'example.com',
      now: new Date('2026-08-02T23:00:00'),
      systemPrefersDark: false,
      nativeDark: false,
      pageAvailable: true,
    });
    expect(result.reason).toBe('site-disabled');
  });

  it('supports schedules crossing midnight', () => {
    const result = resolveEffectiveSettings({
      settings: {
        ...activeSettings,
        schedule: {
          mode: 'custom-time',
          enabled: true,
          startTime: '22:00',
          endTime: '07:00',
          weekdays: [0, 1, 2, 3, 4, 5, 6],
        },
      },
      hostname: 'example.com',
      now: new Date('2026-08-02T02:00:00'),
      systemPrefersDark: false,
      nativeDark: false,
      pageAvailable: true,
    });
    expect(result.enabled).toBe(true);
  });
});
