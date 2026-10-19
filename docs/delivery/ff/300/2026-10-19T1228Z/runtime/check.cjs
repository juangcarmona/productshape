/* eslint-disable @typescript-eslint/no-require-imports -- Portable CommonJS replay scripts load a caller-selected Playwright installation. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const path = require('node:path');
const out = process.env.RUNTIME_EVIDENCE_DIR || __dirname;
const targets = [
  ['public-en', 'http://127.0.0.1:8788/en/', true],
  ['public-es', 'http://127.0.0.1:8788/es/', true],
  ['portal', 'http://127.0.0.1:8789/productshape/en/', true],
  ['architecture', 'http://127.0.0.1:8789/productshape/en/engineering/', true],
  [
    'architecture-section',
    'http://127.0.0.1:8789/productshape/en/engineering/01-introduction-and-goals/',
    true,
  ],
  ['snapshot', 'http://127.0.0.1:8789/productshape/en/model/explorer.html', false],
];
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox'],
  });
  let results = [];
  try {
    for (const [name, url, shell] of targets) {
      for (const [size, width, mode] of [
        ['desktop', 1440, 'light'],
        ['mobile', 390, 'dark'],
      ]) {
        let errors = [];
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: mode,
        });
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        const response = await page.goto(url);
        assert.equal(response.status(), 200);
        await page.waitForLoadState('networkidle');
        if (shell) {
          await page.locator(`[data-appearance-choice="${mode}"]`).click();
          assert.equal(await page.locator('html').getAttribute('data-appearance'), mode);
          assert.equal(
            await page.locator(`[data-appearance-choice="${mode}"]`).getAttribute('aria-pressed'),
            'true',
          );
          await page.locator('[data-appearance-choice="auto"]').click();
          await page.emulateMedia({ colorScheme: 'dark' });
          await page.waitForTimeout(80);
          assert.match(await page.locator('.brand-icon').getAttribute('src'), /-dark\.svg$/);
          await page.emulateMedia({ colorScheme: 'light' });
          await page.waitForTimeout(80);
          assert.doesNotMatch(await page.locator('.brand-icon').getAttribute('src'), /-dark\.svg$/);
          await page.locator(`[data-appearance-choice="${mode}"]`).click();
          if (size === 'mobile') {
            const menu = page.locator('.mobile-menu-toggle');
            await menu.focus();
            await page.keyboard.press('Enter');
            assert.equal(await menu.getAttribute('aria-expanded'), 'true');
            await page.screenshot({
              animations: 'disabled',
              path: path.join(out, `${name}-mobile-menu.png`),
            });
            await page.keyboard.press('Escape');
            assert.equal(await menu.getAttribute('aria-expanded'), 'false');
            assert.equal(await menu.evaluate((el) => el === document.activeElement), true);
          }
        } else {
          await page.locator(`[data-appearance-set="${mode}"]`).click();
          assert.match(page.url(), new RegExp('a=' + mode));
          await page.reload();
          assert.equal(await page.locator('html').getAttribute('data-appearance'), mode);
        }
        const metrics = await page.evaluate(() => ({
          viewport: innerWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        assert.ok(
          metrics.scroll <= metrics.viewport + 1,
          `${name} horizontal overflow: ${JSON.stringify(metrics)}`,
        );
        assert.deepEqual(errors, []);
        const screenshot = `${name}-${size}-${mode}.png`;
        await page.screenshot({ animations: 'disabled', path: path.join(out, screenshot) });
        results.push({
          name,
          url,
          size,
          appearance: mode,
          status: response.status(),
          metrics,
          pageErrors: errors,
          screenshot,
          passed: true,
        });
        await context.close();
      }
    }
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(targets[3][1]);
    const links = await page
      .locator('a.engineering-card')
      .evaluateAll((nodes) => nodes.map((n) => n.href));
    assert.equal(links.length, 12);
    for (const href of links) {
      const r = await page.request.get(href);
      assert.equal(r.status(), 200, href);
    }
    results.push({ name: 'all-twelve-architecture-sections', count: links.length, passed: true });
    for (const [key, query, dialog] of [
      ['/', 'search=1', '#find'],
      ['?', 'keys=1', '#keys'],
    ]) {
      await page.goto(targets[2][1]);
      await page.keyboard.press(key);
      await page.waitForURL((url) => url.search.includes(query));
      await page.locator(dialog).waitFor({ state: 'visible' });
      results.push({ name: 'portal-keyboard-' + key, url: page.url(), dialog, passed: true });
    }
    await context.close();
    await fs.writeFile(
      path.join(out, 'browser-results.json'),
      JSON.stringify(
        { browser: 'Chromium 1248 via Playwright', observedAt: new Date().toISOString(), results },
        null,
        2,
      ) + '\n',
    );
    console.log(
      JSON.stringify(results.map((x) => ({ name: x.name, size: x.size, passed: x.passed }))),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
