/**
 * Explorer screenshot harness (SLI-SNAPSHOT-004, extending SLI-SNAPSHOT-003's measurement harness).
 *
 * Drives a headless Chromium-family browser over the generated Product Explorer at a set of routes and
 * viewports, producing the visual evidence QR-PRESENTATION and QR-ACCESSIBILITY require and
 * that jsdom cannot produce: layout, paint, wrapping, focus rendering and colour.
 *
 * Extended by each slice with the routes it introduces rather than rebuilt.
 *
 * Run with: pnpm shots:explorer [--out <dir>] [--browser <path>]
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const CANDIDATE_BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

interface Shot {
  name: string;
  route: string;
  width: number;
  height: number;
  caption: string;
  /** Script run before capture, for states a URL cannot express (expanded groups, focus). */
  prepare?: string;
}

const DESKTOP = { width: 1440, height: 900 };
const NARROW = { width: 430, height: 900 };
const PHONE = { width: 390, height: 844 };
/**
 * Headless Chromium captures the viewport at the top of the layout, so a state further down the
 * page is framed by making the viewport tall rather than by scrolling — scrolling moves the content
 * out of the captured region and yields a blank image.
 */
const TALL = { width: 1440, height: 2400 };

const shots: Shot[] = [
  {
    name: '01-overview-desktop',
    route: '#/',
    ...DESKTOP,
    caption:
      'Opening view: identity, totals and the Overview map with every artifact as a chip by kind and context — no artifact body.',
  },
  {
    name: '02-artifact-detail-desktop',
    route: '#/artifacts/UC-EXPLORER-BROWSE',
    ...DESKTOP,
    caption:
      'One active artifact: grouped list with the selection’s kind open, linked metadata, and the Focus action.',
  },
  {
    name: '03-relationship-groups-collapsed',
    route: '#/artifacts/BC-PRODUCT-DEFINITION',
    ...TALL,
    caption:
      'The most connected artifact: groups derive exact counts and the large ones start collapsed.',
  },
  {
    name: '04-relationship-groups-expanded',
    route: '#/artifacts/BC-PRODUCT-DEFINITION',
    ...TALL,
    caption: 'The same artifact with every group expanded: exactly the counted members appear.',
    prepare: `document.querySelectorAll('#detail details.relgroup').forEach(function (d) { d.open = true; d.dispatchEvent(new Event('toggle')); })`,
  },
  {
    name: '05-artifact-detail-narrow',
    route: '#/artifacts/UC-EXPLORER-BROWSE',
    ...NARROW,
    caption: 'Narrow viewport: the detail is its own state, reached from the list.',
  },
  {
    name: '06-artifact-list-narrow',
    route: '#/artifacts?k=use-case',
    ...NARROW,
    caption: 'Narrow viewport: the list is its own state, not a compressed desktop layout.',
  },
  {
    name: '07-long-title-and-body',
    route: '#/artifacts/CON-SDD-AGNOSTIC',
    ...NARROW,
    caption: 'Long title and body wrap within their container; the page does not scroll sideways.',
  },
  {
    name: '08-unknown-identifier',
    route: '#/artifacts/UC-DOES-NOT-EXIST',
    ...DESKTOP,
    caption: 'An identifier this Product Explorer does not contain is named, with a way onward.',
  },
  {
    name: '10-focus-visible',
    route: '#/artifacts/UC-EXPLORER-BROWSE',
    ...DESKTOP,
    caption: 'Keyboard focus is visible: the focus ring on the selected list entry.',
    prepare: `document.querySelector('#artifact-list a[aria-current]').focus()`,
  },
  {
    name: '11-no-colour',
    route: '#/artifacts/BC-PRODUCT-DEFINITION',
    ...DESKTOP,
    caption:
      'Rendered without colour: kind, status, selection and relationship direction remain determinable.',
    prepare: `document.documentElement.style.filter = 'grayscale(1)'`,
  },
  {
    name: '12-search-ranked',
    route: '#/artifacts?q=product',
    ...DESKTOP,
    caption:
      'Ranked search for "product" in the search dialog: the derived total and display limit are visible, identifier and title matches above body-only ones.',
  },
  {
    name: '13-search-snippet',
    route: '#/artifacts?q=byte-identical',
    ...DESKTOP,
    caption: 'A body match shows a snippet of the matching content, inserted as text.',
  },
  {
    name: '14-search-keyboard-active',
    route: '#/artifacts?q=explorer',
    ...DESKTOP,
    caption:
      'Arrow keys move an active result, reported with aria-activedescendant; Enter follows it.',
    prepare: `var q=document.getElementById('q-body');q.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));q.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))`,
  },
  {
    name: '15-search-no-results',
    route: '#/artifacts?q=nothing%20matches%20this',
    ...DESKTOP,
    caption: 'A query matching nothing says so, and repeats the query it searched for.',
  },
  {
    name: '16-search-narrow',
    route: '#/artifacts?q=handoff',
    ...NARROW,
    caption: 'The search dialog on a narrow viewport.',
  },
  {
    name: '17-focus-typical',
    route: '#/focus/UC-EXPLORER-BROWSE',
    ...DESKTOP,
    caption:
      'The Focus view on a use case: its neighbours grouped by kind, earlier kinds on the left and later ones on the right, the rest of the model faded behind.',
  },
  {
    name: '18-focus-hardest',
    route: '#/focus/BC-PRODUCT-DEFINITION',
    ...DESKTOP,
    caption:
      'The most connected artifact: dense kind groups start collapsed with their complete counts.',
  },
  {
    name: '19-focus-expanded',
    route: '#/focus/BC-PRODUCT-DEFINITION?x=use-case',
    ...DESKTOP,
    caption: 'The same focus with one dense group expanded; the disclosure is in the address.',
  },
  {
    name: '20-focus-hover',
    route: '#/focus/UC-EXPLORER-BROWSE',
    ...DESKTOP,
    caption: 'Hovering a neighbour lights it, the focus and the line between them.',
    prepare: `document.querySelector('#map-focus [data-id="BR-CANONICAL"]').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`,
  },
  {
    name: '21-overview-dark',
    route: '#/?a=dark',
    ...DESKTOP,
    caption:
      'The Overview in the dark appearance, chosen in the address: every colour from its own token set.',
  },
  {
    name: '22-artifact-dark',
    route: '#/artifacts/UC-EXPLORER-BROWSE?a=dark',
    ...DESKTOP,
    caption: 'The Reader in the dark appearance.',
  },
  {
    name: '23-master-rail',
    route: '#/artifacts/FR-EXPLORER-READER?m=rail',
    ...DESKTOP,
    caption:
      'The master area collapsed to its kind rail: the selected kind stays marked while the Reader takes the room.',
  },
  {
    name: '24-search-narrowed',
    route: '#/artifacts/UC-EXPLORER-BROWSE?k=functional-requirement&q=search',
    ...DESKTOP,
    caption:
      'Search narrowed to one kind where the query is typed; the same narrowing is named beside the list.',
  },
  {
    name: '25-shortcuts',
    route: '#/artifacts/UC-EXPLORER-BROWSE',
    ...DESKTOP,
    caption: 'Every shortcut is stated on the page, and each has a visible control.',
    prepare: `document.getElementById('keys-open').click()`,
  },
  {
    name: '26-overview-hover-light',
    route: '#/',
    ...DESKTOP,
    caption:
      'The Overview map, light: every artifact as a chip by kind and context; hovering a use case lights its neighbours and lines in neon.',
    prepare: `document.querySelector('#map-overview [data-id="UC-EXPLORER-BROWSE"]').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`,
  },
  {
    name: '27-overview-hover-dark',
    route: '#/?a=dark',
    ...DESKTOP,
    caption: 'The same hover in the dark appearance.',
    prepare: `document.querySelector('#map-overview [data-id="UC-EXPLORER-BROWSE"]').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`,
  },
  {
    name: '28-focus-dark',
    route: '#/focus/UC-EXPLORER-BROWSE?a=dark',
    ...DESKTOP,
    caption: 'The Focus view in the dark appearance.',
  },
  {
    name: '29-columns-light',
    route: '#/columns/UC-EXPLORER-BROWSE',
    ...DESKTOP,
    caption:
      'The Columns view, light: one column per kind in the stated order, a selected use case and its neighbourhood lit.',
  },
  {
    name: '30-columns-dark',
    route: '#/columns/UC-EXPLORER-BROWSE?a=dark',
    ...DESKTOP,
    caption: 'The Columns view in the dark appearance.',
  },
  {
    name: '31-lens-focus-light',
    route: '#/focus/UC-EXPLORER-BROWSE?l=b',
    ...DESKTOP,
    caption:
      'The business lens on a use case: goal, trigger, users, the rules it must obey, how they are proved, and what a change would put in question, with no identifiers.',
  },
  {
    name: '32-lens-focus-dark',
    route: '#/focus/UC-CHANGE?a=dark&l=b',
    ...DESKTOP,
    caption: 'The business lens in the dark appearance, on another use case.',
  },
  {
    name: '33-lens-reader',
    route: '#/artifacts/UC-EXPLORER-BROWSE?l=b',
    ...DESKTOP,
    caption: 'The business card joins the Reader when the lens is on.',
  },
  {
    name: '34-overview-narrow',
    route: '#/',
    ...NARROW,
    caption: 'The Overview map at a phone width: the map fits, pans and pinches.',
  },
  {
    name: '36-phone-opening',
    route: '',
    ...PHONE,
    caption:
      'A phone opened without an address starts on the artifact catalog, under a one-row header.',
  },
  {
    name: '37-phone-menu',
    route: '#/artifacts/UC-EXPLORER-BROWSE',
    ...PHONE,
    caption:
      'The phone menu: the views, the business lens and the appearance open beneath the header.',
    prepare: `document.getElementById('menu-toggle').click()`,
  },
  {
    name: '38-phone-card-folded',
    route: '#/focus/UC-EXPLORER-BROWSE',
    ...PHONE,
    caption: 'On a phone the map summary folds to its title so it does not hide the map.',
    prepare: `document.querySelector('#mcard .cardfold').click()`,
  },
  {
    name: '35-map-no-colour',
    route: '#/columns/BR-CANONICAL',
    ...DESKTOP,
    caption:
      'Without colour: kind by column heading and icon, the selection by outline, the lit neighbourhood by border weight and dimming.',
    prepare: `document.documentElement.style.filter = 'grayscale(1)'`,
  },
];

const flag = (name: string): string | undefined => {
  const args = process.argv.slice(2);
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

async function findBrowser(): Promise<string> {
  const explicit = flag('--browser');
  if (explicit) return explicit;
  for (const candidate of CANDIDATE_BROWSERS) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      /* not this one */
    }
  }
  throw new Error(
    `No headless browser found. Tried:\n  ${CANDIDATE_BROWSERS.join('\n  ')}\nPass --browser <path>.`,
  );
}

/** Windows-hosted browsers need Windows paths; Linux ones take the path as-is. */
async function toBrowserPath(posixPath: string): Promise<string> {
  try {
    const { stdout } = await run('wslpath', ['-w', posixPath]);
    return stdout.trim();
  } catch {
    return posixPath;
  }
}

const browser = await findBrowser();
const isWindowsBrowser = browser.startsWith('/mnt/');
const outDir = resolve(flag('--out') ?? join(repoRoot, 'docs/assets/explorer'));
const explorer = join(repoRoot, '.product/generated/explorer.html');

await mkdir(outDir, { recursive: true });

/**
 * A Windows browser cannot write into a WSL path reliably, and cannot read one as a file:// URL
 * without the UNC form. Stage both sides where it can reach them, then copy back.
 */
/** The WSL user name need not match the Windows one, so ask Windows where its temp directory is. */
async function windowsTemp(): Promise<string> {
  const { stdout } = await run('cmd.exe', ['/c', 'echo %TEMP%']);
  const { stdout: posix } = await run('wslpath', ['-u', stdout.trim()]);
  return posix.trim();
}

const staging = isWindowsBrowser
  ? join(await windowsTemp(), 'prodshape-shots')
  : join(repoRoot, '.product/generated/shots');
await mkdir(staging, { recursive: true });

const pagePath = join(staging, 'explorer.html');
await writeFile(pagePath, await readFile(explorer, 'utf8'), 'utf8');
const pageUrl = `file:///${(await toBrowserPath(pagePath)).replaceAll('\\', '/').replaceAll(' ', '%20')}`;

process.stdout.write(`browser: ${browser}\npage:    ${pageUrl}\nout:     ${outDir}\n\n`);

const manifest: { name: string; route: string; viewport: string; caption: string }[] = [];

for (const shot of shots) {
  const target = join(staging, `${shot.name}.png`);
  await rm(target, { force: true });
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=4000',
    // Pinned to the light preference so a shot never depends on the capturing machine's setting;
    // the dark shots choose their appearance in the address instead.
    '--blink-settings=preferredColorScheme=1',
    `--window-size=${shot.width},${shot.height}`,
    `--screenshot=${await toBrowserPath(target)}`,
  ];
  if (shot.prepare) {
    // Chromium has no pre-capture hook, so the state is set by a fragment-triggered inline script
    // appended to a staged copy of the page rather than by driving a live session.
    const staged = join(staging, `${shot.name}.html`);
    const html = await readFile(pagePath, 'utf8');
    const injected = html.replace(
      '</body>',
      `<script>window.addEventListener('load',function(){try{${shot.prepare}}catch(e){}});</script></body>`,
    );
    await writeFile(staged, injected, 'utf8');
    const stagedUrl = `file:///${(await toBrowserPath(staged)).replaceAll('\\', '/').replaceAll(' ', '%20')}`;
    args.push(`${stagedUrl}${shot.route}`);
  } else {
    args.push(`${pageUrl}${shot.route}`);
  }

  /* The heaviest routes occasionally exceed the browser's budget on a cold start; one retry with a
     longer budget is enough, and a persistent failure is reported rather than silently skipped. */
  let captured = false;
  for (const attempt of [0, 1]) {
    const attemptArgs = args.map((a) =>
      attempt === 1 && a.startsWith('--virtual-time-budget=') ? '--virtual-time-budget=15000' : a,
    );
    try {
      await run(browser, attemptArgs, { timeout: attempt === 0 ? 60_000 : 120_000 });
      captured = true;
      break;
    } catch (error) {
      if (attempt === 1) {
        process.stdout.write(`  FAILED ${shot.name}: ${(error as Error).message.split('\n')[0]}\n`);
      }
    }
  }
  if (!captured) continue;
  const bytes = await readFile(target);
  await writeFile(join(outDir, `${shot.name}.png`), bytes);
  manifest.push({
    name: shot.name,
    route: shot.route,
    viewport: `${shot.width}x${shot.height}`,
    caption: shot.caption,
  });
  process.stdout.write(
    `  ${shot.name.padEnd(34)} ${`${shot.width}x${shot.height}`.padEnd(10)} ${(bytes.length / 1024).toFixed(0)} KB\n`,
  );
}

await writeFile(
  join(outDir, 'manifest.json'),
  `${JSON.stringify({ browser: browser.split('/').pop(), shots: manifest }, null, 2)}\n`,
  'utf8',
);
await rm(staging, { recursive: true, force: true });
process.stdout.write(`\n${manifest.length}/${shots.length} captured to ${outDir}\n`);
