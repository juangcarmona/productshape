/**
 * Snapshot screenshot harness (SLI-SNAPSHOT-004, extending SLI-SNAPSHOT-003's measurement harness).
 *
 * Drives a headless Chromium-family browser over the generated snapshot at a set of routes and
 * viewports, producing the visual evidence QR-PRESENTATION-001 and QR-ACCESSIBILITY-001 require and
 * that jsdom cannot produce: layout, paint, wrapping, focus rendering and colour.
 *
 * Extended by each slice with the routes it introduces rather than rebuilt.
 *
 * Run with: pnpm shots:snapshot [--out <dir>] [--browser <path>]
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const CANDIDATE_BROWSERS = [
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
    caption: 'Opening view: orientation only — no artifact body, no artifact-level graph.',
  },
  {
    name: '02-artifact-detail-desktop',
    route: '#/artifacts/UC-SNAPSHOT-EXPLORE-001',
    ...DESKTOP,
    caption: 'Master-detail: one active artifact, with grouped relationships below its body.',
  },
  {
    name: '03-relationship-groups-collapsed',
    route: '#/artifacts/BC-PRODUCT-DEFINITION',
    ...TALL,
    caption:
      'The most connected artifact (27 relationships): groups carry exact counts and the large ones start collapsed.',
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
    route: '#/artifacts/UC-SNAPSHOT-EXPLORE-001',
    ...NARROW,
    caption: 'Narrow viewport: the detail is its own state, reached from the list.',
  },
  {
    name: '06-artifact-list-narrow',
    route: '#/artifacts',
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
    caption: 'An identifier this snapshot does not contain is named, with a way onward.',
  },
  {
    name: '17-focus-typical',
    route: '#/graph/focus/UC-SNAPSHOT-EXPLORE-001',
    ...DESKTOP,
    caption:
      'Focused neighbourhood of a typical artifact: outgoing groups above the anchor, incoming below, small groups already open.',
  },
  {
    name: '18-focus-hardest',
    route: '#/graph/focus/BC-PRODUCT-DEFINITION',
    ...DESKTOP,
    caption:
      'The hardest artifact in the model: 27 relationships become 5 satellites, the large ones closed with exact counts.',
  },
  {
    name: '19-focus-expanded',
    route: '#/graph/focus/BC-PRODUCT-DEFINITION',
    ...DESKTOP,
    caption:
      'One satellite opened: its members fan out beside it and every other satellite stays exactly where it was.',
    prepare: `var s=document.querySelectorAll('#graph-host circle[data-group]');for(var i=0;i<s.length;i++){if((s[i].getAttribute('aria-label')||'').indexOf('· 12')>0){s[i].dispatchEvent(new MouseEvent('click',{bubbles:true}));break}}`,
  },
  {
    name: '20-focus-isolated',
    route: '#/graph/focus/CON-NO-WEB-UI',
    ...DESKTOP,
    caption: 'An artifact with no relationships says so rather than drawing an empty diagram.',
  },
  {
    name: '10-focus-visible',
    route: '#/artifacts',
    ...DESKTOP,
    caption: 'Keyboard focus is visible: the focus ring on the first list entry.',
    prepare: `document.querySelector('#artifact-list a').focus()`,
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
    route: '#/artifacts',
    ...TALL,
    caption:
      'Ranked search for "product": 73 matches, top 25 shown, identifier and title matches above body-only ones.',
    prepare: `var q=document.getElementById('q-body');q.value='product';q.dispatchEvent(new Event('input'))`,
  },
  {
    name: '13-search-snippet',
    route: '#/artifacts',
    ...DESKTOP,
    caption: 'A body match shows a snippet of the matching content, inserted as text.',
    prepare: `var q=document.getElementById('q-body');q.value='byte-identical';q.dispatchEvent(new Event('input'))`,
  },
  {
    name: '14-search-keyboard-active',
    route: '#/artifacts',
    ...DESKTOP,
    caption:
      'Arrow keys move an active result, reported with aria-activedescendant; Enter follows it.',
    prepare: `var q=document.getElementById('q-body');q.value='snapshot';q.dispatchEvent(new Event('input'));q.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));q.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))`,
  },
  {
    name: '15-search-no-results',
    route: '#/artifacts',
    ...DESKTOP,
    caption: 'A query matching nothing says so, and repeats the query it searched for.',
    prepare: `var q=document.getElementById('q-body');q.value='nothing matches this';q.dispatchEvent(new Event('input'))`,
  },
  {
    name: '16-search-narrow',
    route: '#/artifacts',
    ...NARROW,
    caption: 'Search results on a narrow viewport.',
    prepare: `var q=document.getElementById('q-body');q.value='handoff';q.dispatchEvent(new Event('input'))`,
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
const outDir = resolve(flag('--out') ?? join(repoRoot, 'docs/assets/snapshot'));
const snapshot = join(repoRoot, '.product/generated/snapshot.html');

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

const pagePath = join(staging, 'snapshot.html');
await writeFile(pagePath, await readFile(snapshot, 'utf8'), 'utf8');
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
