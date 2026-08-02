import { describe, expect, it } from 'vitest';

import { languageFromLocale, t } from '../../src/shared/i18n';

describe('UI localization', () => {
  it('uses Russian only for Russian system locales', () => {
    expect(languageFromLocale('ru-RU')).toBe('ru');
    expect(languageFromLocale('en-US')).toBe('en');
    expect(languageFromLocale('de-DE')).toBe('en');
  });

  it('provides translated interface text', () => {
    expect(t('turnOff', 'ru')).toBe('Выключить ночной режим');
    expect(t('turnOff', 'en')).toBe('Disable night mode');
  });
});
