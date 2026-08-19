import { fetchRemoteResource } from '../src/background/remote-resource-fetch';
import { type ContentCommand } from '../src/shared/messages';
import { isRemoteResourceRequest, type RemoteResourceResult } from '../src/shared/remote-resource';
import { EXTENSION_SETTINGS_KEY, readExtensionSettings } from '../src/shared/settings-storage';

const SCHEDULE_ALARM = 'nighttime-schedule-refresh';

function runSafely(task: () => Promise<unknown>, label: string): void {
  void task().catch((error: unknown) => {
    console.error(`[NightTime] ${label}`, error);
  });
}

async function syncScheduleAlarm(): Promise<void> {
  const settings = await readExtensionSettings();
  const shouldRun = settings.schedule.enabled && settings.schedule.mode !== 'off';
  if (!shouldRun) {
    await chrome.alarms.clear(SCHEDULE_ALARM);
    return;
  }
  const existing = await chrome.alarms.get(SCHEDULE_ALARM);
  if (!existing) {
    chrome.alarms.create(SCHEDULE_ALARM, { delayInMinutes: 1, periodInMinutes: 1 });
  }
}

async function refreshOpenTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const message = { type: 'NIGHT_MODE_REFRESH_SETTINGS' } satisfies ContentCommand;
  await Promise.allSettled(
    tabs
      .filter((tab): tab is chrome.tabs.Tab & { id: number } => tab.id !== undefined)
      .map((tab) => chrome.tabs.sendMessage(tab.id, message)),
  );
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    runSafely(syncScheduleAlarm, 'Unable to initialize schedule.');
    console.info('[NightTime] Extension installed.');
  });
  chrome.runtime.onStartup.addListener(() => {
    runSafely(syncScheduleAlarm, 'Unable to restore schedule.');
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[EXTENSION_SETTINGS_KEY]) {
      runSafely(syncScheduleAlarm, 'Unable to update schedule.');
    }
  });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SCHEDULE_ALARM) {
      runSafely(refreshOpenTabs, 'Unable to refresh scheduled tabs.');
    }
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isRemoteResourceRequest(message)) return false;
    const respond = async (): Promise<RemoteResourceResult> => {
      if (sender.id !== chrome.runtime.id || sender.tab?.id === undefined) {
        return { ok: false, error: 'Remote resource request was rejected.' };
      }
      try {
        return { ok: true, data: await fetchRemoteResource(message.url) };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Remote resource request failed.',
        };
      }
    };
    void respond().then(sendResponse);
    return true;
  });

  runSafely(syncScheduleAlarm, 'Unable to initialize schedule.');
});
