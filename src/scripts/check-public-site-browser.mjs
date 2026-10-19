#!/usr/bin/env node

import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize, relative, resolve } from 'node:path';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')
    ? args[index + 1]
    : fallback;
}

const directory = resolve(option('--dir', 'dist/public-site'));
const profile = option('--profile', 'public');
const basePath = option('--base-path', profile === 'public' ? '/' : '/productshape/');
const baselineDirectoryOption = option('--baseline-dir', null);
const baselineDirectory = baselineDirectoryOption ? resolve(baselineDirectoryOption) : null;
const evidenceDirectory = resolve(
  option('--evidence-dir', `.product/generated/site-browser/${profile}`),
);
if (!['public', 'engineering'].includes(profile)) throw new Error(`Invalid profile: ${profile}`);
if (!basePath.startsWith('/') || !basePath.endsWith('/')) throw new Error('Invalid base path.');

const routes =
  profile === 'public'
    ? ['/', '/en/', '/es/', '/diagrams/mermaid/', '/diagrams/archify/']
    : [
        '/productshape/',
        '/productshape/en/',
        '/productshape/diagrams/mermaid/',
        '/productshape/diagrams/archify/',
      ];

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function serveStatic() {
  return createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (!requestPath.startsWith(basePath)) {
        response.writeHead(404).end();
        return;
      }
      const requested = requestPath.slice(basePath.length);
      const relativePath = requested.endsWith('/')
        ? `${requested}index.html`
        : requested || 'index.html';
      const candidate = resolve(directory, normalize(relativePath));
      if (relative(directory, candidate).startsWith('..')) {
        response.writeHead(403).end();
        return;
      }
      let file = candidate;
      try {
        if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      } catch {
        if (!extname(file)) file = join(file, 'index.html');
      }
      const body = await readFile(file);
      response.writeHead(200, {
        'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
}

const server = serveStatic();
await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
server.unref();
const address = server.address();
if (!address || typeof address === 'string')
  throw new Error('Could not determine browser server port.');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await puppeteer.launch({
  headless: true,
  ...(process.env.PUPPETEER_EXECUTABLE_PATH
    ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
    : {}),
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(15000);
await mkdir(evidenceDirectory, { recursive: true });

const baselineRoutes = [routes[0], routes[1]];
function outputFile(route) {
  const relativeRoute = route.startsWith(basePath) ? route.slice(basePath.length) : route;
  return relativeRoute ? `${relativeRoute}index.html` : 'index.html';
}

const evidence = {
  profile,
  basePath,
  routes: [],
  checks: {
    desktopRoutes: true,
    narrowNavigation: false,
    themeChoices: false,
    focus: false,
    screenshots: [],
    baselineComparisons: [],
  },
};

if (baselineDirectory) {
  for (const route of baselineRoutes) {
    const currentFile = await readFile(join(directory, outputFile(route)));
    const baselineFile = await readFile(join(baselineDirectory, outputFile(route)));
    const identical = currentFile.equals(baselineFile);
    evidence.checks.baselineComparisons.push({ route, identical });
    if (!identical) throw new Error(`Compatibility baseline drift detected for ${route}.`);
  }
}

try {
  await page.setViewport({ width: 1440, height: 900 });
  for (const route of routes) {
    const response = await page.goto(`${origin}${route}`, { waitUntil: 'networkidle0' });
    if (!response || response.status() !== 200) {
      throw new Error(
        `${route}: expected HTTP 200, received ${response?.status() ?? 'no response'}.`,
      );
    }
    const details = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      hasBody: Boolean(document.body),
      bodyTextLength: document.body?.innerText.length ?? 0,
      renderer: document.querySelector('[data-renderer]')?.getAttribute('data-renderer') ?? null,
    }));
    if (!details.hasBody || details.bodyTextLength < 40 || !details.lang) {
      throw new Error(`${route}: incomplete rendered document.`);
    }
    if (route.endsWith('/mermaid/') && details.renderer !== 'mermaid') {
      throw new Error(`${route}: Mermaid renderer marker is missing.`);
    }
    if (route.endsWith('/archify/') && details.renderer !== 'archify') {
      throw new Error(`${route}: Archify renderer marker is missing.`);
    }
    evidence.routes.push({ route, status: response.status(), ...details });
  }

  const home = `${origin}${routes[0]}`;
  await page.goto(home, { waitUntil: 'networkidle0' });
  await page.click('[data-appearance-choice="dark"]');
  const dark = await page.evaluate(() => ({
    appearance: document.documentElement.getAttribute('data-appearance'),
    pressed: document
      .querySelector('[data-appearance-choice="dark"]')
      ?.getAttribute('aria-pressed'),
  }));
  if (dark.appearance !== 'dark' || dark.pressed !== 'true')
    throw new Error('Dark theme choice did not apply.');
  await page.click('[data-appearance-choice="auto"]');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  const system = await page.evaluate(() => ({
    appearance: document.documentElement.getAttribute('data-appearance'),
    stored: localStorage.getItem('productshape-appearance'),
  }));
  if (system.appearance !== null || system.stored !== 'auto')
    throw new Error('System theme choice did not apply.');
  evidence.checks.themeChoices = true;

  await page.setViewport({ width: 430, height: 900 });
  await page.goto(home, { waitUntil: 'networkidle0' });
  await page.click('.mobile-menu-toggle');
  const menuOpen = await page.evaluate(() => ({
    expanded: document.querySelector('.mobile-menu-toggle')?.getAttribute('aria-expanded'),
    open: document.querySelector('#primary-navigation')?.classList.contains('is-open'),
  }));
  if (menuOpen.expanded !== 'true' || !menuOpen.open)
    throw new Error('Narrow navigation did not open.');
  await page.keyboard.press('Escape');
  const menuClosed = await page.evaluate(() =>
    document.querySelector('.mobile-menu-toggle')?.getAttribute('aria-expanded'),
  );
  if (menuClosed !== 'false') throw new Error('Escape did not close narrow navigation.');
  evidence.checks.narrowNavigation = true;

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(home, { waitUntil: 'networkidle0' });
  await page.keyboard.press('Tab');
  const focusTarget = await page.evaluate(() => document.activeElement?.tagName ?? 'BODY');
  if (focusTarget === 'BODY')
    throw new Error('Keyboard focus did not move to an interactive control.');
  evidence.checks.focus = true;

  for (const route of [routes[0], routes.at(-1)]) {
    await page.goto(`${origin}${route}`, { waitUntil: 'networkidle0' });
    const fileName = `${profile}-${route.replaceAll('/', '_') || 'root'}desktop.png`;
    const file = join(evidenceDirectory, fileName);
    await page.screenshot({ path: file, fullPage: true });
    evidence.checks.screenshots.push(fileName);
  }
  await writeFile(
    join(evidenceDirectory, 'manifest.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(
    `Browser checks passed for ${profile}: ${routes.length} routes; evidence in ${evidenceDirectory}.`,
  );
} finally {
  await browser.close();
  await new Promise((resolveServer) => server.close(resolveServer));
}
