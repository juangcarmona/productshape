/* eslint-disable @typescript-eslint/no-require-imports -- Portable CommonJS replay scripts load a caller-selected Playwright installation. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = process.env.RUNTIME_EVIDENCE_DIR || __dirname;
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'],
  });
  let results = [];
  try {
    for (const width of [320, 390, 416, 417, 544, 545, 1024, 1216, 1217, 1280, 1440, 1441]) {
      for (const [name, url, snapshot] of [
        ['public-en', 'http://127.0.0.1:8788/en/', false],
        ['public-es', 'http://127.0.0.1:8788/es/', false],
        ['portal', 'http://127.0.0.1:8789/productshape/en/', false],
        ['architecture', 'http://127.0.0.1:8789/productshape/en/engineering/', false],
        ['snapshot', 'http://127.0.0.1:8789/productshape/en/model/explorer.html', true],
      ]) {
        const p = await b.newPage({ viewport: { width, height: 900 } });
        await p.goto(url);
        const metrics = await p.evaluate((snapshot) => {
          const selector = snapshot ? '[data-appearance-set]' : '[data-appearance-choice]';
          return {
            viewport: innerWidth,
            scroll: document.documentElement.scrollWidth,
            overviewScroll: snapshot ? document.querySelector('#view-overview').scrollWidth : null,
            controls: [...document.querySelectorAll(selector)].map((e) => {
              const r = e.getBoundingClientRect(),
                parent = e.parentElement.getBoundingClientRect();
              return {
                label: e.getAttribute('aria-label'),
                left: r.left,
                right: r.right,
                parentRight: parent.right,
                reachable: r.left >= 0 && r.right <= innerWidth && r.right <= parent.right + 1,
              };
            }),
          };
        }, snapshot);
        assert.ok(metrics.scroll <= width + 1, `${name}@${width} page overflows`);
        if (snapshot)
          assert.ok(metrics.overviewScroll <= width + 1, `${name}@${width} overview overflows`);
        assert.ok(
          metrics.controls.every((x) => x.reachable),
          `${name}@${width} unreachable control ${JSON.stringify(metrics)}`,
        );
        if (snapshot && width <= 390) {
          const wrappers = p.locator('.gridwrap, .ovcol > table.grid');
          let scrollable = 0;
          for (let i = 0; i < (await wrappers.count()); i++) {
            const wrapper = wrappers.nth(i);
            await wrapper.scrollIntoViewIfNeeded();
            const m = await wrapper.evaluate((e) => {
              e.scrollLeft = 80;
              return { client: e.clientWidth, scroll: e.scrollWidth, left: e.scrollLeft };
            });
            if (m.scroll > m.client) {
              assert.ok(m.left > 0);
              scrollable++;
            }
          }
          assert.ok(scrollable > 0);
          assert.equal(await p.getByRole('table').count(), 2);
          await p.screenshot({
            animations: 'disabled',
            path: path.join(out, `snapshot-table-${width}.png`),
          });
          await p.locator('#view-overview').evaluate((e) => (e.scrollTop = 0));
          await p.screenshot({
            animations: 'disabled',
            path: path.join(out, `snapshot-header-${width}.png`),
          });
        }
        results.push({ name, width, ...metrics, passed: true });
        await p.close();
      }
    }
    await fs.writeFile(
      path.join(out, 'layout-results.json'),
      JSON.stringify(results, null, 2) + '\n',
    );
    console.log(
      `Passed ${results.length} viewport/layout cases, including 320/390px Snapshot table scrolling and appearance controls.`,
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
