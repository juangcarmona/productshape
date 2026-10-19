/* eslint-disable @typescript-eslint/no-require-imports -- Portable CommonJS replay scripts load a caller-selected Playwright installation. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'],
  });
  const results = [];
  try {
    for (const width of [320, 390])
      for (const scheme of ['light', 'dark']) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: scheme,
          offline: true,
        });
        const page = await context.newPage();
        const requests = [],
          errors = [];
        page.on('request', (r) => {
          if (/^https?:/.test(r.url())) requests.push(r.url());
        });
        page.on('pageerror', (e) => errors.push(e.message));
        const url = pathToFileURL(
          path.join(process.env.SITE_REPO, '_site/en/model/explorer.html'),
        ).href;
        await page.goto(url);
        const targets = [
          'a[data-view="overview"]',
          'a[data-view="artifacts"]',
          '#find-open',
          '[data-appearance-set="light"]',
          '[data-appearance-set="dark"]',
          '[data-appearance-set="auto"]',
        ];
        const reached = new Set();
        for (let i = 0; i < 20 && reached.size < targets.length; i++) {
          await page.keyboard.press('Tab');
          for (const target of targets)
            if (await page.locator(target).evaluate((el) => el === document.activeElement))
              reached.add(target);
        }
        assert.equal(reached.size, targets.length, 'Every header control is reachable by Tab');
        for (const view of ['artifacts', 'overview']) {
          await page.locator(`a[data-view="${view}"]`).focus();
          await page.keyboard.press('Enter');
          await page.locator(`#view-${view}`).waitFor({ state: 'visible' });
        }
        await page.locator('#find-open').focus();
        await page.keyboard.press('Enter');
        await page.locator('#find').waitFor({ state: 'visible' });
        await page.locator('#find input').fill('Snapshot');
        assert.ok((await page.locator('#find a').count()) > 0, 'Search returns artifact links');
        await page.keyboard.press('Escape');
        await page.locator('#find').waitFor({ state: 'hidden' });
        assert.ok(await page.locator('#find-open').evaluate((el) => el === document.activeElement));
        for (const mode of ['light', 'dark', 'auto']) {
          const button = page.locator(`[data-appearance-set="${mode}"]`);
          await button.focus();
          await page.keyboard.press('Enter');
          assert.equal(await button.getAttribute('aria-pressed'), 'true');
          assert.equal(
            await page.locator('html').getAttribute('data-appearance'),
            mode === 'auto' ? null : mode,
          );
        }
        await page.emulateMedia({ colorScheme: 'light' });
        const light = await page
          .locator('body')
          .evaluate((el) => getComputedStyle(el).backgroundColor);
        await page.emulateMedia({ colorScheme: 'dark' });
        const dark = await page
          .locator('body')
          .evaluate((el) => getComputedStyle(el).backgroundColor);
        assert.notEqual(light, dark);
        await page.locator('[data-appearance-set="dark"]').focus();
        await page.keyboard.press('Enter');
        assert.match(page.url(), /a=dark/);
        await page.reload();
        assert.equal(await page.locator('html').getAttribute('data-appearance'), 'dark');
        const storage = await page.evaluate(() => ({
          local: localStorage.length,
          session: sessionStorage.length,
        }));
        assert.deepEqual(storage, { local: 0, session: 0 });
        assert.deepEqual(await context.cookies(), []);
        assert.deepEqual(requests, []);
        assert.deepEqual(errors, []);
        results.push({
          width,
          scheme,
          fileUrl: url,
          offline: true,
          tabReachable: [...reached],
          views: ['artifacts', 'overview'],
          search: 'Snapshot',
          appearanceModes: ['light', 'dark', 'auto'],
          systemColors: { light, dark },
          urlStateReload: true,
          storage,
          cookies: [],
          httpRequests: requests,
          pageErrors: errors,
          passed: true,
        });
        await context.close();
      }
    await fs.writeFile(
      path.join(process.env.RUNTIME_EVIDENCE_DIR || __dirname, 'snapshot-interaction-results.json'),
      JSON.stringify(results, null, 2) + '\n',
    );
    console.log(
      `Passed ${results.length} offline Snapshot keyboard/search/appearance/storage cases.`,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
