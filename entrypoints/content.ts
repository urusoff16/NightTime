import { ThemeController } from '../src/content/theme-controller';
import { NightShiftOverlay } from '../src/content/night-shift-overlay';
import { detectNativeDarkTheme, isExtensionPageAvailable } from '../src/content/page-state';
import { isContentCommand, type ContentState, type MessageResult } from '../src/shared/messages';
import { EXTENSION_SETTINGS_KEY, readExtensionSettings } from '../src/shared/settings-storage';
import { resolveEffectiveSettings } from '../src/shared/settings-resolver';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  allFrames: true,
  main(context) {
    const controller = new ThemeController();
    const nightShift = new NightShiftOverlay();
    let originalNativeDark: boolean | null = null;
    const getOriginalNativeDark = async (): Promise<boolean> => {
      if (originalNativeDark !== null) return originalNativeDark;
      if (document.readyState === 'loading') {
        await new Promise<void>((resolve) => {
          let settled = false;
          const finish = (): void => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeoutId);
            document.removeEventListener('DOMContentLoaded', finish);
            resolve();
          };
          const timeoutId = window.setTimeout(finish, 250);
          document.addEventListener('DOMContentLoaded', finish, { once: true });
        });
      }
      originalNativeDark = detectNativeDarkTheme();
      return originalNativeDark;
    };
    const applyStoredSettings = async (): Promise<ContentState> => {
      const settings = await readExtensionSettings();
      const effective = resolveEffectiveSettings({
        settings,
        hostname: location.hostname,
        now: new Date(),
        systemPrefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
        nativeDark: settings.enabled ? await getOriginalNativeDark() : false,
        pageAvailable: isExtensionPageAvailable(),
      });
      const state = effective.enabled
        ? controller.apply(effective.theme, effective.engine)
        : controller.disable();
      if (!effective.enabled) originalNativeDark = null;
      nightShift.apply(effective.nightShiftEnabled, effective.nightShiftIntensity);
      return state;
    };
    const applyStoredSettingsSafely = (): void => {
      void applyStoredSettings().catch((error: unknown) => {
        console.error('[NightTime] Failed to apply stored settings.', error);
      });
    };

    const handleCommand = async (message: unknown): Promise<MessageResult<ContentState>> => {
      if (!isContentCommand(message)) {
        return {
          ok: false,
          error: { code: 'UNSUPPORTED_MESSAGE', message: 'Неизвестная команда.' },
        };
      }

      try {
        switch (message.type) {
          case 'NIGHT_MODE_ENABLE':
            return { ok: true, data: controller.apply(message.settings) };
          case 'NIGHT_MODE_DISABLE':
            return { ok: true, data: controller.disable() };
          case 'NIGHT_MODE_REFRESH_SETTINGS':
            return { ok: true, data: await applyStoredSettings() };
          case 'NIGHT_MODE_GET_STATE':
            return { ok: true, data: controller.getState() };
        }
      } catch (error) {
        const messageText = error instanceof Error ? error.message : 'Неизвестная ошибка движка.';
        return {
          ok: false,
          error: { code: 'ENGINE_ERROR', message: messageText },
        };
      }
    };

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      void handleCommand(message).then(sendResponse);
      return true;
    });
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[EXTENSION_SETTINGS_KEY]) {
        applyStoredSettingsSafely();
      }
    });

    applyStoredSettingsSafely();
    context.setInterval(applyStoredSettingsSafely, 60_000);
  },
});
