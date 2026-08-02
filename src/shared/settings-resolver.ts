import type { EngineMode, ExtensionSettings, ThemeSettings } from './settings-model';

export type ResolutionReason =
  | 'page-unavailable'
  | 'globally-disabled'
  | 'site-list'
  | 'site-disabled'
  | 'schedule'
  | 'native-dark'
  | 'enabled';

export interface ResolveContext {
  settings: ExtensionSettings;
  hostname: string;
  now: Date;
  systemPrefersDark: boolean;
  nativeDark: boolean;
  pageAvailable: boolean;
}

export interface EffectiveSettings {
  enabled: boolean;
  nightShiftEnabled: boolean;
  nightShiftIntensity: number;
  engine: EngineMode;
  theme: ThemeSettings;
  reason: ResolutionReason;
}

export function matchesDomain(hostname: string, rule: string): boolean {
  const host = hostname.toLowerCase();
  const normalizedRule = rule.toLowerCase();
  return host === normalizedRule || host.endsWith(`.${normalizedRule}`);
}

function isScheduleActive(context: ResolveContext): boolean {
  const { schedule } = context.settings;
  if (schedule.mode === 'off') return true;
  if (schedule.mode === 'system-theme') return schedule.enabled && context.systemPrefersDark;
  if (!schedule.enabled || !schedule.weekdays.includes(context.now.getDay())) return false;
  const toMinutes = (value: string): number => {
    const [hours = '0', minutes = '0'] = value.split(':');
    return Number(hours) * 60 + Number(minutes);
  };
  const nowMinutes = context.now.getHours() * 60 + context.now.getMinutes();
  const startMinutes = toMinutes(schedule.startTime);
  const endMinutes = toMinutes(schedule.endTime);
  return startMinutes <= endMinutes
    ? nowMinutes >= startMinutes && nowMinutes < endMinutes
    : nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export function resolveEffectiveSettings(context: ResolveContext): EffectiveSettings {
  const { settings, hostname } = context;
  const fallback = (reason: ResolutionReason): EffectiveSettings => ({
    enabled: false,
    nightShiftEnabled: false,
    nightShiftIntensity: 0,
    engine: settings.engine,
    theme: settings.theme,
    reason,
  });
  if (!context.pageAvailable) return fallback('page-unavailable');
  const listed = settings.siteList.some((rule) => matchesDomain(hostname, rule));
  if (
    (settings.siteListMode === 'blacklist' && listed) ||
    (settings.siteListMode === 'whitelist' && !listed)
  ) {
    return fallback('site-list');
  }

  const override = Object.entries(settings.siteOverrides).find(([rule]) =>
    matchesDomain(hostname, rule),
  )?.[1];
  if (override?.enabled === false) return fallback('site-disabled');
  if (!isScheduleActive(context)) return fallback('schedule');

  const respectNativeDark = override?.respectNativeDark ?? settings.respectNativeDark;
  const themeEnabled = settings.enabled && !(context.nativeDark && respectNativeDark);
  const nightShiftEnabled = settings.nightShift.enabled;

  return {
    enabled: themeEnabled,
    nightShiftEnabled,
    nightShiftIntensity: nightShiftEnabled ? settings.nightShift.intensity : 0,
    engine: override?.engine ?? settings.engine,
    theme: { ...settings.theme, ...override?.theme },
    reason: themeEnabled
      ? 'enabled'
      : context.nativeDark && respectNativeDark
        ? 'native-dark'
        : 'globally-disabled',
  };
}
