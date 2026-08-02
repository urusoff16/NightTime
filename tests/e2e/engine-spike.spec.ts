import { createServer } from 'node:http';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { chromium } from 'playwright';

const runE2E = process.env.RUN_EXTENSION_E2E === '1';

test.describe('Dark Reader engine spike', () => {
  test.skip(
    !runE2E,
    'Для запуска требуется RUN_EXTENSION_E2E=1 и установленный Chromium Playwright.',
  );

  test('adds and removes Dark Reader styles without duplication', async () => {
    const server = createServer((request, response) => {
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': "script-src 'self'; style-src 'self' 'unsafe-inline'",
      });

      if (request.url === '/frame') {
        response.end(
          '<!doctype html><html><head><style>body { background: #fff; color: #111; }</style></head><body><p id="frame-content">Iframe fixture</p></body></html>',
        );
        return;
      }

      response.end(
        `<!doctype html><html><head><style>body { background: #fff; color: #111; padding: 40px; } #fixture-composer { display: flex; gap: 10px; padding: 12px; border: 1px solid #bbb; border-radius: 18px; background: #fff; } #fixture-editor { flex: 1; min-height: 52px; } #fixture-composer button { min-width: 52px; border: 0; border-radius: 14px; background: #111; color: #fff; }</style></head><body><h1>Light fixture</h1><form id="fixture-composer"><button type="button" aria-label="Attach">+</button><div id="fixture-editor" role="textbox" contenteditable="true" aria-label="Message">Message field</div><button type="button">Send</button></form><img id="fixture-image" alt="Fixture" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='16' height='16' fill='%23fff'/%3E%3C/svg%3E"><video id="fixture-video" controls></video><iframe src="/frame" title="Fixture frame"></iframe></body></html>`,
      );
    });

    await new Promise<void>((resolveReady) => server.listen(0, '127.0.0.1', resolveReady));
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Не удалось запустить локальную тестовую страницу.');
    }

    const extensionPath = resolve(process.cwd(), '.output/chrome-mv3');
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });

    try {
      const serviceWorker =
        context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
      const page = await context.newPage();
      const cspErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' && message.text().includes('Content Security Policy')) {
          cspErrors.push(message.text());
        }
      });
      await page.goto(`http://127.0.0.1:${address.port}`);

      const targetTabId = await serviceWorker.evaluate(async () => {
        const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        return activeTab?.id;
      });

      if (targetTabId === undefined) {
        throw new Error('Тестовая вкладка не найдена.');
      }

      const result = await serviceWorker.evaluate(async (tabId) => {
        return chrome.tabs.sendMessage(tabId, {
          type: 'NIGHT_MODE_ENABLE',
          settings: { brightness: 90, contrast: 110 },
        });
      }, targetTabId);

      expect(result).toMatchObject({ ok: true, data: { enabled: true } });
      expect(cspErrors).toEqual([]);
      const stylesAfterFirstApply = await page.locator('style.darkreader').count();
      expect(stylesAfterFirstApply).toBeGreaterThan(0);
      const fixtureEditor = page.locator('#fixture-editor');
      expect(await fixtureEditor.count()).toBe(1);
      await fixtureEditor.click();
      await page.screenshot({ path: 'test-results/engine-spike-focus.png' });
      expect(
        await fixtureEditor.evaluate((element) => getComputedStyle(element).outlineStyle),
      ).toBe('none');
      const frame = page.frames().find((candidate) => candidate.url().endsWith('/frame'));
      expect(frame).toBeDefined();
      await expect(frame!.locator('style.darkreader').first()).toBeAttached();

      await page.evaluate(() => {
        history.pushState({}, '', '/spa-route');
        document.body.insertAdjacentHTML(
          'beforeend',
          '<article id="spa-card">SPA fixture</article>',
        );
      });
      await expect(page.locator('#spa-card')).toBeVisible();
      expect(
        await page
          .locator('#fixture-image')
          .evaluate((element) => getComputedStyle(element).filter),
      ).not.toContain('invert');
      expect(
        await page
          .locator('#fixture-video')
          .evaluate((element) => getComputedStyle(element).filter),
      ).not.toContain('invert');

      await serviceWorker.evaluate(async () => {
        const stored = await chrome.storage.local.get('extensionSettings');
        const current = stored.extensionSettings as {
          theme: Record<string, unknown>;
        };
        await chrome.storage.local.set({
          extensionSettings: {
            ...current,
            enabled: true,
            engine: 'smart',
            activePresetId: 'polar-shadow',
            theme: {
              ...current.theme,
              brightness: 88,
              contrast: 108,
              saturation: 82,
              dimming: 14,
            },
          },
        });
      });
      await expect
        .poll(async () => {
          return serviceWorker.evaluate(async (tabId) => {
            return chrome.tabs.sendMessage(tabId, { type: 'NIGHT_MODE_GET_STATE' });
          }, targetTabId);
        })
        .toMatchObject({
          ok: true,
          data: { enabled: true, engine: 'smart', brightness: 88, contrast: 108 },
        });
      await expect(page.locator('#night-mode-dimming-overlay')).toHaveCount(1);

      await serviceWorker.evaluate(async () => {
        const stored = await chrome.storage.local.get('extensionSettings');
        const current = stored.extensionSettings as {
          theme: Record<string, unknown>;
        };
        await chrome.storage.local.set({
          extensionSettings: {
            ...current,
            activePresetId: 'quiet-night',
            theme: {
              ...current.theme,
              brightness: 96,
              contrast: 100,
              saturation: 90,
              dimming: 0,
            },
          },
        });
      });
      await expect
        .poll(async () => {
          return serviceWorker.evaluate(async (tabId) => {
            return chrome.tabs.sendMessage(tabId, { type: 'NIGHT_MODE_GET_STATE' });
          }, targetTabId);
        })
        .toMatchObject({
          ok: true,
          data: { enabled: true, engine: 'smart', brightness: 96, contrast: 100 },
        });
      await expect(page.locator('#night-mode-dimming-overlay')).toHaveCount(0);

      const secondResult = await serviceWorker.evaluate(async (tabId) => {
        return chrome.tabs.sendMessage(tabId, {
          type: 'NIGHT_MODE_ENABLE',
          settings: { brightness: 90, contrast: 110 },
        });
      }, targetTabId);

      expect(secondResult).toMatchObject({ ok: true, data: { enabled: true } });
      await expect(page.locator('style.darkreader')).toHaveCount(stylesAfterFirstApply);

      const disabledResult = await serviceWorker.evaluate(async (tabId) => {
        return chrome.tabs.sendMessage(tabId, { type: 'NIGHT_MODE_DISABLE' });
      }, targetTabId);

      expect(disabledResult).toMatchObject({ ok: true, data: { enabled: false } });
      await expect(page.locator('style.darkreader')).toHaveCount(0);

      await serviceWorker.evaluate(async () => {
        const stored = await chrome.storage.local.get('extensionSettings');
        const current = stored.extensionSettings as Record<string, unknown>;
        await chrome.storage.local.set({
          extensionSettings: { ...current, language: 'en' },
        });
      });

      const extensionId = new URL(serviceWorker.url()).host;
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      await expect(popup.getByRole('heading', { name: 'Eye comfort' })).toBeVisible();
      await expect(popup.getByRole('button', { name: 'Disable night mode' })).toBeVisible();
      await expect(popup.getByLabel('Settings')).toBeVisible();
      await expect(popup.getByLabel('Language')).toHaveValue('en');
      await page.bringToFront();
      const brightness = popup.locator('#brightness');
      for (const value of ['92', '86', '79', '73']) await brightness.fill(value);
      await brightness.dispatchEvent('pointerup');
      await expect(popup.locator('output')).toHaveText('73%');
      await expect
        .poll(async () => {
          return serviceWorker.evaluate(async (tabId) => {
            return chrome.tabs.sendMessage(tabId, { type: 'NIGHT_MODE_GET_STATE' });
          }, targetTabId);
        })
        .toMatchObject({ ok: true, data: { enabled: true, brightness: 73 } });
      await popup.screenshot({ path: 'test-results/engine-spike-popup.png' });
    } finally {
      await context.close();
      await new Promise<void>((resolveClosed) => server.close(() => resolveClosed()));
    }
  });
});
