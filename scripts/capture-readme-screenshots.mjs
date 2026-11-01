/* global chrome */
import assert from 'node:assert/strict';
import { log } from 'node:console';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium } from 'playwright';

const extensionPath = resolve('.output/chrome-mv3');
const screenshotsPath = resolve('assets/screenshots');
await mkdir(screenshotsPath, { recursive: true });

const context = await chromium.launchPersistentContext('', {
  headless: false,
  viewport: { width: 340, height: 700 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});

try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await context.route('https://example.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Example</title>' }),
  );
  const site = await context.newPage();
  await site.goto('https://example.com/');
  await site.bringToFront();
  const popupPromise = context.waitForEvent('page');
  await worker.evaluate(() =>
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html'), active: false }),
  );
  const popup = await popupPromise;
  await popup.waitForURL('**/popup.html');
  await popup.locator('#preset').waitFor({ state: 'visible' });
  await popup.locator('#preset').selectOption('quiet-night');
  await popup.locator('.popup-shell[aria-busy="false"]').waitFor();
  if ((await popup.locator('.toggle').getAttribute('aria-pressed')) !== 'true') {
    await popup.locator('.toggle').click();
    await popup.locator('.toggle[aria-pressed="true"]').waitFor();
    await popup.locator('.popup-shell[aria-busy="false"]').waitFor();
  }

  for (const [language, heading] of [
    ['en', 'Eye comfort'],
    ['ru', 'Комфорт для глаз'],
  ]) {
    await popup.locator('.language-picker').selectOption(language);
    await popup.locator('.popup-shell[aria-busy="false"]').waitFor();
    await popup.reload();
    await popup.getByRole('heading', { name: heading }).waitFor();
    await popup.locator('.popup-shell[aria-busy="false"]').waitFor();
    assert.equal(await popup.locator('html').getAttribute('lang'), language);
    assert.equal(await popup.locator('#preset').inputValue(), 'quiet-night');
    assert.equal(await popup.locator('.toggle').getAttribute('aria-pressed'), 'true');
    assert.equal(await popup.locator('.site-card strong').innerText(), 'example.com');
    await popup.locator('main').screenshot({ path: resolve(screenshotsPath, `popup-${language}.png`) });
    log(`Captured ${language} popup`);
  }
} finally {
  await context.close();
}
