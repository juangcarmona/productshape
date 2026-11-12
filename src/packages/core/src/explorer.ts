import type { ProductGraph } from './graph.js';
import { putInQuestionBy } from './impact.js';
import { escapeHtml, renderMarkdown } from './markdown.js';
import type { LoadedArtifact } from './model.js';

/**
 * The Product Explorer: one self-contained, read-only HTML file that contains the whole
 * product model and discloses it progressively.
 *
 * Packaging and presentation are deliberately separate. The file carries every artifact's content
 * and every relationship as inert embedded data; the document the browser parses at open time
 * carries the orientation view only — no artifact body, no artifact-level graph, no drawing. Everything
 * else is rendered on demand from that data, so the opening document's size is bounded by the
 * artifact kinds present rather than by the artifact count.
 *
 * Deterministic by construction: fixed kind order, ID-sorted artifacts, LF line endings, no
 * timestamps, no randomness. Determinism is a property of the file, so rendering on demand does not
 * weaken it. The only scripts are the inert JSON data block and the static application block below.
 */

const kindOrder = [
  'actor',
  'journey',
  'use-case',
  'business-rule',
  'domain-term',
  'bounded-context',
  'functional-requirement',
  'quality-requirement',
  'constraint',
  'structured-behaviour',
];

const kindLabels: Record<string, string> = {
  actor: 'Actors',
  journey: 'Journeys',
  'use-case': 'Use Cases',
  'business-rule': 'Business Rules',
  'domain-term': 'Domain Terms',
  'bounded-context': 'Bounded Contexts',
  'functional-requirement': 'Functional Requirements',
  'quality-requirement': 'Quality Requirements',
  constraint: 'Constraints',
  'structured-behaviour': 'Structured Behaviours',
};

/**
 * Stable per-kind colours, one palette per appearance, spread around the hue circle so neighbouring
 * kinds stay apart. Every value meets WCAG 2.1 AA as text on its appearance's surfaces (verified in
 * the test suite), and colour is never the only carrier of kind: the text token and the kind icon
 * accompany it everywhere.
 */
const kindColors: Record<string, string> = {
  actor: '#2359b5',
  journey: '#6941c6',
  'use-case': '#18794e',
  'business-rule': '#b54708',
  'domain-term': '#8a6100',
  'bounded-context': '#0b7285',
  'functional-requirement': '#b0287a',
  'quality-requirement': '#56607a',
  constraint: '#b42318',
  'structured-behaviour': '#466c10',
};

const kindColorsDark: Record<string, string> = {
  actor: '#80a9ff',
  journey: '#ab8ffa',
  'use-case': '#4fcb8c',
  'business-rule': '#f79c50',
  'domain-term': '#e3b544',
  'bounded-context': '#43c4da',
  'functional-requirement': '#f27ec2',
  'quality-requirement': '#a9b2c5',
  constraint: '#f7776c',
  'structured-behaviour': '#a5d05a',
};

/** The non-colour signal for kind: the artifact family's identifier prefix, shown as text. */
const kindTokens: Record<string, string> = {
  actor: 'ACT',
  journey: 'JRN',
  'use-case': 'UC',
  'business-rule': 'BR',
  'domain-term': 'TERM',
  'bounded-context': 'BC',
  'functional-requirement': 'FR',
  'quality-requirement': 'QR',
  constraint: 'CON',
  'structured-behaviour': 'SB',
};

const statusColors: Record<string, { fg: string; bg: string }> = {
  active: { fg: '#17512a', bg: '#e4efe6' },
  draft: { fg: '#6f5714', bg: '#f7efd6' },
  deprecated: { fg: '#8a4214', bg: '#fae4d6' },
  retired: { fg: '#4f5560', bg: '#eceff3' },
};

const statusColorsDark: Record<string, { fg: string; bg: string }> = {
  active: { fg: '#86e0a6', bg: '#123020' },
  draft: { fg: '#f0cf6a', bg: '#382d0c' },
  deprecated: { fg: '#f6a672', bg: '#3b2210' },
  retired: { fg: '#b8c0cc', bg: '#252b34' },
};

/** Surface tokens. Kind and status tokens are appended from the tables above. */
const lightTokens: Record<string, string> = {
  ink: '#12161d',
  text: '#1f2430',
  muted: '#4f5560',
  line: '#dfe3ea',
  'line-strong': '#bfc6d1',
  bg: '#ffffff',
  panel: '#f6f7f9',
  raise: '#ffffff',
  accent: '#1c4fa3',
  'accent-ink': '#ffffff',
  'accent-soft': '#e8eef8',
  mark: '#fff0b3',
  edge: '#47536b',
  'edge-soft': '#8a93a5',
  scrim: 'rgba(15, 18, 24, 0.32)',
  shadow: '0 12px 32px rgba(17, 24, 39, 0.16), 0 1px 3px rgba(17, 24, 39, 0.1)',
  'glow-near': '42%',
  'glow-far': '16%',
  'glow-line': '1.5px',
  dim: '0.28',
};

const darkTokens: Record<string, string> = {
  ink: '#eef1f5',
  text: '#d4d9e1',
  muted: '#9aa3b2',
  line: '#262d37',
  'line-strong': '#3a4350',
  bg: '#0f1216',
  panel: '#141920',
  raise: '#1a2029',
  accent: '#7aa7ff',
  'accent-ink': '#0b1220',
  'accent-soft': '#1a2640',
  mark: '#5a4a12',
  edge: '#8e9ab0',
  'edge-soft': '#5b6576',
  scrim: 'rgba(0, 0, 0, 0.55)',
  shadow: '0 14px 36px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0, 0, 0, 0.45)',
  'glow-near': '72%',
  'glow-far': '40%',
  'glow-line': '3px',
  dim: '0.24',
};

function tokenBlock(
  surface: Record<string, string>,
  kinds: Record<string, string>,
  statuses: Record<string, { fg: string; bg: string }>,
): string {
  const lines = Object.entries(surface).map(([name, value]) => `  --${name}: ${value};`);
  for (const [kind, value] of Object.entries(kinds)) lines.push(`  --k-${kind}: ${value};`);
  for (const [status, pair] of Object.entries(statuses)) {
    lines.push(`  --st-${status}-fg: ${pair.fg};`, `  --st-${status}-bg: ${pair.bg};`);
  }
  return lines.join('\n');
}

const lightBlock = tokenBlock(lightTokens, kindColors, statusColors);
const darkBlock = tokenBlock(darkTokens, kindColorsDark, statusColorsDark);

const kindClasses = kindOrder.map((k) => `.k-${k} { --kc: var(--k-${k}); }`).join('\n');
const statusClasses = Object.keys(statusColors)
  .map((s) => `.badge.st-${s} { color: var(--st-${s}-fg); background: var(--st-${s}-bg); }`)
  .join('\n');

/**
 * A precise, calm engineering instrument in two appearances: system sans-serif, monospaced
 * identifiers, thin borders, deliberate alignment, low-radius controls, compact density. No
 * gradients, no decorative illustration, no hero typography, no rounded-card dashboard treatment;
 * elevation only marks the transient overlays (the search dialog and a projection's member list).
 */
const style = `
:root {
${lightBlock}
  --sans: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, 'SF Mono', 'Cascadia Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  --master-w: 18.5rem;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-appearance='light']) {
${darkBlock}
    color-scheme: dark;
  }
}
:root[data-appearance='dark'] {
${darkBlock}
  color-scheme: dark;
}
${kindClasses}
${statusClasses}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { height: 100%; }
body {
  margin: 0; display: flex; flex-direction: column; overflow: hidden;
  font: 14px/1.5 var(--sans); color: var(--text); background: var(--bg);
  -webkit-text-size-adjust: 100%;
}
h1, h2, h3, h4, h5, h6 { color: var(--ink); line-height: 1.3; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
button { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
[tabindex='-1']:focus:not(:focus-visible) { outline: none; }
code, kbd, samp, pre, .mono { font-family: var(--mono); }
kbd {
  font-size: 0.72rem; border: 1px solid var(--line-strong); border-bottom-width: 2px;
  border-radius: 3px; padding: 0 0.3rem; color: var(--muted); background: var(--bg);
}
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.skip {
  position: absolute; left: -9999px; top: 0; z-index: 30;
  background: var(--bg); color: var(--accent); padding: 0.5rem 0.75rem; border: 1px solid var(--accent);
}
.skip:focus { left: 0.5rem; top: 0.5rem; }
.sprite { position: absolute; width: 0; height: 0; overflow: hidden; }
.ic {
  width: 1rem; height: 1rem; flex: none; vertical-align: -0.18em;
  fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round;
}

header.site {
  flex: none; display: flex; align-items: center; gap: 0.9rem;
  height: 2.9rem; padding: 0 0.9rem; border-bottom: 1px solid var(--line-strong); background: var(--bg);
}
header.site h1 {
  max-width: min(30vw, 22rem); margin: 0; overflow: hidden; text-overflow: ellipsis;
  font-size: 0.98rem; font-weight: 400; letter-spacing: -0.005em; white-space: nowrap;
}
.revshort {
  font-family: var(--mono); font-size: 0.74rem; color: var(--muted);
  border: 1px solid var(--line); border-radius: 3px; padding: 0.05rem 0.4rem; white-space: nowrap;
}
nav.views { display: flex; align-self: stretch; }
nav.views a {
  display: flex; align-items: center; padding: 0 0.75rem; color: var(--muted);
  font-size: 0.86rem; font-weight: 500; border-bottom: 2px solid transparent;
}
nav.views a:hover { color: var(--ink); text-decoration: none; }
nav.views a[aria-current='page'] { color: var(--ink); border-bottom-color: var(--accent); }
header.site .spacer { flex: 1; }
.findbtn {
  display: flex; align-items: center; gap: 0.5rem; min-width: 15rem; height: 1.95rem;
  padding: 0 0.45rem 0 0.6rem; border: 1px solid var(--line-strong); border-radius: 4px;
  background: var(--panel); color: var(--muted); cursor: pointer;
}
.findbtn:hover { border-color: var(--accent); color: var(--text); }
.findbtn .lbl { flex: 1; text-align: left; }
.seg { display: inline-flex; border: 1px solid var(--line-strong); border-radius: 4px; overflow: hidden; }
.seg button {
  border: 0; background: transparent; padding: 0.28rem 0.45rem; cursor: pointer;
  color: var(--muted); display: flex; align-items: center;
}
.seg button + button { border-left: 1px solid var(--line-strong); }
.seg button[aria-pressed='true'] { background: var(--accent-soft); color: var(--accent); }
.iconbtn {
  border: 1px solid transparent; background: transparent; border-radius: 4px;
  padding: 0.25rem; cursor: pointer; color: var(--muted); display: inline-flex; align-items: center;
}
.iconbtn:hover { border-color: var(--line-strong); color: var(--ink); }
.menubtn { display: none; }
.tbtn {
  display: inline-flex; align-items: center; gap: 0.3rem; border: 1px solid var(--line-strong);
  background: var(--bg); color: var(--text); border-radius: 3px; padding: 0.15rem 0.5rem;
  font-size: 0.78rem; cursor: pointer;
}
.tbtn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.tbtn:disabled { opacity: 0.5; cursor: default; }

main { flex: 1 1 auto; min-height: 0; overflow: hidden; }
main > section { height: 100%; min-height: 0; }
#view-overview { overflow-y: auto; }
#view-focus:not([hidden]), #view-columns:not([hidden]) { display: flex; flex-direction: column; }
#view-artifacts:not([hidden]) { display: flex; flex-direction: column; }
h2.view { margin: 0 0 0.6rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
h3.block { margin: 1.5rem 0 0.55rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
p.lead { margin: 0 0 0.6rem; max-width: 64ch; color: var(--text); }
p.ident { margin: 0 0 1rem; color: var(--muted); font-size: 0.85rem; }
.rev { font-family: var(--mono); color: var(--text); }
.note { color: var(--muted); font-size: 0.82rem; max-width: 72ch; }

.token {
  display: inline-flex; align-items: center; gap: 0.2rem; flex: none;
  font-family: var(--mono); font-size: 0.66rem; font-weight: 700; letter-spacing: 0.03em; line-height: 1.35;
  color: var(--kc, var(--muted));
  border: 1px solid currentColor;
  border: 1px solid color-mix(in srgb, var(--kc, var(--muted)) 45%, transparent);
  border-radius: 3px; padding: 0 0.28em; white-space: nowrap;
}
.token .ic { width: 0.78rem; height: 0.78rem; stroke-width: 1.8; }
.badge {
  font-size: 0.66rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  border-radius: 3px; padding: 0.05em 0.4em; white-space: nowrap;
}

/* ------------------------------------------------------------ overview */
.ovwrap {
  display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 0 2.4rem;
  padding: 1.2rem 1.6rem 3rem; max-width: 96rem;
}
.metrics { display: flex; flex-wrap: wrap; gap: 0 2rem; margin: 0 0 1rem; padding: 0.55rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.metrics dt { color: var(--muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; }
.metrics dd { margin: 0; font-size: 1.35rem; font-variant-numeric: tabular-nums; color: var(--ink); }
.bigfind {
  width: 100%; max-width: 40rem; display: flex; align-items: center; gap: 0.6rem; height: 2.5rem;
  padding: 0 0.6rem 0 0.75rem; border: 1px solid var(--line-strong); border-radius: 4px;
  background: var(--bg); color: var(--muted); cursor: pointer; font-size: 0.92rem;
}
.bigfind:hover { border-color: var(--accent); }
.bigfind .lbl { flex: 1; text-align: left; }
.ovwrap > * { min-width: 0; overflow-wrap: anywhere; }
ul.kinds { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 0 1.4rem; }
ul.kinds li { display: grid; grid-template-columns: auto minmax(0, 1fr) 4.5rem 2rem; align-items: center; gap: 0.5rem; padding: 0.3rem 0; border-bottom: 1px solid var(--line); }
ul.kinds .bar { height: 5px; background: var(--line); border-radius: 1px; overflow: hidden; }
ul.kinds .bar i { display: block; height: 100%; background: var(--kc, var(--muted)); }
ul.kinds .count { font-family: var(--mono); font-variant-numeric: tabular-nums; color: var(--muted); text-align: right; }
.entry { display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: 0.8rem; }
.entry section { border: 1px solid var(--line); border-radius: 4px; padding: 0.6rem 0.75rem; }
.entry h4 { margin: 0 0 0.35rem; font-size: 0.82rem; display: flex; align-items: center; gap: 0.4rem; }
.entry .crit { font-weight: 400; color: var(--muted); font-size: 0.76rem; }
.entry ol, .entry ul { list-style: none; margin: 0; padding: 0; }
.entry li { display: flex; align-items: baseline; gap: 0.45rem; padding: 0.16rem 0; font-size: 0.86rem; }
.entry li .n { margin-left: auto; font: 0.74rem var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.entry ol.steps { padding-left: 1.1rem; margin-bottom: 0.3rem; }
.entry ol.steps li { font-size: 0.8rem; }
.entry ol.steps li .step { font: 0.72rem var(--mono); color: var(--muted); min-width: 1.2rem; }
ul.idlist { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.3rem 0.5rem; }
ul.idlist a { font-family: var(--mono); font-size: 0.8rem; border: 1px solid var(--line); border-radius: 3px; padding: 0.1rem 0.4rem; }
.ovcol > table.grid { display: block; max-width: 100%; overflow-x: auto; overflow-wrap: normal; }
.gridwrap { position: relative; overflow-x: auto; border: 1px solid var(--line); border-radius: 4px; }
table.kgrid { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
table.kgrid caption { caption-side: bottom; text-align: left; color: var(--muted); font-size: 0.78rem; padding: 0.4rem 0.6rem; }
table.kgrid th, table.kgrid td { border-bottom: 1px solid var(--line); padding: 0; text-align: center; }
table.kgrid thead th { padding: 0.35rem 0.15rem; vertical-align: bottom; }
table.kgrid thead th.corner { text-align: right; font-weight: 400; font-size: 0.7rem; color: var(--muted); padding-right: 0.5rem; }
table.kgrid tbody th { text-align: left; padding: 0.2rem 0.6rem 0.2rem 0.5rem; font-weight: 500; font-size: 0.82rem; white-space: nowrap; }
table.kgrid tbody th .token { margin-right: 0.35rem; }
table.kgrid td a {
  display: block; min-width: 2rem; line-height: 1.95rem; color: var(--ink); font: 0.8rem/1.95rem var(--mono);
  background: color-mix(in srgb, var(--accent) var(--p, 10%), transparent);
}
table.kgrid td a:hover { outline: 2px solid var(--accent); outline-offset: -2px; text-decoration: none; }
table.kgrid td.z { color: var(--muted); font: 0.8rem var(--mono); }
table.grid { border-collapse: collapse; font-size: 0.82rem; width: 100%; }
table.grid caption { text-align: left; color: var(--muted); font-size: 0.78rem; padding-bottom: 0.3rem; }
table.grid th, table.grid td { border: 1px solid var(--line); padding: 0.26rem 0.5rem; text-align: left; vertical-align: top; }
table.grid thead th { background: var(--panel); font-weight: 600; }
table.grid td.n, table.grid th.n { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--mono); }
table.grid td.rel { font-family: var(--mono); font-size: 0.76rem; color: var(--muted); }

/* ------------------------------------------------------------ artifacts */
.md {
  flex: 1 1 auto; min-height: 0; display: grid;
  grid-template-columns: var(--master-w) minmax(0, 1fr);
}
body[data-master='rail'] .md { grid-template-columns: 3.4rem minmax(0, 1fr); }
.master {
  min-width: 0; min-height: 0; display: flex; flex-direction: column;
  border-right: 1px solid var(--line-strong); background: var(--panel);
}
.masterhead {
  flex: none; display: flex; align-items: center; gap: 0.5rem;
  height: 2.4rem; padding: 0 0.35rem 0 0.75rem; border-bottom: 1px solid var(--line);
}
.masterhead h3 { margin: 0; font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.07em; }
.masterhead .counts { margin: 0 auto 0 0; font: 0.74rem var(--mono); color: var(--muted); }
body[data-master='rail'] .masterhead { justify-content: center; padding: 0; }
body[data-master='rail'] .masterhead h3, body[data-master='rail'] .masterhead .counts,
body[data-master='rail'] .chips, body[data-master='rail'] .listwrap { display: none; }
.chips { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; padding: 0.45rem 0.6rem; border-bottom: 1px solid var(--line); }
.chip {
  display: inline-flex; align-items: center; gap: 0.3rem; border: 1px solid var(--line-strong);
  background: var(--bg); border-radius: 3px; padding: 0.08rem 0.3rem 0.08rem 0.4rem; font-size: 0.76rem; cursor: pointer;
}
.chip:hover { border-color: var(--accent); }
.chip .x { color: var(--muted); display: inline-flex; }
.chips .clearall { border: 0; background: none; color: var(--accent); cursor: pointer; font-size: 0.76rem; padding: 0.1rem 0.2rem; }
.listwrap { flex: 1 1 auto; min-height: 0; overflow-y: auto; position: relative; }
.kgroup + .kgroup { border-top: 1px solid var(--line); }
.khead {
  position: sticky; top: 0; z-index: 1; width: 100%; display: flex; align-items: center; gap: 0.45rem;
  border: 0; background: var(--panel); padding: 0.42rem 0.6rem 0.42rem 0.45rem; cursor: pointer;
  text-align: left; color: var(--ink); font-weight: 600; font-size: 0.8rem;
}
.khead:hover { background: color-mix(in srgb, var(--panel) 82%, var(--line-strong)); }
.khead .chev { color: var(--muted); display: inline-flex; transition: transform 0.15s; }
.khead[aria-expanded='true'] .chev { transform: rotate(90deg); }
.khead .lbl { flex: 1; }
.khead .n { font: 500 0.74rem var(--mono); color: var(--muted); }
.khead.has-current { box-shadow: inset 3px 0 0 var(--accent); }
.khead .here { color: var(--accent); font-size: 0.7rem; }
.khead:not(.has-current) .here { display: none; }
.kgroup ul { list-style: none; margin: 0; padding: 0 0 0.35rem; }
#artifact-list a {
  display: block; padding: 0.3rem 0.6rem 0.3rem 2.05rem; color: var(--text); border-left: 3px solid transparent;
}
#artifact-list a:hover { background: var(--bg); text-decoration: none; }
#artifact-list a .name { display: block; line-height: 1.35; overflow-wrap: anywhere; }
#artifact-list a .aid { display: block; font: 0.7rem/1.4 var(--mono); color: var(--muted); }
#artifact-list a[aria-current='true'] { background: var(--accent-soft); border-left-color: var(--accent); color: var(--ink); font-weight: 600; }
#artifact-list .empty { padding: 0.8rem 0.75rem; color: var(--muted); font-size: 0.85rem; }
.rail { display: none; flex: 1 1 auto; flex-direction: column; align-items: center; gap: 0.1rem; padding: 0.35rem 0; overflow-y: auto; }
body[data-master='rail'] .rail { display: flex; }
.rail button {
  position: relative; width: 2.6rem; border: 0; background: transparent; border-radius: 4px;
  padding: 0.3rem 0 0.25rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.1rem;
  color: var(--kc, var(--muted));
}
.rail button:hover { background: var(--bg); }
.rail button .t { font: 700 0.6rem var(--mono); color: var(--muted); }
.rail button[aria-current='true'] { background: var(--accent-soft); }
.rail button[aria-current='true'] .t { color: var(--ink); text-decoration: underline; }
.rail button[aria-current='true']::before {
  content: ''; position: absolute; left: -0.4rem; top: 0.35rem; bottom: 0.35rem; width: 3px; background: var(--accent); border-radius: 0 2px 2px 0;
}
.master-credit {
  flex: none; display: flex; align-items: center; gap: 0.4rem;
  min-height: 2.2rem; padding: 0 0.7rem; border-top: 1px solid var(--line);
  color: var(--muted); font-size: 0.68rem;
}
.master-credit:hover { color: var(--accent); text-decoration: none; }
.master-credit .info {
  display: inline-grid; place-items: center; width: 0.9rem; height: 0.9rem;
  border: 1px solid currentColor; border-radius: 50%; font: 600 0.62rem/1 sans-serif;
}
body[data-master='rail'] .master-credit { justify-content: center; padding: 0; }
body[data-master='rail'] .master-credit .label { display: none; }

.detail { min-width: 0; min-height: 0; overflow-y: auto; overflow-wrap: anywhere; padding: 0.8rem 1.6rem 3rem; position: relative; }
.detail > * { max-width: 52rem; }
.detail .placeholder { color: var(--muted); }
.rbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem;
  padding-bottom: 0.55rem; margin-bottom: 0.85rem; border-bottom: 1px solid var(--line);
  font-size: 0.8rem; color: var(--muted);
}
.rbar .backlink { margin: 0 auto 0 0; }
.rbar .pos { font-family: var(--mono); font-size: 0.74rem; padding: 0 0.3rem; }
.detail .idline { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; }
.detail .idline .aid { font-family: var(--mono); font-size: 0.84rem; color: var(--ink); }
.detail .idline .kindname { font-size: 0.78rem; color: var(--muted); }
.detail h3.artifact { margin: 0.3rem 0 0.85rem; font-size: 1.45rem; line-height: 1.25; letter-spacing: -0.012em; text-wrap: balance; }
.detail dl.meta {
  display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0.3rem 1rem; margin: 0 0 0.9rem;
  padding: 0.55rem 0.75rem; border: 1px solid var(--line); border-radius: 4px; background: var(--panel); font-size: 0.84rem;
}
.detail dl.meta dt { color: var(--muted); font-family: var(--mono); font-size: 0.76rem; line-height: 1.6rem; }
.detail dl.meta dd { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; min-height: 1.6rem; }
a.ref {
  display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid var(--line-strong); border-radius: 3px;
  padding: 0.05rem 0.4rem 0.05rem 0.25rem; background: var(--bg); color: var(--text); font-size: 0.82rem;
}
a.ref:hover { border-color: var(--accent); text-decoration: none; }
a.ref .rid { font: 0.7rem var(--mono); color: var(--muted); }
.relsum { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.9rem; margin: 0 0 1rem; font-size: 0.82rem; color: var(--muted); }
.relsum button { border: 0; background: none; padding: 0; color: var(--accent); font-weight: 600; cursor: pointer; }
.detail .body { font-size: 0.95rem; }
.detail .body > * { max-width: 72ch; }
.detail .body h4 { margin: 1.35rem 0 0.35rem; font-size: 1rem; }
.detail .body h4:first-child { margin-top: 0.2rem; }
.detail .body h5 { margin: 1.1rem 0 0.3rem; font-size: 0.9rem; }
.detail .body h6 { margin: 1rem 0 0.3rem; font-size: 0.85rem; }
.detail .body p, .detail .body ul, .detail .body ol { margin: 0.5rem 0; }
.detail .body pre { background: var(--panel); border: 1px solid var(--line); padding: 0.5rem 0.7rem; overflow-x: auto; font-size: 0.82rem; }
.detail .body code { font-size: 0.88em; background: var(--panel); border: 1px solid var(--line); border-radius: 3px; padding: 0 0.25em; }
.detail .body pre code { background: none; border: 0; padding: 0; }
a.idlink { font-family: var(--mono); font-size: 0.9em; border-bottom: 1px dotted currentColor; }
a.idlink:hover { text-decoration: none; border-bottom-style: solid; }
.rels { margin-top: 1.8rem; border-top: 1px solid var(--line-strong); padding-top: 0.5rem; }
.rels h4.relhead { margin: 0 0 0.2rem; font-size: 0.85rem; }
.rels h5 { margin: 1rem 0 0.4rem; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); display: flex; gap: 0.4rem; }
.rels h5 .total { font-family: var(--mono); }
.rels ul { list-style: none; margin: 0; padding: 0; font-size: 0.86rem; }
.rels li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.4rem; padding: 0.2rem 0; border-bottom: 1px solid var(--line); }
.rels li:last-child { border-bottom: none; }
.rels .dir { font-family: var(--mono); font-size: 0.78rem; color: var(--muted); flex: none; }
.rels .aid { font-size: 0.74rem; color: var(--muted); }
.rels .none { color: var(--muted); font-size: 0.85rem; }
.glabel { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; }
.glabel .verb { color: var(--ink); font-weight: 600; }
.glabel .of { color: var(--muted); }
.glabel .gcount {
  margin-left: auto; font-family: var(--mono); font-size: 0.74rem; font-variant-numeric: tabular-nums;
  border: 1px solid var(--line-strong); border-radius: 3px; padding: 0 0.35em; flex: none; color: var(--muted);
}
details.relgroup, .relsolo { border: 1px solid var(--line); border-radius: 4px; margin: 0.35rem 0; background: var(--bg); }
details.relgroup > summary { cursor: pointer; padding: 0.35rem 0.6rem; font-size: 0.82rem; list-style: none; display: flex; align-items: center; gap: 0.45rem; }
details.relgroup > summary::-webkit-details-marker { display: none; }
details.relgroup > summary::before { content: '\\25B8'; color: var(--muted); font-size: 0.7rem; transition: transform 0.15s; }
details.relgroup[open] > summary::before { transform: rotate(90deg); }
details.relgroup > summary > .glabel { flex: 1; min-width: 0; }
details.relgroup[open] > summary { border-bottom: 1px solid var(--line); }
.relsolo > p.glabel { margin: 0; padding: 0.35rem 0.6rem; font-size: 0.82rem; border-bottom: 1px solid var(--line); }
ul.members { padding: 0.1rem 0.6rem 0.3rem; }
details.relgroup.hl, .relsolo.hl { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.unknown { border: 1px solid var(--line-strong); border-left: 3px solid var(--muted); padding: 0.7rem 0.9rem; max-width: 60rem; }
.unknown .aid { font-family: var(--mono); }

/* ------------------------------------------------------------ maps */
.ovhead {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 1.2rem;
  padding: 0.7rem 1.2rem 0.65rem; border-bottom: 1px solid var(--line);
}
.ovhead h2.view { margin: 0; }
.ovhead .ident { margin: 0; }
.ovhead .lead { flex-basis: 100%; margin: 0; font-size: 0.84rem; color: var(--muted); max-width: none; }
.ovhead [role='search'] { flex: 1 1 18rem; max-width: 30rem; }
.ovhead .bigfind { height: 2rem; font-size: 0.86rem; }
.tofacts { font-size: 0.8rem; }
.mapbar { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 1rem; min-height: 2.6rem; padding: 0.35rem 1.2rem; border-bottom: 1px solid var(--line); }
.mapbar h2.view { margin: 0; }
.mapbar .note { margin: 0; }
.trail ol { list-style: none; display: flex; flex-wrap: wrap; align-items: center; gap: 0.2rem; margin: 0; padding: 0; font-size: 0.8rem; }
.trail li + li::before { content: '›'; color: var(--muted); margin-right: 0.2rem; }
.trail [aria-current] { color: var(--ink); font-weight: 600; }
.mapbox { position: relative; flex: 1 1 auto; min-height: 0; overflow: hidden; background: var(--panel); border-bottom: 1px solid var(--line); }
#view-overview .mapbox { flex: none; height: max(24rem, calc(100vh - 9.6rem)); }
.mapview { position: absolute; inset: 0; overflow: hidden; cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; }
.mapview[data-dragging] { cursor: grabbing; }
.mapview:focus-visible { outline: 2px solid var(--accent); outline-offset: -3px; }
.maphint {
  position: absolute; left: 0.7rem; top: 0.5rem; z-index: 2; margin: 0; max-width: calc(100% - 12rem);
  padding: 0.1rem 0.4rem; font-size: 0.72rem; color: var(--muted); background: var(--panel); pointer-events: none;
}
.mapctl { position: absolute; right: 0.7rem; top: 0.5rem; z-index: 3; display: flex; gap: 0.25rem; }
.mapctl .tbtn { min-width: 1.9rem; justify-content: center; }
.plane { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
svg.edges { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
svg.edges path { fill: none; stroke: var(--kc, var(--edge)); stroke-width: 1.3; opacity: 0.34; }
.mapview[data-attending] svg.edges path { opacity: 0.07; }
.mapview[data-attending] svg.edges path.lit, #map-overview svg.edges path.lit {
  opacity: 1; stroke-width: 2.4; filter: drop-shadow(0 0 var(--glow-line) var(--kc, var(--edge)));
}
.tile { position: absolute; border: 1px dashed var(--line-strong); border-radius: 4px; }
.tile-h {
  position: absolute; left: 10px; top: 6px; right: 10px; display: flex; align-items: center; gap: 0.4rem;
  font-size: 12.5px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden;
}
.tile-h .n, .colhead .n { font-family: var(--mono); font-weight: 500; color: var(--muted); }
.ctx {
  position: absolute; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted);
}
.colhead { position: absolute; display: flex; align-items: center; gap: 0.45rem; font-size: 14px; font-weight: 600; color: var(--ink); white-space: nowrap; }
.mchip, .fbox, .dot { position: absolute; margin: 0; cursor: pointer; transition: opacity 0.15s, box-shadow 0.15s; }
.mchip {
  display: block; padding: 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;
  font: 600 11px/22px var(--mono); color: var(--kc); background: var(--bg);
  border: 1px solid color-mix(in srgb, var(--kc) 55%, transparent); border-left: 4px solid var(--kc); border-radius: 3px;
}
.fbox {
  display: grid; grid-template-columns: 20px minmax(0, 1fr); column-gap: 8px; align-content: center;
  padding: 4px 10px; overflow: hidden; text-align: left; color: var(--text); background: var(--bg);
  border: 1px solid color-mix(in srgb, var(--kc) 55%, transparent); border-left: 5px solid var(--kc); border-radius: 3px;
}
.fbox > .ic { grid-row: 1 / 4; width: 20px; height: 20px; color: var(--kc); }
.fbox .bid, .fbox .bkind { font: 700 12px/1.35 var(--mono); color: var(--kc); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fbox .bkind { font-family: var(--sans); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; font-size: 10.5px; }
.fbox .bt { font-size: 12.5px; line-height: 1.3; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fbox .rel { font: 11px/1.35 var(--mono); color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 2.4rem; }
.fbox .more { position: absolute; right: 8px; bottom: 4px; font: 600 11px var(--mono); color: var(--accent); }
.fbox.centre { cursor: pointer; border-width: 2px; border-left-width: 6px; border-color: var(--kc); }
.fbox.centre .bid { font-size: 14px; }
.fbox.centre .bt { font-size: 15px; font-weight: 600; white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.fgroup {
  position: absolute; display: flex; align-items: center; gap: 0.4rem; padding: 0 8px; text-align: left; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--ink); background: var(--panel); border: 1px dashed var(--line-strong); border-radius: 3px;
}
.fgroup .chev { display: inline-flex; color: var(--muted); transition: transform 0.15s; }
.fgroup[aria-expanded='true'] .chev { transform: rotate(90deg); }
.fgroup[aria-expanded='false'] { border-style: solid; background: var(--bg); }
.fgroup .lbl { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.fgroup .n { margin-left: auto; font-family: var(--mono); color: var(--muted); }
.dot {
  padding: 0; border-radius: 2px; opacity: 0.5;
  background: color-mix(in srgb, var(--kc) 30%, var(--panel)); border: 1px solid var(--kc);
}
.dot:hover, .dot:focus-visible { opacity: 1; }
/* The neon highlight: the attended artifact, its neighbours and their lines glow in their kind
   colour, everything else dims. The glow is tuned per appearance; the heavier border and the
   dimming carry the same state without colour. */
.mchip.lit, .fbox.lit, .dot.lit, .fbox.centre {
  border-color: var(--kc); opacity: 1;
  box-shadow: 0 0 0 1px var(--kc), 0 0 10px color-mix(in srgb, var(--kc) var(--glow-near), transparent), 0 0 26px color-mix(in srgb, var(--kc) var(--glow-far), transparent);
}
.mchip.lit { border-width: 2px 2px 2px 4px; line-height: 20px; }
.mapview[data-attending] .mchip:not(.lit), .mapview[data-attending] .fbox:not(.lit):not(.centre), .mapview[data-attending] .dot:not(.lit) { opacity: var(--dim); }
.mchip.sel, .fbox.sel { outline: 2px solid var(--ink); outline-offset: 2px; }
.mchip:focus-visible, .fbox:focus-visible, .fgroup:focus-visible, .dot:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.lensbtn {
  display: inline-flex; align-items: center; gap: 0.35rem; height: 1.95rem; padding: 0 0.55rem;
  border: 1px solid var(--line-strong); border-radius: 4px; background: var(--bg); color: var(--muted); cursor: pointer; font-size: 0.82rem;
}
.lensbtn:hover { border-color: var(--accent); color: var(--text); }
.lensbtn[aria-pressed='true'] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.mcard {
  position: fixed; left: 1rem; bottom: 1rem; z-index: 8; width: min(31rem, calc(100vw - 2rem)); max-height: min(60vh, 34rem);
  overflow-y: auto; overflow-wrap: anywhere; padding: 0.65rem 0.9rem 0.75rem; font-size: 0.84rem;
  background: var(--raise); border: 1px solid var(--line-strong); border-top: 3px solid var(--kc, var(--accent)); border-radius: 4px; box-shadow: var(--shadow);
}
.mcard[data-passive] { pointer-events: none; }
.mcard .cardfold {
  display: none; position: sticky; float: right; top: 0; margin: -0.2rem -2.6rem 0 0; width: 2.4rem; height: 2.4rem;
  justify-content: center; align-items: center; background: var(--raise);
}
.mcard .cardfold .ic { transform: rotate(90deg); }
.mcard[data-folded] .cardfold .ic { transform: rotate(-90deg); }
@media (min-width: 56.3rem) {
  body[data-lens='business'] .mcard { left: auto; right: 1rem; top: 7.6rem; bottom: 1rem; width: min(26rem, 40vw); max-height: none; }
}
.mcard .idline { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
.mcard .aid { font: 0.8rem var(--mono); color: var(--ink); }
.mcard h3.ctitle { margin: 0.25rem 0 0.35rem; font-size: 1.02rem; line-height: 1.3; }
.mcard .ckind { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--kc, var(--muted)); }
.mcard .cnote { color: var(--muted); }
.mcard p { margin: 0.2rem 0; }
.mcard .cfoot { margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px solid var(--line); }
.mcard .csec { margin-top: 0.55rem; }
.mcard .csec h4 { margin: 0 0 0.15rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); }
.mcard .csec ul { list-style: none; margin: 0; padding: 0; }
.mcard .csec li { padding: 0.1rem 0; }
.mcard .cquote { margin: 0.1rem 0 0.2rem; padding-left: 0.6rem; border-left: 2px solid var(--line-strong); color: var(--text); }
.mcard .none { color: var(--muted); font-style: italic; }
.mcard dl.gwt { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0 0.5rem; margin: 0.1rem 0 0.25rem 0.6rem; }
.mcard dl.gwt dt { font-weight: 600; color: var(--muted); }
.mcard dl.gwt dd { margin: 0; }
.detail .lenscard { position: static; width: auto; max-height: none; margin: 0 0 1rem; box-shadow: none; z-index: auto; }

/* ------------------------------------------------------------ dialogs */
.dlg {
  position: fixed; inset: 0; z-index: 20; background: var(--scrim);
  display: flex; align-items: flex-start; justify-content: center; padding: 9vh 1rem 1rem;
}
.dlgbox {
  width: min(44rem, 100%); max-height: 78vh; display: flex; flex-direction: column;
  background: var(--raise); border: 1px solid var(--line-strong); border-radius: 6px; box-shadow: var(--shadow); overflow: hidden;
}
.dlghead { display: flex; align-items: center; gap: 0.6rem; padding: 0 0.6rem 0 0.9rem; border-bottom: 1px solid var(--line); }
.dlghead h2 { margin: 0; font-size: 0.9rem; flex: 1; padding: 0.7rem 0; }
.pin { display: flex; align-items: center; gap: 0.6rem; padding: 0 0.6rem 0 0.9rem; border-bottom: 1px solid var(--line); color: var(--muted); }
.pin input { flex: 1; height: 3rem; border: 0; outline: 0; background: transparent; font: inherit; font-size: 1rem; color: var(--ink); }
.pchips { display: grid; gap: 0.35rem; padding: 0.5rem 0.9rem; border-bottom: 1px solid var(--line); }
.pchips .row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; }
.pchips .row > span { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); min-width: 3.6rem; }
.fchip {
  display: inline-flex; align-items: center; gap: 0.3rem; border: 1px solid var(--line-strong); background: var(--bg);
  color: var(--text); border-radius: 3px; padding: 0.08rem 0.4rem 0.08rem 0.3rem; cursor: pointer; font-size: 0.76rem;
}
.fchip[aria-pressed='true'] { border-color: var(--accent); background: var(--accent-soft); color: var(--ink); }
.qstatus { margin: 0; padding: 0.4rem 0.9rem 0.1rem; font-size: 0.74rem; color: var(--muted); min-height: 1.4rem; }
ul.results { list-style: none; margin: 0; padding: 0 0 0.3rem; overflow-y: auto; flex: 1 1 auto; min-height: 0; }
ul.results li { padding: 0.35rem 0.9rem; border-left: 3px solid transparent; }
ul.results li[data-active='true'] { background: var(--accent-soft); border-left-color: var(--accent); }
ul.results li.empty { color: var(--muted); font-size: 0.85rem; }
ul.results .hithead { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.4rem; }
ul.results .hithead a { color: var(--ink); font-weight: 550; }
ul.results .hithead .aid { margin-left: auto; font-size: 0.74rem; color: var(--muted); }
ul.results .snippet { display: block; margin-top: 0.1rem; font-size: 0.78rem; color: var(--muted); overflow-wrap: anywhere; }
.dlgfoot { display: flex; flex-wrap: wrap; gap: 0.9rem; padding: 0.4rem 0.9rem; border-top: 1px solid var(--line); font-size: 0.74rem; color: var(--muted); background: var(--panel); }
dl.keys { display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1rem; margin: 0; padding: 0.9rem; font-size: 0.86rem; }
dl.keys dt { text-align: right; }
dl.keys dd { margin: 0; }
.toast {
  position: fixed; left: 50%; bottom: 1.4rem; transform: translateX(-50%); z-index: 40; margin: 0;
  background: var(--ink); color: var(--bg); padding: 0.4rem 0.75rem; border-radius: 4px; font-size: 0.8rem;
  opacity: 0; pointer-events: none; transition: opacity 0.18s;
}
.toast[data-on] { opacity: 1; }

@media (max-width: 76rem) {
  .findbtn { min-width: 0; }
  .lensbtn .lbl { display: none; }
  .findbtn .lbl, .findbtn kbd { display: none; }
}
@media (max-width: 70rem) {
  .ovwrap { grid-template-columns: minmax(0, 1fr); padding: 1rem; }
}
@media (max-width: 62rem) {
  .md, body[data-master='rail'] .md { grid-template-columns: minmax(0, 1fr); }
  .master { border-right: none; }
  .rail, #master-toggle, .revshort, .master-credit { display: none; }
  body[data-master='rail'] .masterhead { justify-content: flex-start; padding: 0 0.35rem 0 0.75rem; }
  body[data-master='rail'] .masterhead h3, body[data-master='rail'] .masterhead .counts { display: block; }
  body[data-master='rail'] .listwrap { display: block; }
  body[data-pane='detail'] .master, body[data-pane='master'] .detail { display: none; }
  .detail { padding: 0.8rem 1rem 3rem; }
  header.site { gap: 0.5rem; padding: 0 0.6rem; }
  nav.views a { padding: 0 0.5rem; }
  .detail dl.meta { grid-template-columns: minmax(0, 1fr); gap: 0.1rem; }
  .detail dl.meta dt { line-height: 1.4rem; }
  .detail dl.meta dd { margin-bottom: 0.35rem; }
  a.ref { max-width: 100%; flex-wrap: wrap; }
}
/* A phone. The header keeps the title, search and one menu button; the views and display
   options open beneath it on request. Text and controls grow to a size read and touched
   comfortably; the maps keep their own pixel scale. */
@media (max-width: 40rem) {
  html { font-size: 17px; }
  body { font-size: 15px; }
  header.site {
    display: grid; grid-template-columns: minmax(0, 1fr) auto auto;
    height: auto; padding: 0.25rem 0.5rem; gap: 0 0.35rem;
  }
  header.site h1 {
    grid-column: 1; grid-row: 1; min-width: 0; max-width: none; margin: 0; overflow: hidden;
    font-size: 1rem; text-overflow: ellipsis;
  }
  header.site .spacer, header.site .revshort, #keys-open { display: none; }
  header.site .findbtn, header.site .menubtn {
    grid-row: 1; width: 2.6rem; height: 2.6rem; min-width: 0; padding: 0; justify-content: center;
  }
  header.site .findbtn { grid-column: 2; }
  header.site .menubtn { grid-column: 3; display: inline-flex; border-color: var(--line-strong); }
  header.site .findbtn .ic, header.site .menubtn .ic { width: 1.15rem; height: 1.15rem; }
  header.site nav.views, header.site .lensbtn, header.site .seg { display: none; }
  body[data-menu='open'] header.site nav.views {
    display: flex; flex-direction: column; grid-column: 1 / -1; grid-row: 2;
    margin-top: 0.25rem; padding-top: 0.25rem; border-top: 1px solid var(--line);
  }
  body[data-menu='open'] header.site nav.views a {
    min-height: 2.6rem; padding: 0 0.6rem; font-size: 1rem;
    border-bottom: 0; border-left: 3px solid transparent;
  }
  body[data-menu='open'] header.site nav.views a[aria-current='page'] { border-left-color: var(--accent); background: var(--accent-soft); }
  body[data-menu='open'] header.site .lensbtn,
  body[data-menu='open'] header.site .seg { display: inline-flex; grid-row: 3; margin: 0.35rem 0 0.3rem; }
  body[data-menu='open'] header.site .lensbtn { grid-column: 1 / -1; justify-self: start; height: 2.6rem; font-size: 0.9rem; }
  body[data-menu='open'] header.site .lensbtn .lbl { display: inline; }
  body[data-menu='open'] header.site .seg { grid-column: 1 / -1; justify-self: end; }
  header.site .seg button { min-width: 2.6rem; min-height: 2.6rem; justify-content: center; }
  .tbtn { min-height: 2.4rem; padding: 0.2rem 0.65rem; font-size: 0.82rem; }
  .bigfind, .ovhead .bigfind { height: 2.75rem; font-size: 0.95rem; }
  .ovhead .bigfind kbd, .bigfind kbd { display: none; }
  .tofacts { display: inline-block; padding: 0.4rem 0; }
  .maphint { display: none; }
  .mapctl .tbtn { min-width: 2.6rem; }
  .mcard { left: 0.5rem; right: 0.5rem; bottom: 0.5rem; width: auto; max-height: 40vh; padding: 0.55rem 0.8rem 0.65rem; }
  #mcard { padding-right: 2.9rem; }
  .mcard .cardfold { display: inline-flex; }
  .mcard[data-folded] { max-height: none; }
  .mcard[data-folded] > :not(.idline):not(.chead):not(.ctitle):not(.cardfold) { display: none; }
  .mcard[data-folded] h3.ctitle { margin-bottom: 0; }
}
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
}
`.trim();

/**
 * The application block. Static string, so the file stays byte-identical for identical content.
 * One router owns every state transition; views render from the inert data on demand; nothing is
 * persisted anywhere but the address; text is written with textContent and only the Markdown the
 * generator already escaped is assigned as HTML.
 */
const script = String.raw`
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var explorerTitle = doc.title;
  var dataEl = doc.getElementById('explorer-data');
  if (!dataEl) return;
  var DATA = JSON.parse(dataEl.textContent || '{}');
  var ARTIFACTS = DATA.artifacts || [];
  var EDGES = DATA.edges || [];
  var LABELS = DATA.kindLabels || {};
  var TOKENS = DATA.kindTokens || {};
  var ORDER = DATA.kindOrder || [];
  var NS = 'http://www.w3.org/2000/svg';
  var hasOwn = function (o, k) {
    return Object.prototype.hasOwnProperty.call(o, k);
  };

  var byId = {};
  for (var i = 0; i < ARTIFACTS.length; i += 1) byId[ARTIFACTS[i].id] = ARTIFACTS[i];

  var outgoing = {};
  var incoming = {};
  for (var e = 0; e < EDGES.length; e += 1) {
    var edge = EDGES[e];
    (outgoing[edge.from] = outgoing[edge.from] || []).push(edge);
    (incoming[edge.to] = incoming[edge.to] || []).push(edge);
  }

  var el = function (tag, cls, text) {
    var node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  var clear = function (node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  };

  /* ------------------------------------------------------------------ icons */

  /* Drawn on a 16px grid and defined once as symbols, so the file carries each shape a single
     time and nothing is ever fetched. Created at start-up rather than in the opening document,
     which stays free of drawing markup. */
  var ICONS = {
    actor: '<circle cx="8" cy="5" r="2.7"/><path d="M2.8 14c.5-3.1 2.6-4.7 5.2-4.7s4.7 1.6 5.2 4.7"/>',
    journey: '<circle cx="3" cy="12.8" r="1.5"/><path d="M4.5 12.8h3.2a2.3 2.3 0 0 0 0-4.6H6.3a2.3 2.3 0 0 1 0-4.6h4.2"/><path d="M11.5 1.8v4.4M11.5 2h3l-.9 1.2.9 1.2h-3"/>',
    'use-case': '<ellipse cx="8" cy="8" rx="6.3" ry="4.4"/><path d="M6.9 6.2v3.6L9.9 8z" fill="currentColor" stroke-width="1"/>',
    'business-rule': '<path d="M8 2.2v11.3M5 13.5h6M3.2 4.6h9.6M8 2.8l-4.8 1.8M8 2.8l4.8 1.8"/><path d="M3.2 4.8L1.5 9a1.8 1.8 0 0 0 3.4 0z"/><path d="M12.8 4.8L11.1 9a1.8 1.8 0 0 0 3.4 0z"/>',
    'domain-term': '<path d="M2 3.4h4.2A1.8 1.8 0 0 1 8 5.2v8.3a1.6 1.6 0 0 0-1.6-1.4H2z"/><path d="M14 3.4H9.8A1.8 1.8 0 0 0 8 5.2v8.3a1.6 1.6 0 0 1 1.6-1.4H14z"/>',
    'bounded-context': '<rect x="1.8" y="1.8" width="12.4" height="12.4" rx="2" stroke-dasharray="2.4 1.9"/><circle cx="8" cy="8" r="2"/>',
    'functional-requirement': '<path d="M2 4.4l1.3 1.3L5.6 3.3M2 10.4l1.3 1.3 2.3-2.4M8 4.6h6M8 10.6h6"/>',
    'quality-requirement': '<path d="M2.2 11.8a5.8 5.8 0 1 1 11.6 0"/><path d="M8 11.8l3-3.4"/><circle cx="8" cy="11.8" r="1" fill="currentColor"/><path d="M4.2 7.6l.8.6M8 5.4v1M11.8 7.6l-.8.6"/>',
    constraint: '<rect x="3" y="7" width="10" height="7.2" rx="1.3"/><path d="M5.3 7V5.1a2.7 2.7 0 0 1 5.4 0V7M8 9.8v1.6"/>',
    'structured-behaviour': '<rect x="1.6" y="1.8" width="5" height="3.8" rx=".7"/><rect x="9.4" y="10.4" width="5" height="3.8" rx=".7"/><path d="M4.1 5.6v4.6a2 2 0 0 0 2 2h3.3M8 10.6l1.5 1.6L8 13.8"/>',
    other: '<rect x="3" y="3" width="10" height="10" rx="2"/>',
    search: '<circle cx="7" cy="7" r="4.6"/><path d="M10.5 10.5L14 14"/>',
    sun: '<circle cx="8" cy="8" r="2.9"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>',
    moon: '<path d="M13.3 10.1A5.6 5.6 0 0 1 5.9 2.7a5.6 5.6 0 1 0 7.4 7.4z"/>',
    auto: '<rect x="1.8" y="2.5" width="12.4" height="8.4" rx="1.2"/><path d="M5.5 13.8h5M8 10.9v2.9"/>',
    panel: '<rect x="1.8" y="2.3" width="12.4" height="11.4" rx="1.5"/><path d="M6 2.3v11.4M3.4 5h1M3.4 7h1M3.4 9h1"/>',
    keys: '<rect x="1.5" y="4" width="13" height="8.4" rx="1.3"/><path d="M4 6.6h.5M6.5 6.6H7M9 6.6h.5M11.5 6.6h.5M4.6 9.8h6.8"/>',
    chev: '<path d="M6 3.8L10.2 8 6 12.2"/>',
    prev: '<path d="M10 3.8L5.8 8l4.2 4.2"/>',
    copy: '<rect x="5.3" y="5.3" width="8.4" height="8.4" rx="1.2"/><path d="M10.7 5.3V3.5a1.2 1.2 0 0 0-1.2-1.2H3.5a1.2 1.2 0 0 0-1.2 1.2v6a1.2 1.2 0 0 0 1.2 1.2h1.8"/>',
    link: '<path d="M6.7 9.3a2.9 2.9 0 0 0 4.1 0l2.3-2.3a2.9 2.9 0 0 0-4.1-4.1l-.9.9M9.3 6.7a2.9 2.9 0 0 0-4.1 0L2.9 9a2.9 2.9 0 0 0 4.1 4.1l.9-.9"/>',
    close: '<path d="M4 4l8 8M12 4l-8 8"/>',
    focus: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2.6M8 11.9v2.6M1.5 8h2.6M11.9 8h2.6"/><circle cx="8" cy="8" r="5.2"/>',
    menu: '<path d="M2.5 4.2h11M2.5 8h11M2.5 11.8h11"/>',
    lens: '<path d="M1.5 8s2.4-4.6 6.5-4.6S14.5 8 14.5 8s-2.4 4.6-6.5 4.6S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2.1"/>',
  };
  var injectSprite = function () {
    var parts = [];
    for (var name in ICONS) {
      if (hasOwn(ICONS, name)) parts.push('<symbol id="i-' + name + '" viewBox="0 0 16 16">' + ICONS[name] + '</symbol>');
    }
    var holder = doc.createElement('div');
    holder.className = 'sprite';
    holder.setAttribute('aria-hidden', 'true');
    holder.innerHTML = '<svg width="0" height="0" focusable="false">' + parts.join('') + '</svg>';
    doc.body.insertBefore(holder, doc.body.firstChild);
  };
  var icon = function (name) {
    var svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'ic');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = doc.createElementNS(NS, 'use');
    use.setAttribute('href', '#i-' + (hasOwn(ICONS, name) ? name : 'other'));
    svg.appendChild(use);
    return svg;
  };
  /** Kind icons join the tokens and icon controls the generator emitted as plain markup. */
  var decorate = function (scope) {
    var tokens = scope.querySelectorAll('.token[data-kind]');
    for (var t = 0; t < tokens.length; t += 1) {
      if (!tokens[t].querySelector('svg')) tokens[t].insertBefore(icon(tokens[t].getAttribute('data-kind')), tokens[t].firstChild);
    }
    var marked = scope.querySelectorAll('[data-icon]');
    for (var m = 0; m < marked.length; m += 1) {
      if (!marked[m].querySelector('svg')) marked[m].insertBefore(icon(marked[m].getAttribute('data-icon')), marked[m].firstChild);
    }
  };
  var tokenFor = function (kind) {
    var span = el('span', 'token k-' + kind);
    span.setAttribute('data-kind', kind);
    span.title = LABELS[kind] || kind;
    span.appendChild(icon(kind));
    span.appendChild(doc.createTextNode(TOKENS[kind] || '?'));
    return span;
  };
  var KNOWN_STATUS = { active: 1, draft: 1, deprecated: 1, retired: 1 };
  var badgeFor = function (status) {
    return el('span', 'badge st-' + (KNOWN_STATUS[status] ? status : 'retired'), status || 'unknown');
  };

  /* ---------------------------------------------------------------- routing */

  var views = ['overview', 'focus', 'columns', 'artifacts'];

  /*
   * Everything the reader can share lives in the address, in a fixed serialization order so identical
   * states produce identical addresses: k = kind, s = status, c = bounded context, f = name/ID filter
   * (inbound from earlier pages), q = search query while the search dialog is open, x = the Focus
   * view groups whose disclosure the reader flipped, a = chosen appearance, m = collapsed master
   * area, l = the business lens.
   */
  var CAT_KEYS = ['k', 's', 'c', 'f', 'q', 'x', 'a', 'm', 'l'];
  var PRESENTATION = ['a', 'm', 'l'];
  var emptyCat = function () {
    return { k: null, s: null, c: null, f: null, q: null, x: null, a: null, m: null, l: null };
  };
  var catWith = function (base, changes) {
    var cat = emptyCat();
    for (var i = 0; i < CAT_KEYS.length; i += 1) {
      var key = CAT_KEYS[i];
      cat[key] = base && base[key] ? base[key] : null;
      if (changes && hasOwn(changes, key)) cat[key] = changes[key] || null;
    }
    return cat;
  };
  var catQuery = function (cat) {
    if (!cat) return '';
    var parts = [];
    for (var i = 0; i < CAT_KEYS.length; i += 1) {
      var key = CAT_KEYS[i];
      if (cat[key]) parts.push(key + '=' + encodeURIComponent(cat[key]));
    }
    return parts.length > 0 ? '?' + parts.join('&') : '';
  };
  var catParse = function (query) {
    var cat = emptyCat();
    if (!query) return cat;
    var pairs = query.split('&');
    for (var i = 0; i < pairs.length; i += 1) {
      var eq = pairs[i].indexOf('=');
      if (eq < 1) continue;
      var key = pairs[i].slice(0, eq);
      if (CAT_KEYS.indexOf(key) < 0) continue;
      try {
        cat[key] = decodeURIComponent(pairs[i].slice(eq + 1)) || null;
      } catch (err) {
        /* An undecodable value is treated as absent rather than crashing the address. */
      }
    }
    if (cat.a !== 'light' && cat.a !== 'dark') cat.a = null;
    if (cat.m !== 'rail') cat.m = null;
    if (cat.l !== 'b') cat.l = null;
    if (cat.x && !/^[a-z-]+(,[a-z-]+)*$/.test(cat.x)) cat.x = null;
    return cat;
  };

  var parseHash = function (raw) {
    var hash = (raw || '').replace(/^#/, '');
    var q = hash.indexOf('?');
    var cat = emptyCat();
    if (q >= 0) {
      cat = catParse(hash.slice(q + 1));
      hash = hash.slice(0, q);
    }
    if (hash === '' || hash === '/') return { view: 'overview', id: null, legacy: false, cat: cat };
    var routed = /^\/(overview|focus|columns|artifacts)(?:\/(.+))?$/.exec(hash);
    if (routed) {
      var routedId = null;
      try {
        routedId = routed[2] ? decodeURIComponent(routed[2]) : null;
      } catch (err) {
        routedId = routed[2];
      }
      return { view: routed[1], id: routedId, legacy: false, cat: cat };
    }
    /* Routes earlier Product Explorer pages (formerly Product Snapshots) produced for their projections resolve in place: a focused
       projection becomes the Focus view, the others the Overview. */
    var focused = /^\/graph\/focus\/(.+)$/.exec(hash);
    if (focused) {
      return { view: 'focus', id: decodeURIComponent(focused[1]), legacy: false, cat: cat, stale: true };
    }
    if (hash === '/graph' || hash === '/graph/layers' || hash === '/graph/focus') {
      return { view: 'overview', id: null, legacy: false, cat: cat, stale: true };
    }
    /* Legacy fragment produced by earlier Product Explorer pages (formerly Product Snapshots): a bare artifact identifier. Permanent. */
    if (/^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/.test(hash)) {
      return { view: 'artifacts', id: hash, legacy: true, cat: cat };
    }
    return { view: 'artifacts', id: null, legacy: false, bad: hash, cat: cat };
  };

  /* Which address keys each view carries: the Catalog's discovery travels with the Reader and the
     Focus view, so returning to the list resumes it; disclosure belongs to the Focus view only. */
  var onlyKeys = function (cat, keys) {
    var out = emptyCat();
    for (var i = 0; i < keys.length; i += 1) out[keys[i]] = cat[keys[i]] || null;
    return out;
  };
  var hashFor = function (next) {
    var path = next.id ? '/' + next.id : '';
    if (next.view === 'artifacts') return '#/artifacts' + path + catQuery(catWith(next.cat, { x: null }));
    if (next.view === 'focus') return '#/focus' + path + catQuery(next.cat);
    var shared = catQuery(onlyKeys(next.cat, ['q', 'a', 'm', 'l']));
    if (next.view === 'columns') return '#/columns' + path + shared;
    return (next.id ? '#/overview' + path : '#/') + shared;
  };

  var state = { view: 'overview', id: null, cat: emptyCat(), unknown: null };
  var suppress = false;

  /** The discovery an artifact link carries: the filters, never the open dialog or disclosure. */
  var linkCat = function () {
    return catWith(state.cat, { q: null, x: null, a: null, m: null, l: null });
  };
  var artifactHref = function (id) {
    return '#/artifacts/' + id + catQuery(linkCat());
  };

  /**
   * The single owner of state transitions. Every surface calls this; none mutates state. The
   * reader's presentation choices ride along on every transition unless one of them is the change.
   */
  var go = function (next, mode, keepPresentation) {
    var cat = catWith(next.cat, {});
    if (keepPresentation !== false) {
      for (var p = 0; p < PRESENTATION.length; p += 1) cat[PRESENTATION[p]] = state.cat[PRESENTATION[p]];
    }
    var resolved = { view: next.view, id: next.id || null, cat: cat, unknown: next.unknown || null };
    var target = hashFor(resolved);
    if (mode === 'replace') {
      var replaced = false;
      try {
        history.replaceState(null, '', target);
        replaced = true;
      } catch (err) {
        /* Some browsers refuse history manipulation on file:// URLs. */
      }
      if (!replaced && location.hash !== target) {
        suppress = true;
        location.hash = target;
      }
      state = resolved;
      render();
      return;
    }
    if (location.hash === target) {
      state = resolved;
      render();
      return;
    }
    location.hash = target;
  };

  var fromAddress = function () {
    var parsed = parseHash(location.hash);
    var unknown = null;
    if (parsed.id && !byId[parsed.id]) unknown = parsed.id;
    if (parsed.bad) unknown = parsed.bad;
    if ((parsed.legacy || parsed.stale) && !unknown) {
      /* Resolve, then normalize in place so no redundant history entry is created. */
      state.cat = catWith(state.cat, { a: parsed.cat.a, m: parsed.cat.m, l: parsed.cat.l });
      go({ view: parsed.view, id: parsed.id, cat: parsed.cat }, 'replace');
      syncFind();
      return;
    }
    if (parsed.view === 'focus' && !parsed.id && !unknown) {
      /* The Focus view always has a focus: the current selection, or the first artifact drawn. */
      var chosen = defaultFocusId();
      if (chosen) {
        state.cat = catWith(state.cat, { a: parsed.cat.a, m: parsed.cat.m, l: parsed.cat.l });
        go({ view: 'focus', id: chosen, cat: parsed.cat }, 'replace');
        syncFind();
        return;
      }
    }
    if (unknown) parsed.view = 'artifacts';
    state = { view: parsed.view, id: unknown ? null : parsed.id, cat: parsed.cat, unknown: unknown };
    render();
    syncFind();
  };

  /* Presentation choices are added to every same-document link at the moment it is followed, so
     links built earlier — including the ones in the generated markup — never drop or revert them. */
  var withPresentation = function (href) {
    var q = href.indexOf('?');
    var path = q >= 0 ? href.slice(0, q) : href;
    var cat = catWith(catParse(q >= 0 ? href.slice(q + 1) : ''), { a: state.cat.a, m: state.cat.m, l: state.cat.l });
    if (path === '#/' || path === '#') cat = onlyKeys(cat, ['q', 'a', 'm', 'l']);
    return path + catQuery(cat);
  };

  /* ---------------------------------------------------------- presentation */

  var applyPresentation = function () {
    var a = state.cat.a;
    if (a) root.setAttribute('data-appearance', a);
    else root.removeAttribute('data-appearance');
    doc.body.setAttribute('data-master', state.cat.m === 'rail' ? 'rail' : 'open');
    var choices = doc.querySelectorAll('[data-appearance-set]');
    for (var i = 0; i < choices.length; i += 1) {
      choices[i].setAttribute('aria-pressed', String(choices[i].getAttribute('data-appearance-set') === (a || 'auto')));
    }
    doc.body.setAttribute('data-lens', state.cat.l === 'b' ? 'business' : 'off');
    var lens = doc.getElementById('lens-toggle');
    if (lens) lens.setAttribute('aria-pressed', String(state.cat.l === 'b'));
    var toggle = doc.getElementById('master-toggle');
    if (toggle) {
      var rail = state.cat.m === 'rail';
      toggle.setAttribute('aria-expanded', String(!rail));
      var label = rail ? 'Expand the artifact list (Ctrl+B)' : 'Collapse the artifact list to a kind rail (Ctrl+B)';
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }
  };
  var setPresentation = function (changes) {
    go({ view: state.view, id: state.id, cat: catWith(state.cat, changes), unknown: state.unknown }, 'replace', false);
  };
  var toggleMaster = function () {
    setPresentation({ m: state.cat.m === 'rail' ? null : 'rail' });
  };
  var toggleLens = function () {
    setPresentation({ l: state.cat.l === 'b' ? null : 'b' });
    /* The docked card changes the room the map has. */
    var m = maps[state.view];
    if (m && m.plane) fitMap(m);
  };

  var toastTimer = null;
  var showToast = function (message) {
    var toast = doc.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.setAttribute('data-on', '');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.removeAttribute('data-on');
    }, 1800);
  };
  var copyText = function (text, message) {
    var fallback = function () {
      var area = doc.createElement('textarea');
      area.value = text;
      doc.body.appendChild(area);
      area.select();
      try {
        doc.execCommand('copy');
      } catch (err) {
        /* Nothing more to try; the text is still shown in the message. */
      }
      doc.body.removeChild(area);
      showToast(message);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showToast(message);
        }, fallback);
        return;
      }
    } catch (err) {
      /* Fall through to the selection-based copy. */
    }
    fallback();
  };

  /* ------------------------------------------------------------ master list */

  var filtersActive = function () {
    return Boolean(state.cat.k || state.cat.s || state.cat.c || state.cat.f);
  };
  var matchesFilters = function (a) {
    if (state.cat.k && a.kind !== state.cat.k) return false;
    if (state.cat.s && a.status !== state.cat.s) return false;
    if (state.cat.c && a.context !== state.cat.c) return false;
    if (state.cat.f) {
      var needle = state.cat.f.toLowerCase();
      if (a.id.toLowerCase().indexOf(needle) < 0 && (a.title || '').toLowerCase().indexOf(needle) < 0) return false;
    }
    return true;
  };
  var listed = function () {
    var out = [];
    for (var i = 0; i < ARTIFACTS.length; i += 1) if (matchesFilters(ARTIFACTS[i])) out.push(ARTIFACTS[i]);
    return out;
  };
  var catalogChanged = function (changes) {
    go({ view: state.view, id: state.id, cat: catWith(state.cat, changes), unknown: state.unknown }, 'replace');
  };

  /* Which kind groups the reader opened or closed: reader state, held for this page only. */
  var openGroups = {};
  var groupOpen = function (kind) {
    if (openGroups[kind] === true) return true;
    return openGroups[kind] === undefined && filtersActive();
  };
  var listKey = null;

  var renderList = function () {
    var wrap = doc.getElementById('artifact-list');
    var counts = doc.getElementById('list-counts');
    if (!wrap) return;
    clear(wrap);
    var current = state.id ? byId[state.id] : null;
    var shown = 0;
    for (var k = 0; k < ORDER.length; k += 1) {
      var kind = ORDER[k];
      var members = [];
      for (var i = 0; i < ARTIFACTS.length; i += 1) {
        if (ARTIFACTS[i].kind === kind && matchesFilters(ARTIFACTS[i])) members.push(ARTIFACTS[i]);
      }
      if (members.length === 0) continue;
      shown += members.length;
      var open = groupOpen(kind);
      var section = el('section', 'kgroup');
      section.setAttribute('data-kind', kind);
      var head = el('button', 'khead k-' + kind + (current && current.kind === kind ? ' has-current' : ''));
      head.type = 'button';
      head.setAttribute('data-group', kind);
      head.setAttribute('aria-expanded', String(open));
      var chev = el('span', 'chev');
      chev.appendChild(icon('chev'));
      head.appendChild(chev);
      head.appendChild(tokenFor(kind));
      head.appendChild(el('span', 'lbl', LABELS[kind] || kind));
      var here = el('span', 'here');
      here.appendChild(el('span', null, '●'));
      here.appendChild(el('span', 'sr-only', ' holds the selected artifact'));
      head.appendChild(here);
      head.appendChild(el('span', 'n', members.length));
      section.appendChild(head);
      if (open) {
        var list = el('ul');
        for (var m = 0; m < members.length; m += 1) {
          var a = members[m];
          var li = el('li');
          var link = doc.createElement('a');
          link.href = artifactHref(a.id);
          link.appendChild(el('span', 'name', a.title || a.id));
          link.appendChild(el('span', 'aid', a.id));
          if (a.id === state.id) link.setAttribute('aria-current', 'true');
          li.appendChild(link);
          list.appendChild(li);
        }
        section.appendChild(list);
      }
      wrap.appendChild(section);
    }
    if (shown === 0) wrap.appendChild(el('p', 'empty', 'No artifact matches these filters.'));
    if (counts) {
      counts.textContent =
        shown === ARTIFACTS.length ? String(shown) : shown + ' of ' + ARTIFACTS.length;
      counts.title = shown === ARTIFACTS.length ? shown + ' artifacts' : shown + ' of ' + ARTIFACTS.length + ' artifacts shown';
    }
  };

  var markCurrent = function () {
    var links = doc.querySelectorAll('#artifact-list a[href^="#/artifacts/"]');
    var wanted = state.id ? '#/artifacts/' + state.id : null;
    for (var i = 0; i < links.length; i += 1) {
      var href = links[i].getAttribute('href') || '';
      var path = href.indexOf('?') >= 0 ? href.slice(0, href.indexOf('?')) : href;
      if (wanted && path === wanted) links[i].setAttribute('aria-current', 'true');
      else links[i].removeAttribute('aria-current');
    }
    var current = state.id ? byId[state.id] : null;
    var heads = doc.querySelectorAll('#artifact-list .khead');
    for (var h = 0; h < heads.length; h += 1) {
      var holds = Boolean(current && heads[h].getAttribute('data-group') === current.kind);
      if (holds) heads[h].classList.add('has-current');
      else heads[h].classList.remove('has-current');
    }
  };

  /** Rebuild the list only when what it shows changed; a selection move just moves the marker. */
  var syncList = function (selectionMoved) {
    var current = state.id ? byId[state.id] : null;
    if (current && selectionMoved) openGroups[current.kind] = true;
    var opened = [];
    for (var k = 0; k < ORDER.length; k += 1) if (groupOpen(ORDER[k])) opened.push(ORDER[k]);
    var key = catQuery(linkCat()) + '|' + opened.join(',');
    if (key !== listKey) {
      renderList();
      listKey = key;
    } else {
      markCurrent();
    }
  };

  /** Bring the current entry into the list's own viewport after the selection moves elsewhere. */
  var revealCurrent = function () {
    var wrap = doc.querySelector('.master .listwrap');
    var current = doc.querySelector('#artifact-list a[aria-current]');
    if (!wrap || !current) return;
    var top = current.offsetTop;
    var headingRoom = 36;
    if (top - headingRoom < wrap.scrollTop || top + current.offsetHeight > wrap.scrollTop + wrap.clientHeight) {
      wrap.scrollTop = Math.max(0, top - wrap.clientHeight / 3);
    }
  };

  var contextName = function (id) {
    return byId[id] && byId[id].title ? byId[id].title : id;
  };
  var renderChips = function () {
    var host = doc.getElementById('list-chips');
    if (!host) return;
    clear(host);
    var chips = [];
    if (state.cat.k) chips.push(['k', 'Kind: ' + (LABELS[state.cat.k] || state.cat.k)]);
    if (state.cat.s) chips.push(['s', 'Status: ' + state.cat.s]);
    if (state.cat.c) chips.push(['c', 'Context: ' + contextName(state.cat.c)]);
    if (state.cat.f) chips.push(['f', 'Name or ID: “' + state.cat.f + '”']);
    host.hidden = chips.length === 0;
    for (var i = 0; i < chips.length; i += 1) {
      var chip = el('button', 'chip');
      chip.type = 'button';
      chip.setAttribute('data-clear', chips[i][0]);
      chip.setAttribute('aria-label', 'Remove filter ' + chips[i][1]);
      chip.appendChild(el('span', null, chips[i][1]));
      var x = el('span', 'x');
      x.appendChild(icon('close'));
      chip.appendChild(x);
      host.appendChild(chip);
    }
    if (chips.length > 0) {
      var all = el('button', 'clearall', 'Clear all');
      all.type = 'button';
      all.setAttribute('data-clear', 'all');
      host.appendChild(all);
    }
  };

  var renderRail = function () {
    var rail = doc.getElementById('kind-rail');
    if (!rail) return;
    var current = state.id ? byId[state.id] : null;
    if (!rail.firstChild) {
      for (var k = 0; k < ORDER.length; k += 1) {
        var kind = ORDER[k];
        var count = 0;
        for (var i = 0; i < ARTIFACTS.length; i += 1) if (ARTIFACTS[i].kind === kind) count += 1;
        var b = el('button', 'k-' + kind);
        b.type = 'button';
        b.setAttribute('data-rail', kind);
        b.setAttribute('aria-label', 'Open ' + (LABELS[kind] || kind) + ' (' + count + ')');
        b.title = (LABELS[kind] || kind) + ' (' + count + ')';
        b.appendChild(icon(kind));
        b.appendChild(el('span', 't', TOKENS[kind] || '?'));
        rail.appendChild(b);
      }
    }
    var buttons = rail.querySelectorAll('button[data-rail]');
    for (var r = 0; r < buttons.length; r += 1) {
      if (current && buttons[r].getAttribute('data-rail') === current.kind) buttons[r].setAttribute('aria-current', 'true');
      else buttons[r].removeAttribute('aria-current');
    }
  };

  /* ----------------------------------------------------------------- detail */

  /* A group larger than this starts collapsed. Presentation constant, not a product rule. */
  var COLLAPSE_ABOVE = 8;

  var otherEnd = function (edge, direction) {
    return direction === 'out' ? edge.to : edge.from;
  };

  /**
   * Partition one direction's edges by relationship type, then by the artifact kind at the other
   * end, preserving the compiled graph's edge order within each group so the result is
   * deterministic. The Reader and the Focused Topology share this partition, and its key.
   */
  var groupEdges = function (edges, direction) {
    var groups = [];
    var index = {};
    for (var i = 0; i < edges.length; i += 1) {
      var other = byId[otherEnd(edges[i], direction)];
      var otherKind = other ? other.kind : 'unknown';
      var key = direction + ':' + edges[i].kind + ':' + otherKind;
      if (!index[key]) {
        index[key] = { key: key, relKind: edges[i].kind, kind: otherKind, direction: direction, edges: [] };
        groups.push(index[key]);
      }
      index[key].edges.push(edges[i]);
    }
    return groups;
  };
  var verbOf = function (relKind) {
    return relKind.replace('[].', ' · ').replace(/-/g, ' ');
  };

  var relationshipEntry = function (edge, direction) {
    var otherId = otherEnd(edge, direction);
    var other = byId[otherId];
    var li = el('li');
    li.appendChild(el('span', 'dir', direction === 'out' ? '→' : '←'));
    if (other) li.appendChild(tokenFor(other.kind));
    var link = doc.createElement('a');
    link.href = artifactHref(otherId);
    link.textContent = other && other.title ? other.title : otherId;
    li.appendChild(link);
    li.appendChild(el('span', 'aid mono', otherId));
    return li;
  };
  var memberList = function (edges, direction) {
    var list = el('ul', 'members');
    for (var i = 0; i < edges.length; i += 1) list.appendChild(relationshipEntry(edges[i], direction));
    return list;
  };
  /** Direction, type, kind and count, each as text: the label carries every fact on its own. */
  var groupLabel = function (host, group) {
    var dir = el('span', 'dir', group.direction === 'out' ? '→' : '←');
    dir.setAttribute('aria-hidden', 'true');
    host.appendChild(dir);
    host.appendChild(el('span', 'sr-only', group.direction === 'out' ? 'declares ' : 'referenced by '));
    var verb = el('span', 'verb', verbOf(group.relKind));
    verb.title = group.relKind;
    host.appendChild(verb);
    host.appendChild(tokenFor(group.kind));
    host.appendChild(el('span', 'of', LABELS[group.kind] || group.kind));
    host.appendChild(el('span', 'gcount', group.edges.length));
  };

  var relationshipList = function (host, heading, edges, direction) {
    var h = el('h5');
    h.id = direction === 'out' ? 'rel-out' : 'rel-in';
    h.appendChild(el('span', null, heading));
    h.appendChild(el('span', 'total', edges ? edges.length : 0));
    host.appendChild(h);
    if (!edges || edges.length === 0) {
      host.appendChild(el('p', 'none', 'None.'));
      return;
    }
    var groups = groupEdges(edges, direction);
    /* A lone small group needs no disclosure, but its label still has to state the relationship
       type: the type is required on every entry, and the label is where it is carried. A lone
       *large* group still collapses — whether a group overwhelms the view depends on its size, not
       on how many other groups sit beside it. */
    if (groups.length === 1 && groups[0].edges.length <= COLLAPSE_ABOVE) {
      var solo = el('div', 'relsolo');
      solo.setAttribute('data-key', groups[0].key);
      var only = el('p', 'glabel solo');
      groupLabel(only, groups[0]);
      solo.appendChild(only);
      solo.appendChild(memberList(groups[0].edges, direction));
      host.appendChild(solo);
      return;
    }
    for (var g = 0; g < groups.length; g += 1) {
      var group = groups[g];
      var details = doc.createElement('details');
      details.className = 'relgroup';
      details.setAttribute('data-key', group.key);
      var summary = doc.createElement('summary');
      var label = el('span', 'glabel');
      groupLabel(label, group);
      summary.appendChild(label);
      details.appendChild(summary);
      if (group.edges.length > COLLAPSE_ABOVE) {
        /* Collapsed groups render no members until first opened: a high-degree artifact must not
           pay to build what it immediately hides. */
        details.addEventListener(
          'toggle',
          (function (node, groupEdgesList, dir) {
            return function () {
              if (node.open && !node.querySelector('ul.members')) node.appendChild(memberList(groupEdgesList, dir));
            };
          })(details, group.edges, direction),
        );
      } else {
        details.open = true;
        details.appendChild(memberList(group.edges, direction));
      }
      host.appendChild(details);
    }
  };

  /* Known identifiers written in prose become links; the text itself is never altered. */
  var ID_PATTERN = /[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+/g;
  var linkIdentifiers = function (node) {
    var walker = doc.createTreeWalker(node, 4, null);
    var texts = [];
    var n = walker.nextNode();
    while (n) {
      if (!(n.parentNode && n.parentNode.closest && n.parentNode.closest('a'))) texts.push(n);
      n = walker.nextNode();
    }
    for (var t = 0; t < texts.length; t += 1) {
      var s = texts[t].nodeValue;
      var frag = null;
      var last = 0;
      var m;
      ID_PATTERN.lastIndex = 0;
      while ((m = ID_PATTERN.exec(s))) {
        var id = m[0];
        var before = m.index > 0 ? s.charAt(m.index - 1) : '';
        var after = s.charAt(m.index + id.length);
        if (/[A-Za-z0-9_-]/.test(before) || /[A-Za-z0-9_]/.test(after) || !byId[id]) continue;
        frag = frag || doc.createDocumentFragment();
        frag.appendChild(doc.createTextNode(s.slice(last, m.index)));
        var a = doc.createElement('a');
        a.className = 'idlink';
        a.href = artifactHref(id);
        a.textContent = id;
        a.title = byId[id].title || id;
        frag.appendChild(a);
        last = m.index + id.length;
      }
      if (frag) {
        frag.appendChild(doc.createTextNode(s.slice(last)));
        texts[t].parentNode.replaceChild(frag, texts[t]);
      }
    }
  };
  var metaValue = function (dd, value) {
    var parts = String(value).split(/,\s*/);
    var allKnown = parts.length > 0;
    for (var p = 0; p < parts.length; p += 1) if (!byId[parts[p]]) allKnown = false;
    if (!allKnown) {
      dd.textContent = String(value);
      linkIdentifiers(dd);
      return;
    }
    for (var r = 0; r < parts.length; r += 1) {
      var target = byId[parts[r]];
      var ref = doc.createElement('a');
      ref.className = 'ref';
      ref.href = artifactHref(target.id);
      ref.title = target.title || target.id;
      ref.appendChild(tokenFor(target.kind));
      ref.appendChild(el('span', 'rt', target.title || target.id));
      ref.appendChild(el('span', 'rid', target.id));
      dd.appendChild(ref);
    }
  };

  var backlinkFor = function () {
    var p = el('p', 'backlink');
    var back = doc.createElement('a');
    back.setAttribute('href', '#/artifacts' + catQuery(linkCat()));
    var crumbs = [];
    if (state.cat.k) crumbs.push(LABELS[state.cat.k] || state.cat.k);
    if (state.cat.s) crumbs.push(state.cat.s);
    if (state.cat.c) crumbs.push(state.cat.c);
    if (state.cat.f) crumbs.push('filter “' + state.cat.f + '”');
    back.textContent = crumbs.length > 0 ? '← Results · ' + crumbs.join(' · ') : '← All artifacts';
    p.appendChild(back);
    return p;
  };

  var stepTo = function (delta) {
    var list = listed();
    var at = -1;
    for (var i = 0; i < list.length; i += 1) if (list[i].id === state.id) at = i;
    var next = at < 0 ? null : list[at + delta];
    if (next) go({ view: 'artifacts', id: next.id, cat: linkCat() });
  };

  var renderDetail = function () {
    var host = doc.getElementById('detail');
    if (!host) return;
    clear(host);

    if (state.unknown) {
      var box = el('div', 'unknown');
      box.appendChild(el('h3', 'artifact', 'No such artifact in this Product Explorer'));
      var p = el('p');
      p.appendChild(doc.createTextNode('This Product Explorer does not contain '));
      p.appendChild(el('span', 'aid', state.unknown));
      p.appendChild(
        doc.createTextNode('. The model may have changed since the link was shared, or the identifier may be mistyped.'),
      );
      box.appendChild(p);
      var ways = el('p');
      var toOverview = doc.createElement('a');
      toOverview.href = '#/';
      toOverview.textContent = 'Open the overview';
      var toList = doc.createElement('a');
      toList.href = '#/artifacts';
      toList.textContent = 'browse all artifacts';
      ways.appendChild(toOverview);
      ways.appendChild(doc.createTextNode(' or '));
      ways.appendChild(toList);
      ways.appendChild(doc.createTextNode('.'));
      box.appendChild(ways);
      host.appendChild(box);
      return;
    }

    if (!state.id) {
      host.appendChild(el('p', 'placeholder', 'Select an artifact to read it.'));
      var hint = el('p', 'note');
      hint.appendChild(doc.createTextNode('Pick one from the list, or press '));
      hint.appendChild(el('kbd', null, '/'));
      hint.appendChild(doc.createTextNode(' to search the product.'));
      host.appendChild(hint);
      return;
    }
    var a = byId[state.id];
    if (!a) return;

    var list = listed();
    var at = -1;
    for (var i = 0; i < list.length; i += 1) if (list[i].id === a.id) at = i;
    var pool = at >= 0 ? list : ARTIFACTS;
    var ofKind = [];
    for (var k = 0; k < pool.length; k += 1) if (pool[k].kind === a.kind) ofKind.push(pool[k].id);

    var bar = el('div', 'rbar');
    bar.appendChild(backlinkFor());
    var step = function (delta, label, glyph) {
      var target = at >= 0 ? list[at + delta] : null;
      var b = el('button', 'tbtn');
      b.type = 'button';
      b.setAttribute('data-step', String(delta));
      if (glyph === 'prev') b.appendChild(icon('prev'));
      b.appendChild(doc.createTextNode(label));
      if (glyph === 'next') b.appendChild(icon('chev'));
      if (target) b.title = label + ': ' + (target.title || target.id) + (delta < 0 ? ' (k)' : ' (j)');
      else b.disabled = true;
      bar.appendChild(b);
    };
    step(-1, 'Previous', 'prev');
    step(1, 'Next', 'next');
    bar.appendChild(el('span', 'pos', ofKind.indexOf(a.id) + 1 + ' of ' + ofKind.length + ' ' + (LABELS[a.kind] || a.kind)));
    var copyId = el('button', 'tbtn');
    copyId.type = 'button';
    copyId.setAttribute('data-copy', 'id');
    copyId.appendChild(icon('copy'));
    copyId.appendChild(doc.createTextNode('Copy ID'));
    bar.appendChild(copyId);
    var copyLink = el('button', 'tbtn');
    copyLink.type = 'button';
    copyLink.setAttribute('data-copy', 'link');
    copyLink.appendChild(icon('link'));
    copyLink.appendChild(doc.createTextNode('Copy link'));
    bar.appendChild(copyLink);
    var toFocus = doc.createElement('a');
    toFocus.className = 'tbtn';
    toFocus.href = '#/focus/' + a.id;
    toFocus.setAttribute('data-focus', a.id);
    toFocus.title = 'Open the Focus view on ' + a.id + ' (f)';
    toFocus.appendChild(icon('focus'));
    toFocus.appendChild(doc.createTextNode('Focus'));
    bar.appendChild(toFocus);
    host.appendChild(bar);

    var header = doc.createElement('header');
    var idline = el('div', 'idline');
    idline.appendChild(tokenFor(a.kind));
    idline.appendChild(el('span', 'aid', a.id));
    idline.appendChild(el('span', 'kindname', a.kindName));
    idline.appendChild(badgeFor(a.status));
    header.appendChild(idline);
    header.appendChild(el('h3', 'artifact', a.title || a.id));
    if (a.meta && a.meta.length > 0) {
      var dl = el('dl', 'meta');
      for (var mi = 0; mi < a.meta.length; mi += 1) {
        dl.appendChild(el('dt', null, a.meta[mi][0]));
        var dd = el('dd');
        metaValue(dd, a.meta[mi][1]);
        dl.appendChild(dd);
      }
      header.appendChild(dl);
    }
    host.appendChild(header);
    if (lensOn() && a.kind === 'use-case') {
      var lens = el('section', 'mcard lenscard k-' + a.kind);
      lens.setAttribute('aria-label', 'Business lens: ' + (a.title || a.id));
      businessCard(lens, a);
      host.appendChild(lens);
    }

    var nOut = (outgoing[a.id] || []).length;
    var nIn = (incoming[a.id] || []).length;
    var sum = el('p', 'relsum');
    sum.appendChild(el('span', null, 'Relationships:'));
    var toOut = el('button', null, 'Declares ' + nOut);
    toOut.type = 'button';
    toOut.setAttribute('data-jump', 'rel-out');
    sum.appendChild(toOut);
    var toIn = el('button', null, 'Referenced by ' + nIn);
    toIn.type = 'button';
    toIn.setAttribute('data-jump', 'rel-in');
    sum.appendChild(toIn);
    host.appendChild(sum);

    var body = el('div', 'body');
    /* a.body is Markdown already rendered and escaped at generation time. */
    body.innerHTML = a.body;
    linkIdentifiers(body);
    host.appendChild(body);

    var rels = el('div', 'rels');
    rels.appendChild(el('h4', 'relhead', 'Relationships'));
    relationshipList(rels, 'Declares (references)', outgoing[a.id], 'out');
    relationshipList(rels, 'Referenced by (derived)', incoming[a.id], 'in');
    host.appendChild(rels);
  };

  /* ------------------------------------------------------------------ the maps */

  /* The Columns order, which is also the order the methodology explains a product in. A kind the
     model holds outside it follows, in the generator's kind order. */
  var COLUMN_ORDER = [
    'actor', 'journey', 'use-case', 'bounded-context', 'business-rule', 'domain-term',
    'functional-requirement', 'quality-requirement', 'constraint', 'structured-behaviour',
  ];
  var COLUMNS = [];
  for (var co = 0; co < COLUMN_ORDER.length; co += 1) if (ORDER.indexOf(COLUMN_ORDER[co]) >= 0) COLUMNS.push(COLUMN_ORDER[co]);
  for (var ox = 0; ox < ORDER.length; ox += 1) if (COLUMN_ORDER.indexOf(ORDER[ox]) < 0) COLUMNS.push(ORDER[ox]);
  var colOf = function (kind) {
    return COLUMNS.indexOf(kind);
  };

  /* Direct neighbours, distinct, in compiled edge order. */
  var nbrs = {};
  var nbrSeen = {};
  for (var na = 0; na < ARTIFACTS.length; na += 1) {
    nbrs[ARTIFACTS[na].id] = [];
    nbrSeen[ARTIFACTS[na].id] = {};
  }
  var addNbr = function (from, to) {
    if (!nbrs[from] || nbrSeen[from][to] || from === to) return;
    nbrSeen[from][to] = true;
    nbrs[from].push(to);
  };
  for (var ne = 0; ne < EDGES.length; ne += 1) {
    if (!byId[EDGES[ne].from] || !byId[EDGES[ne].to]) continue;
    addNbr(EDGES[ne].from, EDGES[ne].to);
    addNbr(EDGES[ne].to, EDGES[ne].from);
  }

  /*
   * Use cases and domain terms are grouped by the one bounded context the model records for each.
   * An artifact recording none, or more than one, is still drawn, in a group of its own that sorts
   * last: the grouping degrades, it never drops an artifact.
   */
  var CONTEXT_REL = { 'use-case': 'bounded-context', 'domain-term': 'defined-in' };
  var NO_CONTEXT = '￿none';
  var contextOf = {};
  for (var ca = 0; ca < ARTIFACTS.length; ca += 1) {
    var cart = ARTIFACTS[ca];
    if (!hasOwn(CONTEXT_REL, cart.kind)) continue;
    var found = [];
    var outs = outgoing[cart.id] || [];
    for (var ce = 0; ce < outs.length; ce += 1) {
      if (outs[ce].kind === CONTEXT_REL[cart.kind] && byId[outs[ce].to] && found.indexOf(outs[ce].to) < 0) found.push(outs[ce].to);
    }
    contextOf[cart.id] = found.length === 1 ? found[0] : NO_CONTEXT;
  }
  var groupKey = function (a) {
    return hasOwn(CONTEXT_REL, a.kind) ? contextOf[a.id] : '';
  };
  var contextLabel = function (key) {
    if (key === NO_CONTEXT) return 'No single context';
    return byId[key] && byId[key].title ? byId[key].title : key;
  };

  /*
   * Order inside each kind: by context group, then by the mean position of the artifact's
   * neighbours in the other columns, swept a fixed number of times in alternating directions, ties
   * broken by identifier. Pure arithmetic on the compiled graph: no clock, no randomness.
   */
  var orderByKind = {};
  (function () {
    var cmpGroup = function (a, b) {
      var x = groupKey(a);
      var y = groupKey(b);
      return x < y ? -1 : x > y ? 1 : 0;
    };
    var byIdCmp = function (a, b) {
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    };
    for (var k = 0; k < COLUMNS.length; k += 1) {
      var list = [];
      for (var i = 0; i < ARTIFACTS.length; i += 1) if (ARTIFACTS[i].kind === COLUMNS[k]) list.push(ARTIFACTS[i]);
      list.sort(function (a, b) {
        return cmpGroup(a, b) || byIdCmp(a, b);
      });
      orderByKind[COLUMNS[k]] = list;
    }
    for (var pass = 0; pass < 8; pass += 1) {
      var row = {};
      for (var c = 0; c < COLUMNS.length; c += 1) {
        var members = orderByKind[COLUMNS[c]];
        for (var r = 0; r < members.length; r += 1) row[members[r].id] = (r + 0.5) / members.length;
      }
      for (var s = 0; s < COLUMNS.length; s += 1) {
        var col = pass % 2 ? COLUMNS.length - 1 - s : s;
        var key = {};
        var current = orderByKind[COLUMNS[col]];
        for (var m = 0; m < current.length; m += 1) {
          var near = nbrs[current[m].id];
          var sum = 0;
          var count = 0;
          for (var q = 0; q < near.length; q += 1) {
            if (colOf(byId[near[q]].kind) === col) continue;
            sum += row[near[q]];
            count += 1;
          }
          key[current[m].id] = count > 0 ? sum / count : row[current[m].id];
        }
        current.sort(function (a, b) {
          return cmpGroup(a, b) || key[a.id] - key[b.id] || byIdCmp(a, b);
        });
      }
    }
  })();
  /** Consecutive artifacts of one kind that share a context group (one block when ungrouped). */
  var blocksOf = function (kind) {
    var out = [];
    var list = orderByKind[kind] || [];
    for (var i = 0; i < list.length; i += 1) {
      var g = groupKey(list[i]);
      var last = out[out.length - 1];
      if (last && last.key === g) last.list.push(list[i]);
      else out.push({ key: g, list: [list[i]] });
    }
    return out;
  };

  var svgEl = function (tag, attrs) {
    var node = doc.createElementNS(NS, tag);
    for (var key in attrs) {
      if (hasOwn(attrs, key)) node.setAttribute(key, String(attrs[key]));
    }
    return node;
  };
  /** A horizontal S-curve between the facing sides of two boxes; a loop when they share a column. */
  var curve = function (a, b) {
    var from = a.x <= b.x ? a : b;
    var to = a.x <= b.x ? b : a;
    var x1 = from.x + from.w;
    var y1 = from.y + from.h / 2;
    var x2 = to.x;
    var y2 = to.y + to.h / 2;
    if (from.x === to.x) return 'M' + x1 + ' ' + y1 + ' C' + (x1 + 70) + ' ' + y1 + ', ' + (x1 + 70) + ' ' + y2 + ', ' + x1 + ' ' + y2;
    var mid = (x1 + x2) / 2;
    return 'M' + x1 + ' ' + y1 + ' C' + mid + ' ' + y1 + ', ' + mid + ' ' + y2 + ', ' + x2 + ' ' + y2;
  };
  /** Seeded generator (mulberry32): the Focus view's background is arranged identically every time. */
  var seeded = function (seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  var maps = {};
  ['overview', 'focus', 'columns'].forEach(function (name) {
    maps[name] = { name: name, view: doc.getElementById('map-' + name), plane: null, svg: null, cam: { x: 0, y: 0, k: 1 }, w: 0, h: 0, rects: {}, els: {}, edges: [], key: null, att: null, roving: null, dragged: false };
  });
  var resetPlane = function (m, w, h) {
    clear(m.view);
    m.plane = el('div', 'plane');
    m.plane.style.width = w + 'px';
    m.plane.style.height = h + 'px';
    m.svg = svgEl('svg', { class: 'edges', width: w, height: h, 'aria-hidden': 'true', focusable: 'false' });
    m.plane.appendChild(m.svg);
    m.view.appendChild(m.plane);
    m.w = w;
    m.h = h;
    m.rects = {};
    m.els = {};
    m.edges = [];
    m.att = null;
    m.roving = null;
    m.fit = { x: 0, y: 0, w: w, h: h };
  };
  var applyCam = function (m) {
    if (m.plane) m.plane.style.transform = 'translate(' + Math.round(m.cam.x) + 'px, ' + Math.round(m.cam.y) + 'px) scale(' + Math.round(m.cam.k * 1000) / 1000 + ')';
  };
  /* With the business lens on, the card docks to the right of a wide viewport; the camera fits
     the drawing into the room it leaves. */
  var viewSize = function (m) {
    var w = m.view.clientWidth || 1200;
    var docked = state.cat.l === 'b' && w > 900 ? Math.min(416, Math.round(w * 0.4)) + 16 : 0;
    return { w: w - docked, h: m.view.clientHeight || 700 };
  };
  /* Fit the drawing to the viewport. The Columns view fits its width and starts at the top, so its
     boxes stay readable however tall the columns grow. */
  var fitMap = function (m) {
    if (!m.plane) return;
    var size = viewSize(m);
    var pad = 24;
    var f = m.fit;
    var kx = (size.w - 2 * pad) / Math.max(1, f.w);
    var ky = (size.h - 2 * pad - 28) / Math.max(1, f.h);
    var k;
    if (m.name === 'columns') {
      k = Math.max(0.45, Math.min(1, kx));
      m.cam = { x: Math.max(pad, (size.w - f.w * k) / 2) - f.x * k, y: pad + 18 - f.y * k, k: k };
    } else {
      k = Math.max(0.2, Math.min(m.name === 'focus' ? 1.25 : 1.8, kx, ky));
      m.cam = { x: (size.w - f.w * k) / 2 - f.x * k, y: pad + 22 + Math.max(0, (size.h - 2 * pad - 28 - f.h * k) / 2) - f.y * k, k: k };
    }
    applyCam(m);
  };
  var zoomAt = function (m, px, py, factor) {
    var k = Math.max(0.12, Math.min(4, m.cam.k * factor));
    var wx = (px - m.cam.x) / m.cam.k;
    var wy = (py - m.cam.y) / m.cam.k;
    m.cam.k = k;
    m.cam.x = px - wx * k;
    m.cam.y = py - wy * k;
    applyCam(m);
  };
  var zoomCentre = function (m, factor) {
    var size = viewSize(m);
    zoomAt(m, size.w / 2, size.h / 2, factor);
  };
  /** Pan just enough to bring a drawn rectangle into the viewport. */
  var ensureVisible = function (m, rect) {
    var size = viewSize(m);
    var margin = 32;
    var left = m.cam.x + rect.x * m.cam.k;
    var top = m.cam.y + rect.y * m.cam.k;
    var right = left + rect.w * m.cam.k;
    var bottom = top + rect.h * m.cam.k;
    var dx = 0;
    var dy = 0;
    if (left < margin) dx = margin - left;
    else if (right > size.w - margin) dx = size.w - margin - right;
    if (top < margin) dy = margin - top;
    else if (bottom > size.h - margin) dy = size.h - margin - bottom;
    if (dx || dy) {
      m.cam.x += dx;
      m.cam.y += dy;
      applyCam(m);
    }
  };

  /** One drawn, selectable artifact: a button placed on the plane, named for assistive technology. */
  var placeButton = function (m, cls, id, rect, kind) {
    var b = el('button', cls + ' k-' + kind);
    b.type = 'button';
    b.setAttribute('data-id', id);
    b.setAttribute('tabindex', '-1');
    b.style.left = rect.x + 'px';
    b.style.top = rect.y + 'px';
    b.style.width = rect.w + 'px';
    b.style.height = rect.h + 'px';
    var a = byId[id];
    var name = id + ' — ' + (a.title || id) + ' (' + (LABELS[a.kind] || a.kind) + ')';
    b.setAttribute('aria-label', name);
    b.title = name;
    m.plane.appendChild(b);
    m.rects[id] = rect;
    m.els[id] = b;
    return b;
  };
  var setRoving = function (m, id) {
    if (m.roving && m.els[m.roving]) m.els[m.roving].setAttribute('tabindex', '-1');
    m.roving = id && m.els[id] ? id : null;
    if (m.roving) m.els[m.roving].setAttribute('tabindex', '0');
  };
  /** The tab stop of a map: the selected artifact when it is drawn, otherwise the first one drawn. */
  var defaultRoving = function (m) {
    if (state.id && m.els[state.id]) return state.id;
    for (var k = 0; k < COLUMNS.length; k += 1) {
      var list = orderByKind[COLUMNS[k]];
      for (var i = 0; i < list.length; i += 1) if (m.els[list[i].id]) return list[i].id;
    }
    return null;
  };
  var focusChip = function (m, id) {
    if (!m.els[id]) return;
    setRoving(m, id);
    m.els[id].focus();
    ensureVisible(m, m.rects[id]);
  };
  /** Arrow keys move to the nearest drawn artifact in that direction. */
  var moveFocus = function (m, fromId, key) {
    var r = m.rects[fromId];
    if (!r) return;
    var cx = r.x + r.w / 2;
    var cy = r.y + r.h / 2;
    var best = null;
    var bestScore = Infinity;
    for (var id in m.rects) {
      if (!hasOwn(m.rects, id) || id === fromId || !m.els[id]) continue;
      var o = m.rects[id];
      var dx = o.x + o.w / 2 - cx;
      var dy = o.y + o.h / 2 - cy;
      var primary = key === 'ArrowRight' ? dx : key === 'ArrowLeft' ? -dx : key === 'ArrowDown' ? dy : -dy;
      var secondary = key === 'ArrowRight' || key === 'ArrowLeft' ? dy : dx;
      if (primary <= 1) continue;
      var score = primary + 2 * Math.abs(secondary);
      if (score < bestScore || (score === bestScore && id < best)) {
        best = id;
        bestScore = score;
      }
    }
    if (best) focusChip(m, best);
  };

  /* ---------------------------------------------------- plain-language verbs */

  var PLAIN_KIND = {
    actor: 'actor', journey: 'journey', 'use-case': 'use case', 'bounded-context': 'context',
    'business-rule': 'business rule', 'domain-term': 'term', 'functional-requirement': 'requirement',
    'quality-requirement': 'quality requirement', constraint: 'constraint', 'structured-behaviour': 'behaviour',
  };
  var plainKind = function (kind) {
    return PLAIN_KIND[kind] || (LABELS[kind] || kind).toLowerCase();
  };
  /** What the neighbour is to the focus, in the reader's words rather than the model's. */
  var plainVerb = function (relKind, direction, otherKind) {
    var out = direction === 'out';
    switch (relKind) {
      case 'primary-actor':
        return out ? 'used by' : 'uses this';
      case 'supporting-actors':
        return out ? 'also used by' : 'also uses this';
      case 'steps[].use-case':
        return out ? 'includes' : 'part of';
      case 'governed-by':
        return out ? 'must obey' : 'obeyed by';
      case 'applies-to':
        if (out) return 'applies to';
        return otherKind === 'business-rule' ? 'must obey' : 'must also be';
      case 'uses-terms':
        return out ? 'speaks of' : 'spoken of in';
      case 'bounded-context':
      case 'defined-in':
        return out ? 'part of' : 'contains';
      case 'derived-from':
        return out ? 'comes from' : 'must do';
      case 'illustrates':
        return out ? 'proves' : 'proved by';
      case 'verification[].scenario-ref':
        return out ? 'proved by' : 'proves';
      default:
        return relKind.replace('[].', ' ').replace(/-/g, ' ');
    }
  };
  var lensOn = function () {
    return state.cat.l === 'b';
  };

  /* --------------------------------------------------------------- the cards */

  /* The sections of one rendered body, by heading, as text. The body is the generator's escaped
     Markdown, parsed in an inert template, never attached to the document. */
  var sectionsCache = {};
  var sectionsOf = function (a) {
    if (sectionsCache[a.id]) return sectionsCache[a.id];
    var holder = doc.createElement('template');
    holder.innerHTML = a.body || '';
    var out = { first: null, by: {} };
    var current = null;
    var nodes = holder.content ? holder.content.childNodes : [];
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      if (node.nodeType !== 1) continue;
      var tag = node.tagName;
      var text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^H[1-6]$/.test(tag)) {
        current = text;
        out.by[current] = out.by[current] || [];
        continue;
      }
      if (!text) continue;
      if (tag === 'UL' || tag === 'OL') {
        var items = node.querySelectorAll('li');
        for (var li = 0; li < items.length; li += 1) {
          var t = (items[li].textContent || '').replace(/\s+/g, ' ').trim();
          if (t && current) out.by[current].push('• ' + t);
        }
      } else if (current) {
        out.by[current].push(text);
      }
      if (!out.first && tag === 'P') out.first = text;
    }
    sectionsCache[a.id] = out;
    return out;
  };
  var statementOf = function (a) {
    var s = sectionsOf(a);
    var named = s.by.Rule || s.by.Statement || s.by.Definition || s.by.Requirement || s.by.Constraint || s.by.Intent || s.by.Purpose;
    return named && named.length > 0 ? named[0] : s.first;
  };

  var cardEl = doc.getElementById('mcard');
  var cardLink = function (id, text, action) {
    var link = doc.createElement('a');
    link.href = action === 'read' ? artifactHref(id) : '#/focus/' + id;
    link.textContent = text;
    if (action !== 'read') link.title = 'Focus on ' + (byId[id].title || id);
    return link;
  };
  var cardSection = function (host, label, ids, describe, empty) {
    var section = el('section', 'csec');
    section.appendChild(el('h4', null, label));
    if (ids.length === 0) {
      section.appendChild(el('p', 'none', empty || 'None recorded in the model.'));
      host.appendChild(section);
      return;
    }
    var list = el('ul');
    for (var i = 0; i < ids.length; i += 1) {
      var li = el('li');
      li.appendChild(cardLink(ids[i], byId[ids[i]].title || ids[i]));
      if (describe) describe(li, byId[ids[i]]);
      list.appendChild(li);
    }
    section.appendChild(list);
    host.appendChild(section);
  };
  /** Distinct artifacts at the other end of a relationship, filtered by kind, in title order. */
  var related = function (id, relKinds, direction, kinds) {
    var edges = direction === 'out' ? outgoing[id] || [] : incoming[id] || [];
    var out = [];
    for (var i = 0; i < edges.length; i += 1) {
      if (relKinds.indexOf(edges[i].kind) < 0) continue;
      var other = direction === 'out' ? edges[i].to : edges[i].from;
      if (!byId[other] || out.indexOf(other) >= 0) continue;
      if (kinds && kinds.indexOf(byId[other].kind) < 0) continue;
      out.push(other);
    }
    return out.sort(function (x, y) {
      var a = (byId[x].title || x).toLowerCase();
      var b = (byId[y].title || y).toLowerCase();
      return a < b ? -1 : a > b ? 1 : x < y ? -1 : 1;
    });
  };
  var union = function (a, b) {
    var out = a.slice();
    for (var i = 0; i < b.length; i += 1) if (out.indexOf(b[i]) < 0) out.push(b[i]);
    return out;
  };

  /**
   * The business card of a use case. Every sentence is quoted from the embedded data or is a list
   * of titles derived from the compiled graph; nothing is summarised, ranked or invented.
   */
  var businessCard = function (host, a) {
    var head = el('header', 'chead');
    head.appendChild(el('span', 'ckind', 'Use case'));
    head.appendChild(el('h3', 'ctitle', a.title || a.id));
    host.appendChild(head);
    var s = sectionsOf(a);
    var quoted = function (label, lines) {
      var section = el('section', 'csec');
      section.appendChild(el('h4', null, label));
      if (!lines || lines.length === 0) section.appendChild(el('p', 'none', 'Not stated in the model.'));
      for (var i = 0; i < (lines || []).length; i += 1) section.appendChild(el('p', null, lines[i]));
      host.appendChild(section);
    };
    quoted('Goal', s.by.Goal);
    quoted('Trigger', s.by.Trigger);
    var actors = related(a.id, ['primary-actor'], 'out');
    var helpers = related(a.id, ['supporting-actors'], 'out');
    cardSection(host, 'Used by', union(actors, helpers), function (li, other) {
      if (helpers.indexOf(other.id) >= 0 && actors.indexOf(other.id) < 0) li.appendChild(el('span', 'cnote', ' (also)'));
    });
    cardSection(host, 'Part of', related(a.id, ['steps[].use-case'], 'in'), null, 'Not a step of any journey.');
    var rules = union(related(a.id, ['governed-by'], 'out', ['business-rule']), related(a.id, ['applies-to'], 'in', ['business-rule']));
    cardSection(host, 'Must obey', rules, function (li, rule) {
      var statement = statementOf(rule);
      if (statement) li.appendChild(el('p', 'cquote', statement));
    });
    var requirements = related(a.id, ['derived-from'], 'in', ['functional-requirement']);
    var behaviours = related(a.id, ['illustrates'], 'in', ['structured-behaviour']);
    for (var r = 0; r < rules.length; r += 1) behaviours = union(behaviours, related(rules[r], ['illustrates'], 'in', ['structured-behaviour']));
    for (var q = 0; q < requirements.length; q += 1) {
      behaviours = union(behaviours, related(requirements[q], ['verification[].scenario-ref'], 'out', ['structured-behaviour']));
    }
    cardSection(host, 'Proved by', behaviours, function (li, sb) {
      var steps = sb.gwt || {};
      var words = [['Given', steps.given], ['When', steps.when], ['Then', steps.then]];
      var dl = el('dl', 'gwt');
      for (var w = 0; w < words.length; w += 1) {
        if (!words[w][1] || words[w][1].length === 0) continue;
        dl.appendChild(el('dt', null, words[w][0]));
        dl.appendChild(el('dd', null, words[w][1].join('; ')));
      }
      if (dl.firstChild) li.appendChild(dl);
    });
    cardSection(host, 'Must do', requirements);
    cardSection(host, 'Must also be', union(related(a.id, ['applies-to'], 'in', ['quality-requirement']), related(a.id, ['applies-to'], 'in', ['constraint'])), function (li, other) {
      li.appendChild(el('span', 'cnote', ' (' + plainKind(other.kind) + ')'));
    });
    /* The one-hop impact the generator computed with the same rule prodshape impact applies. */
    var reach = (a.q || []).filter(function (id) {
      return byId[id];
    });
    var section = el('section', 'csec');
    section.appendChild(el('h4', null, 'A change here puts in question'));
    if (reach.length === 0) section.appendChild(el('p', 'none', 'Nothing else in the model.'));
    var byKind = {};
    for (var i = 0; i < reach.length; i += 1) (byKind[byId[reach[i]].kind] = byKind[byId[reach[i]].kind] || []).push(reach[i]);
    for (var k = 0; k < COLUMNS.length; k += 1) {
      var ids = byKind[COLUMNS[k]];
      if (!ids) continue;
      var p = el('p', 'creach');
      p.appendChild(el('span', 'cnote', ids.length + ' ' + plainKind(COLUMNS[k]) + (ids.length === 1 ? '' : 's') + ': '));
      for (var j = 0; j < ids.length; j += 1) {
        if (j > 0) p.appendChild(doc.createTextNode(', '));
        p.appendChild(cardLink(ids[j], byId[ids[j]].title || ids[j]));
      }
      section.appendChild(p);
    }
    host.appendChild(section);
    var foot = el('p', 'cfoot');
    foot.appendChild(cardLink(a.id, 'Read the full use case', 'read'));
    host.appendChild(foot);
  };
  /** Any other artifact through the lens: title, plain kind and its first authored statement. */
  var plainCard = function (host, a) {
    var head = el('header', 'chead');
    var kind = plainKind(a.kind);
    head.appendChild(el('span', 'ckind', kind.charAt(0).toUpperCase() + kind.slice(1)));
    head.appendChild(el('h3', 'ctitle', a.title || a.id));
    host.appendChild(head);
    var statement = statementOf(a);
    if (statement) host.appendChild(el('p', 'cquote', statement));
    var foot = el('p', 'cfoot');
    foot.appendChild(cardLink(a.id, 'Focus', 'focus'));
    foot.appendChild(doc.createTextNode(' · '));
    foot.appendChild(cardLink(a.id, 'Read', 'read'));
    host.appendChild(foot);
  };
  /** The engineering summary: identity, status, relationship counts and the two next steps. */
  var summaryCard = function (host, a, interactive) {
    var idline = el('div', 'idline');
    idline.appendChild(tokenFor(a.kind));
    idline.appendChild(el('span', 'aid', a.id));
    idline.appendChild(badgeFor(a.status));
    host.appendChild(idline);
    host.appendChild(el('h3', 'ctitle', a.title || a.id));
    var nOut = (outgoing[a.id] || []).length;
    var nIn = (incoming[a.id] || []).length;
    host.appendChild(el('p', 'cnote', 'Declares ' + nOut + ' · referenced by ' + nIn + ' · ' + nbrs[a.id].length + ' direct neighbours'));
    if (interactive) {
      var foot = el('p', 'cfoot');
      foot.appendChild(cardLink(a.id, 'Focus', 'focus'));
      foot.appendChild(doc.createTextNode(' · '));
      foot.appendChild(cardLink(a.id, 'Read', 'read'));
      host.appendChild(foot);
    }
  };
  var fillCard = function (host, a, interactive) {
    clear(host);
    host.className = host.className.replace(/\bk-\S+/g, '').trim() + ' k-' + a.kind;
    if (lensOn() && a.kind === 'use-case') businessCard(host, a);
    else if (lensOn()) plainCard(host, a);
    else summaryCard(host, a, interactive);
  };
  /* The card follows the reader's attention, and falls back to the selection the map shows. */
  var showCard = function (m) {
    if (!cardEl) return;
    var id = m.att || (state.id && (m.els[state.id] || m.name === 'focus') ? state.id : null);
    if (!id || !byId[id] || state.view !== m.name) {
      cardEl.hidden = true;
      return;
    }
    var passive = Boolean(m.att) && m.att !== state.id;
    var key = id + '|' + passive + '|' + (state.cat.l || '');
    cardEl.hidden = false;
    if (passive) cardEl.setAttribute('data-passive', '');
    else cardEl.removeAttribute('data-passive');
    if (cardEl.getAttribute('data-key') === key) return;
    cardEl.setAttribute('data-key', key);
    cardEl.setAttribute('aria-label', (byId[id].title || id) + ' — summary');
    fillCard(cardEl, byId[id], !passive);
    /* On a phone the card can be folded to its title, so it never hides the map it describes. */
    var fold = el('button', 'iconbtn cardfold');
    fold.type = 'button';
    fold.appendChild(icon('chev'));
    var syncFold = function () {
      if (cardFolded) cardEl.setAttribute('data-folded', '');
      else cardEl.removeAttribute('data-folded');
      fold.setAttribute('aria-expanded', String(!cardFolded));
      fold.setAttribute('aria-label', cardFolded ? 'Show the whole summary' : 'Fold the summary to its title');
    };
    fold.addEventListener('click', function () {
      cardFolded = !cardFolded;
      syncFold();
    });
    cardEl.insertBefore(fold, cardEl.firstChild);
    syncFold();
  };
  var cardFolded = false;

  /* --------------------------------------------------------------- lighting */

  var lightMap = function (m) {
    if (!m.plane) return;
    var focusMode = m.name === 'focus';
    var id = m.att || (!focusMode && state.id && m.els[state.id] ? state.id : null);
    var near = null;
    if (id) {
      near = {};
      near[id] = true;
      if (focusMode) near[state.id] = true;
      else for (var n = 0; n < nbrs[id].length; n += 1) near[nbrs[id][n]] = true;
    }
    if (near) m.view.setAttribute('data-attending', '');
    else m.view.removeAttribute('data-attending');
    for (var key in m.els) {
      if (!hasOwn(m.els, key)) continue;
      var lit = Boolean(near && near[key]);
      m.els[key].classList.toggle('lit', lit);
      if (key === state.id) m.els[key].setAttribute('aria-current', 'true');
      else m.els[key].removeAttribute('aria-current');
      m.els[key].classList.toggle('sel', key === state.id && !focusMode);
    }
    if (m.name === 'overview') {
      /* The Overview draws relationship lines only for the artifact the reader attends to. */
      while (m.svg.firstChild) m.svg.removeChild(m.svg.firstChild);
      if (id) {
        var touching = (outgoing[id] || []).concat(incoming[id] || []);
        for (var t = 0; t < touching.length; t += 1) {
          var ra = m.rects[touching[t].from];
          var rb = m.rects[touching[t].to];
          if (!ra || !rb) continue;
          m.svg.appendChild(svgEl('path', { d: curve(ra, rb), class: 'lit k-' + byId[touching[t].from].kind }));
        }
      }
    } else {
      for (var e = 0; e < m.edges.length; e += 1) {
        var edge = m.edges[e];
        var on = Boolean(id) && (focusMode ? edge.id === id : edge.from === id || edge.to === id);
        edge.path.classList.toggle('lit', on);
      }
    }
    showCard(m);
  };
  var setAttention = function (m, id) {
    if (m.att === id) return;
    m.att = id;
    lightMap(m);
  };

  /* --------------------------------------------------------------- overview */

  var CHIP_W = 132;
  var CHIP_H = 26;
  var CHIP_PX = 138;
  var CHIP_PY = 32;
  var CTX_H = 18;
  var TILE_PAD = 10;
  var TILE_HEAD = 32;
  var TILE_GAP = 16;

  var buildOverviewMap = function () {
    var m = maps.overview;
    if (!m.view || m.key === 'built') return false;
    m.key = 'built';
    var tiles = [];
    var area = 0;
    for (var k = 0; k < COLUMNS.length; k += 1) {
      var kind = COLUMNS[k];
      var n = orderByKind[kind].length;
      var cols = Math.max(1, Math.min(8, Math.round(Math.sqrt(n))));
      var blocks = blocksOf(kind);
      var grouped = hasOwn(CONTEXT_REL, kind);
      var h = TILE_HEAD;
      for (var b = 0; b < blocks.length; b += 1) h += (grouped ? CTX_H : 0) + Math.ceil(blocks[b].list.length / cols) * CHIP_PY;
      h += 6;
      var w = cols * CHIP_PX - (CHIP_PX - CHIP_W) + 2 * TILE_PAD;
      w = Math.max(w, 200);
      tiles.push({ kind: kind, cols: cols, blocks: blocks, grouped: grouped, w: w, h: h });
      area += (w + TILE_GAP) * (h + TILE_GAP);
    }
    /* Tiles flow in Columns order into rows of a width chosen from their total area alone, so the
       arrangement does not depend on the viewport; the camera fits it to whatever screen it meets. */
    var widest = 0;
    for (var t0 = 0; t0 < tiles.length; t0 += 1) widest = Math.max(widest, tiles[t0].w);
    var target = Math.max(widest, Math.sqrt(area * 3.2));
    var x = 0;
    var y = 0;
    var rowH = 0;
    var width = 0;
    for (var t = 0; t < tiles.length; t += 1) {
      if (x > 0 && x + tiles[t].w > target) {
        x = 0;
        y += rowH + TILE_GAP;
        rowH = 0;
      }
      tiles[t].x = x;
      tiles[t].y = y;
      x += tiles[t].w + TILE_GAP;
      width = Math.max(width, x - TILE_GAP);
      rowH = Math.max(rowH, tiles[t].h);
    }
    var height = y + rowH;
    /* Tiles in one row share its height, so the grid reads as one surface. */
    for (var s = 0; s < tiles.length; s += 1) {
      var rowBottom = 0;
      for (var u = 0; u < tiles.length; u += 1) if (tiles[u].y === tiles[s].y) rowBottom = Math.max(rowBottom, tiles[u].h);
      tiles[s].h = rowBottom;
    }
    resetPlane(m, width, height);
    for (var i = 0; i < tiles.length; i += 1) {
      var tile = tiles[i];
      var box = el('div', 'tile k-' + tile.kind);
      box.setAttribute('role', 'group');
      box.setAttribute('aria-label', (LABELS[tile.kind] || tile.kind) + ', ' + orderByKind[tile.kind].length);
      box.style.left = tile.x + 'px';
      box.style.top = tile.y + 'px';
      box.style.width = tile.w + 'px';
      box.style.height = tile.h + 'px';
      var head = el('div', 'tile-h');
      head.appendChild(tokenFor(tile.kind));
      head.appendChild(el('span', null, LABELS[tile.kind] || tile.kind));
      head.appendChild(el('span', 'n', orderByKind[tile.kind].length));
      box.appendChild(head);
      m.plane.appendChild(box);
      var cy = tile.y + TILE_HEAD;
      for (var bl = 0; bl < tile.blocks.length; bl += 1) {
        var block = tile.blocks[bl];
        if (tile.grouped) {
          var ctx = el('div', 'ctx', contextLabel(block.key));
          ctx.style.left = tile.x + TILE_PAD + 'px';
          ctx.style.top = cy + 'px';
          ctx.style.width = tile.w - 2 * TILE_PAD + 'px';
          m.plane.appendChild(ctx);
          cy += CTX_H;
        }
        for (var c = 0; c < block.list.length; c += 1) {
          var a = block.list[c];
          var rect = { x: tile.x + TILE_PAD + (c % tile.cols) * CHIP_PX, y: cy + Math.floor(c / tile.cols) * CHIP_PY, w: CHIP_W, h: CHIP_H };
          var chip = placeButton(m, 'mchip', a.id, rect, a.kind);
          chip.textContent = a.id.replace(/^[A-Z][A-Z0-9]*-/, '');
        }
        cy += Math.ceil(block.list.length / tile.cols) * CHIP_PY;
      }
    }
    return true;
  };

  /* ------------------------------------------------------------- focus view */

  var FBOX_W = 244;
  var FBOX_H = 64;
  var FBOX_GAP = 8;
  var FHEAD = 26;
  var FGROUP_GAP = 16;
  var CENTRE_W = 288;
  var CENTRE_H = 104;
  var SIDE_GAP = 150;
  var DENSE = 12;
  var DOT_W = 22;
  var DOT_H = 12;
  var focusTrail = [];

  /** The kinds whose disclosure the reader flipped, as the address carries them. */
  var toggledKinds = function () {
    return state.cat.x ? String(state.cat.x).split(',') : [];
  };
  var groupCollapsed = function (kind, size) {
    var flipped = toggledKinds().indexOf(kind) >= 0;
    var dense = size > DENSE;
    return flipped ? !dense : dense;
  };
  var toggleGroup = function (kind) {
    var list = toggledKinds();
    var at = list.indexOf(kind);
    if (at >= 0) list.splice(at, 1);
    else list.push(kind);
    list.sort();
    catalogChanged({ x: list.length > 0 ? list.join(',') : null });
  };

  /** The focus's neighbours, one entry per artifact, carrying every relationship that joins them. */
  var relationsOf = function (id) {
    var by = {};
    var order = [];
    var add = function (edge, direction) {
      var other = direction === 'out' ? edge.to : edge.from;
      if (!byId[other] || other === id) return;
      if (!by[other]) {
        by[other] = { id: other, links: [] };
        order.push(other);
      }
      by[other].links.push({ relKind: edge.kind, direction: direction });
    };
    var outs = outgoing[id] || [];
    var ins = incoming[id] || [];
    for (var i = 0; i < outs.length; i += 1) add(outs[i], 'out');
    for (var j = 0; j < ins.length; j += 1) add(ins[j], 'in');
    order.sort();
    return order.map(function (other) {
      return by[other];
    });
  };
  var relationLabel = function (rel) {
    var seen = [];
    for (var i = 0; i < rel.links.length; i += 1) {
      var link = rel.links[i];
      var text = lensOn()
        ? plainVerb(link.relKind, link.direction, byId[rel.id].kind)
        : link.direction === 'out'
          ? link.relKind + ' →'
          : '← ' + link.relKind;
      if (seen.indexOf(text) < 0) seen.push(text);
    }
    return seen.join(', ');
  };
  var boxContent = function (b, a, relText) {
    b.appendChild(icon(a.kind));
    if (!lensOn()) b.appendChild(el('span', 'bid', a.id));
    else b.appendChild(el('span', 'bkind', plainKind(a.kind)));
    b.appendChild(el('span', 'bt', a.title || a.id));
    if (relText) b.appendChild(el('span', 'rel', relText));
  };

  var buildFocusView = function () {
    var m = maps.focus;
    var id = state.id;
    var centre = byId[id];
    if (!m.view || !centre) return false;
    var key = id + '|' + (state.cat.x || '') + '|' + (state.cat.l || '');
    if (m.key === key) return false;
    var refocused = !m.key || m.key.split('|')[0] !== id;
    m.key = key;
    if (focusTrail[focusTrail.length - 1] !== id) focusTrail.push(id);
    if (focusTrail.length > 8) focusTrail.shift();

    var rels = relationsOf(id);
    var cc = colOf(centre.kind);
    var sides = { left: [], right: [] };
    for (var k = 0; k < COLUMNS.length; k += 1) {
      var kind = COLUMNS[k];
      var members = rels.filter(function (r) {
        return byId[r.id].kind === kind;
      });
      if (members.length === 0) continue;
      (k < cc ? sides.left : sides.right).push({ kind: kind, list: members, collapsed: groupCollapsed(kind, members.length) });
    }
    var heightOf = function (groups) {
      var h = 0;
      for (var g = 0; g < groups.length; g += 1) h += FHEAD + 6 + (groups[g].collapsed ? 0 : groups[g].list.length * (FBOX_H + FBOX_GAP)) + FGROUP_GAP;
      return groups.length > 0 ? h - FGROUP_GAP : 0;
    };
    var H = Math.max(heightOf(sides.left), heightOf(sides.right), CENTRE_H + 40);
    var LX = 0;
    var CX = FBOX_W + SIDE_GAP;
    var RX = CX + CENTRE_W + SIDE_GAP;
    var W = RX + FBOX_W;

    /* The rest of the model sits in a ring of slots around the content, assigned in a seeded
       shuffle: every other artifact is placed, and placed identically every time. */
    var around = { };
    around[id] = true;
    for (var r0 = 0; r0 < rels.length; r0 += 1) around[rels[r0].id] = true;
    var rest = [];
    for (var ra = 0; ra < COLUMNS.length; ra += 1) {
      var ofKind = orderByKind[COLUMNS[ra]];
      for (var rb = 0; rb < ofKind.length; rb += 1) if (!around[ofKind[rb].id]) rest.push(ofKind[rb]);
    }
    var margin = 120;
    var slots = [];
    var cellW = DOT_W + 14;
    var cellH = DOT_H + 14;
    while (true) {
      slots = [];
      for (var sy = -margin; sy + DOT_H <= H + margin; sy += cellH) {
        for (var sx = -margin; sx + DOT_W <= W + margin; sx += cellW) {
          if (sx > -40 && sx < W + 40 - DOT_W && sy > -36 && sy < H + 36 - DOT_H) continue;
          slots.push({ x: sx, y: sy });
        }
      }
      if (slots.length >= rest.length * 2 || margin > 4000) break;
      margin += 80;
    }
    var rnd = seeded(7);
    for (var sh = slots.length - 1; sh > 0; sh -= 1) {
      var pick = Math.floor(rnd() * (sh + 1));
      var tmp = slots[sh];
      slots[sh] = slots[pick];
      slots[pick] = tmp;
    }

    resetPlane(m, W + 2 * margin, H + 2 * margin);
    var ox = margin;
    var oy = margin;
    /* The camera fits the focus and its neighbours; the background spills past the edges. */
    m.fit = { x: ox - 40, y: oy - 20, w: W + 80, h: H + 40 };
    for (var d = 0; d < rest.length && d < slots.length; d += 1) {
      placeButton(m, 'dot', rest[d].id, { x: ox + slots[d].x, y: oy + slots[d].y, w: DOT_W, h: DOT_H }, rest[d].kind);
    }

    var cRect = { x: ox + CX, y: oy + (H - CENTRE_H) / 2, w: CENTRE_W, h: CENTRE_H };
    var placed = [];
    var sideList = [['left', sides.left, ox + LX], ['right', sides.right, ox + RX]];
    for (var sd = 0; sd < sideList.length; sd += 1) {
      var groups = sideList[sd][1];
      var gx = sideList[sd][2];
      var gy = oy + (H - heightOf(groups)) / 2;
      for (var g = 0; g < groups.length; g += 1) {
        var group = groups[g];
        var hr = { x: gx, y: gy, w: FBOX_W, h: FHEAD };
        var head = el('button', 'fgroup k-' + group.kind);
        head.type = 'button';
        head.setAttribute('data-group', group.kind);
        head.setAttribute('aria-expanded', String(!group.collapsed));
        head.setAttribute('aria-label', (group.collapsed ? 'Expand ' : 'Collapse ') + (LABELS[group.kind] || group.kind) + ', ' + group.list.length);
        head.style.left = hr.x + 'px';
        head.style.top = hr.y + 'px';
        head.style.width = hr.w + 'px';
        head.style.height = hr.h + 'px';
        var chev = el('span', 'chev');
        chev.appendChild(icon('chev'));
        head.appendChild(chev);
        head.appendChild(tokenFor(group.kind));
        head.appendChild(el('span', 'lbl', LABELS[group.kind] || group.kind));
        head.appendChild(el('span', 'n', group.list.length));
        m.plane.appendChild(head);
        gy += FHEAD + 6;
        for (var gm = 0; gm < group.list.length; gm += 1) {
          if (group.collapsed) {
            placed.push({ rel: group.list[gm], rect: hr, box: false });
            continue;
          }
          placed.push({ rel: group.list[gm], rect: { x: gx, y: gy, w: FBOX_W, h: FBOX_H }, box: true });
          gy += FBOX_H + FBOX_GAP;
        }
        gy += FGROUP_GAP;
      }
    }
    /* Lines first, so the boxes sit on top. A collapsed group draws one line per member to its
       heading, so the count of lines always equals the count of neighbours. */
    for (var p = 0; p < placed.length; p += 1) {
      var other = byId[placed[p].rel.id];
      var path = svgEl('path', { d: curve(placed[p].rect, cRect), class: 'k-' + other.kind });
      m.svg.appendChild(path);
      m.edges.push({ id: other.id, path: path });
    }
    for (var q = 0; q < placed.length; q += 1) {
      if (!placed[q].box) continue;
      var rel = placed[q].rel;
      var na = byId[rel.id];
      var b = placeButton(m, 'fbox', rel.id, placed[q].rect, na.kind);
      var relText = relationLabel(rel);
      boxContent(b, na, relText);
      var more = nbrs[rel.id].length - 1;
      if (more > 0) {
        var mo = el('span', 'more', '+' + more);
        mo.title = more + ' other direct neighbour' + (more === 1 ? '' : 's');
        b.appendChild(mo);
      }
      b.setAttribute('aria-label', (lensOn() ? '' : na.id + ' — ') + (na.title || na.id) + ' (' + (LABELS[na.kind] || na.kind) + '), ' + relText + (more > 0 ? ', ' + more + ' other neighbours' : ''));
    }
    var cb = placeButton(m, 'fbox centre', id, cRect, centre.kind);
    boxContent(cb, centre, null);
    cb.setAttribute('aria-label', (lensOn() ? '' : id + ' — ') + (centre.title || id) + ' (' + (LABELS[centre.kind] || centre.kind) + '), the focus, ' + rels.length + ' direct neighbours. Enter opens it in the Reader.');
    renderTrail();
    return refocused;
  };

  var renderTrail = function () {
    var host = doc.getElementById('focus-trail');
    if (!host) return;
    clear(host);
    var list = el('ol');
    var home = el('li');
    var toOverview = doc.createElement('a');
    toOverview.href = '#/overview/' + state.id;
    toOverview.textContent = 'Overview';
    home.appendChild(toOverview);
    list.appendChild(home);
    var shownTrail = focusTrail.slice(-6);
    for (var i = 0; i < shownTrail.length; i += 1) {
      var tid = shownTrail[i];
      var li = el('li');
      var label = lensOn() ? byId[tid].title || tid : tid;
      if (i === shownTrail.length - 1) {
        var here = el('span', lensOn() ? null : 'mono', label);
        here.setAttribute('aria-current', 'page');
        li.appendChild(here);
      } else {
        var link = doc.createElement('a');
        link.href = '#/focus/' + tid;
        link.textContent = label;
        if (!lensOn()) link.className = 'mono';
        li.appendChild(link);
      }
      list.appendChild(li);
    }
    host.appendChild(list);
  };

  /* ----------------------------------------------------------- columns view */

  var CBOX_W = 262;
  var CBOX_H = 48;
  var CPITCH = 58;
  var COL_PITCH = 322;
  var CTOP = 44;

  var buildColumnsView = function () {
    var m = maps.columns;
    var key = 'built|' + (state.cat.l || '');
    if (!m.view || m.key === key) return false;
    m.key = key;
    var placedAt = [];
    var labels = [];
    var height = 0;
    for (var c = 0; c < COLUMNS.length; c += 1) {
      var kind = COLUMNS[c];
      var x = c * COL_PITCH;
      var y = CTOP;
      var blocks = blocksOf(kind);
      var grouped = hasOwn(CONTEXT_REL, kind);
      for (var b = 0; b < blocks.length; b += 1) {
        if (grouped) {
          labels.push({ x: x, y: y, text: contextLabel(blocks[b].key) });
          y += CTX_H + 2;
        }
        for (var i = 0; i < blocks[b].list.length; i += 1) {
          placedAt.push({ a: blocks[b].list[i], rect: { x: x, y: y, w: CBOX_W, h: CBOX_H } });
          y += CPITCH;
        }
        if (grouped) y += 8;
      }
      height = Math.max(height, y);
    }
    resetPlane(m, Math.max(CBOX_W, (COLUMNS.length - 1) * COL_PITCH + CBOX_W), height);
    for (var h = 0; h < COLUMNS.length; h += 1) {
      var head = el('div', 'colhead k-' + COLUMNS[h]);
      head.style.left = h * COL_PITCH + 'px';
      head.style.top = '0px';
      head.style.width = CBOX_W + 'px';
      head.appendChild(tokenFor(COLUMNS[h]));
      head.appendChild(el('span', null, LABELS[COLUMNS[h]] || COLUMNS[h]));
      head.appendChild(el('span', 'n', orderByKind[COLUMNS[h]].length));
      m.plane.appendChild(head);
    }
    for (var l = 0; l < labels.length; l += 1) {
      var ctx = el('div', 'ctx', labels[l].text);
      ctx.style.left = labels[l].x + 'px';
      ctx.style.top = labels[l].y + 'px';
      ctx.style.width = CBOX_W + 'px';
      m.plane.appendChild(ctx);
    }
    var rects = {};
    for (var p = 0; p < placedAt.length; p += 1) rects[placedAt[p].a.id] = placedAt[p].rect;
    for (var e = 0; e < EDGES.length; e += 1) {
      var ra = rects[EDGES[e].from];
      var rb = rects[EDGES[e].to];
      if (!ra || !rb) continue;
      var path = svgEl('path', { d: curve(ra, rb), class: 'k-' + byId[EDGES[e].from].kind });
      m.svg.appendChild(path);
      m.edges.push({ from: EDGES[e].from, to: EDGES[e].to, path: path });
    }
    for (var q = 0; q < placedAt.length; q += 1) {
      var a = placedAt[q].a;
      var box = placeButton(m, 'fbox cbox', a.id, placedAt[q].rect, a.kind);
      boxContent(box, a, null);
    }
    return true;
  };

  /* -------------------------------------------------------------- map events */

  var activeMap = function () {
    return maps[state.view] || null;
  };
  /* The selection, or else the first artifact by identifier of the first kind in the Columns order. */
  var defaultFocusId = function () {
    if (state.id && byId[state.id]) return state.id;
    for (var k = 0; k < COLUMNS.length; k += 1) {
      for (var i = 0; i < ARTIFACTS.length; i += 1) if (ARTIFACTS[i].kind === COLUMNS[k]) return ARTIFACTS[i].id;
    }
    return null;
  };
  var focusOn = function (id) {
    if (byId[id]) go({ view: 'focus', id: id, cat: catWith(state.cat, { x: null }) });
  };
  var readArtifact = function (id) {
    if (byId[id]) go({ view: 'artifacts', id: id, cat: linkCat() });
  };
  var selectInColumns = function (id) {
    go({ view: 'columns', id: id && id !== state.id ? id : null, cat: state.cat });
  };
  /** What choosing an artifact does on each map: the Overview and the Focus view focus it; the
      Columns view selects it; the Focus view's centre opens the Reader. */
  var activate = function (m, id) {
    if (m.name === 'columns') selectInColumns(id);
    else if (m.name === 'focus' && id === state.id) readArtifact(id);
    else focusOn(id);
  };

  var wireMap = function (m) {
    var view = m.view;
    if (!view) return;
    var pointers = {};
    var count = 0;
    var start = null;
    var last = null;
    var pinch = null;
    var spread = function () {
      var ids = Object.keys(pointers);
      if (ids.length < 2) return null;
      var a = pointers[ids[0]];
      var b = pointers[ids[1]];
      return { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };
    var move = function (ev) {
      if (!hasOwn(pointers, String(ev.pointerId))) return;
      pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var box = view.getBoundingClientRect();
      if (count >= 2) {
        var now = spread();
        if (pinch && now) {
          zoomAt(m, now.x - box.left, now.y - box.top, now.d / pinch.d);
          m.cam.x += now.x - pinch.x;
          m.cam.y += now.y - pinch.y;
          applyCam(m);
        }
        pinch = now;
        m.dragged = true;
        return;
      }
      if (!m.dragged && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return;
      if (!m.dragged) view.setAttribute('data-dragging', '');
      m.dragged = true;
      m.cam.x += ev.clientX - last.x;
      m.cam.y += ev.clientY - last.y;
      last = { x: ev.clientX, y: ev.clientY };
      applyCam(m);
    };
    var up = function (ev) {
      if (!hasOwn(pointers, String(ev.pointerId))) return;
      delete pointers[ev.pointerId];
      count -= 1;
      pinch = count >= 2 ? spread() : null;
      if (count > 0) return;
      view.removeAttribute('data-dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.setTimeout(function () {
        m.dragged = false;
      }, 0);
    };
    view.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      count += 1;
      if (count === 1) {
        start = { x: ev.clientX, y: ev.clientY };
        last = start;
        m.dragged = false;
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      } else {
        pinch = spread();
      }
    });
    view.addEventListener(
      'wheel',
      function (ev) {
        ev.preventDefault();
        var box = view.getBoundingClientRect();
        zoomAt(m, ev.clientX - box.left, ev.clientY - box.top, Math.exp(-ev.deltaY * 0.0015));
      },
      { passive: false },
    );
    var idAt = function (target) {
      var hit = target instanceof Element ? target.closest('[data-id]') : null;
      return hit && view.contains(hit) ? hit.getAttribute('data-id') : null;
    };
    view.addEventListener('mouseover', function (ev) {
      if (count === 0) setAttention(m, idAt(ev.target));
    });
    view.addEventListener('mouseleave', function () {
      if (!view.contains(doc.activeElement) || doc.activeElement === view) setAttention(m, null);
    });
    view.addEventListener('focusin', function (ev) {
      var id = idAt(ev.target);
      if (id) setRoving(m, id);
      setAttention(m, id);
    });
    view.addEventListener('focusout', function (ev) {
      if (!ev.relatedTarget || !view.contains(ev.relatedTarget)) setAttention(m, null);
    });
    view.addEventListener('click', function (ev) {
      if (m.dragged) return;
      var target = ev.target instanceof Element ? ev.target : null;
      var group = target ? target.closest('[data-group]') : null;
      if (group) {
        var kind = group.getAttribute('data-group');
        toggleGroup(kind);
        var again = view.querySelector('[data-group="' + kind + '"]');
        if (again) again.focus();
        return;
      }
      var id = idAt(target);
      if (id) activate(m, id);
      else if (m.name === 'columns' && state.id) selectInColumns(null);
    });
    view.addEventListener('dblclick', function (ev) {
      var id = idAt(ev.target);
      if (id && m.name === 'columns' && !m.dragged) focusOn(id);
    });
    view.addEventListener('keydown', function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var id = idAt(ev.target);
      var arrow = ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' || ev.key === 'ArrowUp' || ev.key === 'ArrowDown';
      if (ev.target === view) {
        if (arrow) {
          var step = 60;
          m.cam.x += ev.key === 'ArrowLeft' ? step : ev.key === 'ArrowRight' ? -step : 0;
          m.cam.y += ev.key === 'ArrowUp' ? step : ev.key === 'ArrowDown' ? -step : 0;
          applyCam(m);
          ev.preventDefault();
        } else if (ev.key === 'Enter') {
          var first = m.roving || defaultRoving(m);
          if (first) focusChip(m, first);
          ev.preventDefault();
        }
        return;
      }
      if (arrow && id) {
        moveFocus(m, id, ev.key);
        ev.preventDefault();
      } else if (ev.key === 'Enter' && id) {
        ev.preventDefault();
        activate(m, id);
      }
    });
  };
  var wireMapControls = function () {
    var controls = doc.querySelectorAll('[data-zoom]');
    for (var i = 0; i < controls.length; i += 1) {
      controls[i].addEventListener('click', function (ev) {
        var which = ev.currentTarget.getAttribute('data-zoom');
        var m = maps[ev.currentTarget.getAttribute('data-map')];
        if (!m) return;
        if (which === 'in') zoomCentre(m, 1.25);
        else if (which === 'out') zoomCentre(m, 0.8);
        else fitMap(m);
      });
    }
  };

  /** Bring the active map up to date with the page state; returns whether it was rebuilt. */
  var syncMap = function (changedView, changedId) {
    var m = activeMap();
    if (!m) {
      if (cardEl) cardEl.hidden = true;
      return;
    }
    var rebuilt = false;
    if (m.name === 'overview') rebuilt = buildOverviewMap();
    else if (m.name === 'focus') rebuilt = buildFocusView();
    else rebuilt = buildColumnsView();
    if (rebuilt || changedView) {
      fitMap(m);
      setRoving(m, defaultRoving(m));
    } else if (changedId && state.id && m.els[state.id]) {
      setRoving(m, state.id);
      ensureVisible(m, m.rects[state.id]);
    }
    if (m.name === 'focus' && cardEl) cardEl.removeAttribute('data-key');
    lightMap(m);
  };

  /* ----------------------------------------------------------- ranked search */

  /* Ranking tiers, best first. Ordering is (tier, id): identifiers are unique, so it is total. */
  var TIER_EXACT_ID = 0;
  var TIER_ID_PREFIX = 1;
  var TIER_TITLE_EXACT = 2;
  var TIER_TITLE_PART = 3;
  var TIER_BODY = 4;
  var RESULT_LIMIT = 25;
  var SNIPPET_RADIUS = 60;

  var plainText = null;

  /**
   * Plain text from one rendered body. The generator emits a small, known tag vocabulary and escapes
   * exactly four entities, so stripping tags textually is both exact and far cheaper than parsing
   * every body through the DOM.
   */
  var stripTags = function (html) {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  };
  var searchIndex = function () {
    if (plainText) return plainText;
    plainText = {};
    for (var i = 0; i < ARTIFACTS.length; i += 1) plainText[ARTIFACTS[i].id] = stripTags(ARTIFACTS[i].body);
    return plainText;
  };
  /* Build it once the page is idle, so the reader's first keystroke never waits for it. */
  var warmIndex = function () {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(function () {
        searchIndex();
      });
    } else {
      window.setTimeout(searchIndex, 200);
    }
  };

  /** Classify one artifact against the query, or null when it does not match at all. */
  var scoreArtifact = function (artifact, needle, text) {
    var id = artifact.id.toLowerCase();
    if (id === needle) return { tier: TIER_EXACT_ID };
    if (id.indexOf(needle) === 0) return { tier: TIER_ID_PREFIX };
    var title = (artifact.title || '').toLowerCase();
    if (title === needle || title.indexOf(needle) === 0) return { tier: TIER_TITLE_EXACT };
    /* A kind name is the same kind of intent as a title, so it shares that tier. */
    var kindName = (LABELS[artifact.kind] || artifact.kind).toLowerCase();
    if (kindName === needle || kindName.indexOf(needle) === 0) return { tier: TIER_TITLE_EXACT };
    if (title.indexOf(needle) > 0 || kindName.indexOf(needle) > 0) return { tier: TIER_TITLE_PART };
    if (id.indexOf(needle) > 0) return { tier: TIER_TITLE_PART };
    var body = text[artifact.id] || '';
    var at = body.toLowerCase().indexOf(needle);
    if (at >= 0) return { tier: TIER_BODY, at: at };
    return null;
  };

  /**
   * Score every artifact within the active narrowing, then sort, then cap. Capping during the scan
   * could not rank: it could not know whether a better match lay further down.
   */
  var searchAll = function (needle) {
    var text = searchIndex();
    var hits = [];
    for (var i = 0; i < ARTIFACTS.length; i += 1) {
      if (!matchesFilters(ARTIFACTS[i])) continue;
      var score = scoreArtifact(ARTIFACTS[i], needle, text);
      if (score) hits.push({ artifact: ARTIFACTS[i], tier: score.tier, at: score.at });
    }
    hits.sort(function (a, b) {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.artifact.id < b.artifact.id ? -1 : a.artifact.id > b.artifact.id ? 1 : 0;
    });
    return hits;
  };

  /** A window of the artifact's own text around the match, trimmed at both ends when cut. */
  var snippetFor = function (id, at) {
    var body = searchIndex()[id] || '';
    var from = Math.max(0, at - SNIPPET_RADIUS);
    var to = Math.min(body.length, at + SNIPPET_RADIUS);
    return (from > 0 ? '…' : '') + body.slice(from, to) + (to < body.length ? '…' : '');
  };

  /* ---------------------------------------------------------- search dialog */

  var findEl = doc.getElementById('find');
  var input = doc.getElementById('q-body');
  var results = doc.getElementById('q-body-results');
  var status = doc.getElementById('q-body-status');
  var findOpen = false;
  var findReturn = null;
  var active = -1;
  var shown = [];

  var markActive = function () {
    var items = results.querySelectorAll('li[data-id]');
    for (var i = 0; i < items.length; i += 1) {
      if (i === active) {
        items[i].setAttribute('data-active', 'true');
        items[i].setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', items[i].id);
        if (items[i].scrollIntoView) items[i].scrollIntoView({ block: 'nearest' });
      } else {
        items[i].removeAttribute('data-active');
        items[i].setAttribute('aria-selected', 'false');
      }
    }
    if (active < 0) input.removeAttribute('aria-activedescendant');
  };

  var renderResults = function () {
    var q = input.value.trim();
    clear(results);
    active = -1;
    shown = [];
    input.removeAttribute('aria-activedescendant');
    if (!q) {
      status.textContent = filtersActive() ? 'Type to search within the narrowing below.' : '';
      return;
    }
    var hits = searchAll(q.toLowerCase());
    if (hits.length === 0) {
      status.textContent = 'Nothing matches “' + q + '”.';
      results.appendChild(el('li', 'empty', 'Nothing matches “' + q + '”.'));
      return;
    }
    shown = hits.slice(0, RESULT_LIMIT);
    /* Truncation is never silent: a reader shown only a limited subset must see the total. */
    status.textContent =
      hits.length > shown.length
        ? hits.length + ' matches · showing the top ' + shown.length
        : hits.length + (hits.length === 1 ? ' match' : ' matches');
    for (var h = 0; h < shown.length; h += 1) {
      var hit = shown[h];
      var li = el('li');
      li.id = 'q-hit-' + h;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.setAttribute('data-id', hit.artifact.id);
      var head = el('span', 'hithead');
      head.appendChild(tokenFor(hit.artifact.kind));
      var link = doc.createElement('a');
      link.href = artifactHref(hit.artifact.id);
      link.textContent = hit.artifact.title || hit.artifact.id;
      head.appendChild(link);
      head.appendChild(el('span', 'aid mono', hit.artifact.id));
      li.appendChild(head);
      /* Only a body match needs an excerpt; for the others the reason is already on screen. */
      if (hit.tier === TIER_BODY && typeof hit.at === 'number') {
        li.appendChild(el('span', 'snippet', snippetFor(hit.artifact.id, hit.at)));
      }
      results.appendChild(li);
    }
  };

  var distinctValues = function (field) {
    var seen = {};
    var out = [];
    for (var i = 0; i < ARTIFACTS.length; i += 1) {
      var v = ARTIFACTS[i][field];
      if (v && !seen[v]) {
        seen[v] = true;
        out.push(v);
      }
    }
    return out.sort();
  };
  var renderFindChips = function () {
    var host = doc.getElementById('find-chips');
    if (!host) return;
    clear(host);
    var row = function (label, key, values, text, withToken) {
      if (values.length === 0) return;
      var r = el('div', 'row');
      r.setAttribute('role', 'group');
      r.setAttribute('aria-label', label);
      r.appendChild(el('span', null, label));
      for (var i = 0; i < values.length; i += 1) {
        var chip = el('button', 'fchip');
        chip.type = 'button';
        chip.setAttribute('data-narrow', key);
        chip.setAttribute('data-value', values[i]);
        chip.setAttribute('aria-pressed', String(state.cat[key] === values[i]));
        if (withToken) chip.appendChild(tokenFor(values[i]));
        chip.appendChild(el('span', null, text(values[i])));
        r.appendChild(chip);
      }
      host.appendChild(r);
    };
    row('Kind', 'k', ORDER, function (k) {
      return LABELS[k] || k;
    }, true);
    var statuses = distinctValues('status');
    if (statuses.length > 1) {
      row('Status', 's', statuses, function (s) {
        return s;
      });
    }
    row('Context', 'c', distinctValues('context'), contextName);
  };

  var focusables = function (container) {
    var nodes = container.querySelectorAll('input, button:not([disabled]), a[href], [tabindex="0"]');
    var out = [];
    for (var i = 0; i < nodes.length; i += 1) if (!nodes[i].closest('[hidden]')) out.push(nodes[i]);
    return out;
  };
  var trapTab = function (ev, container) {
    if (ev.key !== 'Tab') return;
    var list = focusables(container);
    if (list.length === 0) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (ev.shiftKey && doc.activeElement === first) {
      last.focus();
      ev.preventDefault();
    } else if (!ev.shiftKey && doc.activeElement === last) {
      first.focus();
      ev.preventDefault();
    }
  };

  var openFind = function () {
    if (!findEl) return;
    if (!findOpen) {
      findReturn = doc.activeElement;
      findOpen = true;
      findEl.hidden = false;
      doc.body.setAttribute('data-find', 'open');
    }
    input.value = state.cat.q || '';
    renderFindChips();
    renderResults();
    input.focus();
  };
  /**
   * Close the dialog. A plain dismissal also drops the query from the address; a dismissal caused
   * by navigating to a result leaves the address to that navigation.
   */
  var closeFind = function (silent, keepFocus) {
    if (!findOpen) return;
    findOpen = false;
    findEl.hidden = true;
    doc.body.removeAttribute('data-find');
    if (!silent && state.cat.q) catalogChanged({ q: null });
    if (!keepFocus && findReturn && findReturn.focus && doc.body.contains(findReturn)) findReturn.focus();
    findReturn = null;
  };
  /** The address decides whether the dialog is open: a query in it means search is in progress. */
  var syncFind = function () {
    if (state.cat.q) openFind();
    else if (findOpen) closeFind(true, false);
  };

  var wireFind = function () {
    if (!findEl || !input || !results || !status) return;
    input.addEventListener('input', function () {
      renderResults();
      var q = input.value.trim() || null;
      if (q !== state.cat.q) catalogChanged({ q: q });
    });
    input.addEventListener('keydown', function (ev) {
      if (shown.length === 0) return;
      if (ev.key === 'ArrowDown') {
        active = active + 1 >= shown.length ? 0 : active + 1;
        markActive();
        ev.preventDefault();
      } else if (ev.key === 'ArrowUp') {
        active = active - 1 < 0 ? shown.length - 1 : active - 1;
        markActive();
        ev.preventDefault();
      } else if (ev.key === 'Enter' && active >= 0) {
        var id = shown[active].artifact.id;
        ev.preventDefault();
        closeFind(true, true);
        go({ view: 'artifacts', id: id, cat: linkCat() });
      }
    });
    findEl.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        closeFind(false, false);
        return;
      }
      trapTab(ev, findEl);
    });
    findEl.addEventListener('click', function (ev) {
      var target = ev.target instanceof Element ? ev.target : null;
      if (target === findEl) {
        closeFind(false, false);
        return;
      }
      if (!target) return;
      if (target.closest('#find-close')) {
        closeFind(false, false);
        return;
      }
      var chip = target.closest('[data-narrow]');
      if (chip) {
        var key = chip.getAttribute('data-narrow');
        var value = chip.getAttribute('data-value');
        var changes = {};
        changes[key] = state.cat[key] === value ? null : value;
        catalogChanged(changes);
        renderFindChips();
        renderResults();
        input.focus();
        return;
      }
      if (target.closest('a[href^="#/artifacts/"]')) closeFind(true, true);
    });
  };

  var keysEl = doc.getElementById('keys');
  var keysReturn = null;
  var openKeys = function () {
    if (!keysEl || !keysEl.hidden) return;
    keysReturn = doc.activeElement;
    keysEl.hidden = false;
    var close = doc.getElementById('keys-close');
    if (close) close.focus();
  };
  var closeKeys = function () {
    if (!keysEl || keysEl.hidden) return;
    keysEl.hidden = true;
    if (keysReturn && keysReturn.focus && doc.body.contains(keysReturn)) keysReturn.focus();
    keysReturn = null;
  };

  /* --------------------------------------------------------------- overview */

  var entryBuilt = false;
  var entryItem = function (list, a, count, withToken) {
    var li = el('li');
    if (withToken !== false) li.appendChild(tokenFor(a.kind));
    var link = doc.createElement('a');
    link.href = '#/artifacts/' + a.id;
    link.textContent = a.title || a.id;
    li.appendChild(link);
    if (count !== null && count !== undefined) li.appendChild(el('span', 'n', count));
    list.appendChild(li);
    return li;
  };
  var entrySection = function (host, kind, title, criterion) {
    var section = el('section');
    var h = el('h4');
    if (kind) h.appendChild(tokenFor(kind));
    h.appendChild(el('span', null, title));
    if (criterion) h.appendChild(el('span', 'crit', criterion));
    section.appendChild(h);
    host.appendChild(section);
    return section;
  };
  /** Derived ways into the model: each states the fact it counts, and none claims importance. */
  var renderEntryPoints = function () {
    var host = doc.getElementById('ov-entry');
    if (!host || entryBuilt) return;
    entryBuilt = true;
    var journeys = [];
    var contexts = [];
    for (var i = 0; i < ARTIFACTS.length; i += 1) {
      if (ARTIFACTS[i].kind === 'journey') journeys.push(ARTIFACTS[i]);
      if (ARTIFACTS[i].kind === 'bounded-context') contexts.push(ARTIFACTS[i]);
    }
    if (journeys.length > 0) {
      var js = entrySection(host, 'journey', 'Journeys', 'use cases in step order');
      var jl = el('ul');
      for (var j = 0; j < journeys.length; j += 1) {
        var li = entryItem(jl, journeys[j], null, false);
        li.style.flexWrap = 'wrap';
        var steps = [];
        /* The recorded order lives in the journey's own steps field; the compiled edges are sorted. */
        var recorded = null;
        for (var mk = 0; mk < journeys[j].meta.length; mk += 1) {
          if (journeys[j].meta[mk][0] === 'steps') recorded = String(journeys[j].meta[mk][1]);
        }
        var named = recorded ? recorded.match(ID_PATTERN) || [] : [];
        for (var s = 0; s < named.length; s += 1) {
          if (byId[named[s]] && byId[named[s]].kind === 'use-case') steps.push(byId[named[s]]);
        }
        if (steps.length > 0) {
          var ol = el('ol', 'steps');
          ol.style.flexBasis = '100%';
          for (var st = 0; st < steps.length; st += 1) {
            var sli = el('li');
            sli.appendChild(el('span', 'step', st + 1 + '.'));
            var sl = doc.createElement('a');
            sl.href = '#/artifacts/' + steps[st].id;
            sl.textContent = steps[st].title || steps[st].id;
            sli.appendChild(sl);
            ol.appendChild(sli);
          }
          li.appendChild(ol);
        }
      }
      js.appendChild(jl);
    }
    if (contexts.length > 0) {
      var cs = entrySection(host, 'bounded-context', 'Bounded contexts', 'artifacts referencing each');
      var cl = el('ul');
      for (var c = 0; c < contexts.length; c += 1) {
        var refs = incoming[contexts[c].id] || [];
        var sources = {};
        var n = 0;
        for (var r = 0; r < refs.length; r += 1) {
          if (!sources[refs[r].from]) {
            sources[refs[r].from] = true;
            n += 1;
          }
        }
        entryItem(cl, contexts[c], n, false);
      }
      cs.appendChild(cl);
    }
    if (EDGES.length > 0) {
      var degree = [];
      for (var d = 0; d < ARTIFACTS.length; d += 1) {
        var id = ARTIFACTS[d].id;
        var count = (outgoing[id] || []).length + (incoming[id] || []).length;
        if (count > 0) degree.push({ a: ARTIFACTS[d], n: count });
      }
      degree.sort(function (x, y) {
        return y.n - x.n || (x.a.id < y.a.id ? -1 : x.a.id > y.a.id ? 1 : 0);
      });
      var ms = entrySection(host, null, 'Most relationships', 'ordered by relationship count');
      var ml = el('ul');
      for (var t = 0; t < Math.min(6, degree.length); t += 1) entryItem(ml, degree[t].a, degree[t].n);
      ms.appendChild(ml);
    }
  };

  /* ------------------------------------------------------------------ render */

  var lastView = null;
  var lastId = null;
  var detailKey = null;

  var render = function () {
    applyPresentation();
    for (var v = 0; v < views.length; v += 1) {
      var section = doc.getElementById('view-' + views[v]);
      if (section) section.hidden = views[v] !== state.view;
    }
    var links = doc.querySelectorAll('nav.views a[data-view]');
    for (var l = 0; l < links.length; l += 1) {
      var target = links[l].getAttribute('data-view');
      if (target === state.view) links[l].setAttribute('aria-current', 'page');
      else links[l].removeAttribute('aria-current');
      /* Every view tab carries the one selection, so switching views never loses it. */
      var carried = target === 'focus' ? defaultFocusId() : state.id;
      links[l].setAttribute('href', hashFor({ view: target, id: carried, cat: target === 'artifacts' || target === 'focus' ? linkCat() : emptyCat() }));
    }
    doc.body.setAttribute('data-pane', state.view === 'artifacts' && (state.id || state.unknown) ? 'detail' : 'master');

    var changedView = state.view !== lastView;
    var changedId = state.id !== lastId;
    if (state.view === 'overview') renderEntryPoints();
    if (state.view === 'artifacts') {
      renderChips();
      syncList(changedId || changedView);
      renderRail();
      var key = (state.id || '') + '|' + (state.unknown || '') + '|' + catQuery(linkCat()) + '|' + (state.cat.l || '');
      if (key !== detailKey) {
        renderDetail();
        detailKey = key;
      }
    }
    syncMap(changedView, changedId);

    var current = state.id ? byId[state.id] : null;
    var viewName = { focus: 'Focus', columns: 'Columns', overview: 'Overview' }[state.view];
    doc.title =
      state.view === 'artifacts' && current
        ? current.id + ' ' + (current.title || '') + ' · ' + explorerTitle
        : state.view === 'artifacts' && state.unknown
          ? state.unknown + ' not found · ' + explorerTitle
          : state.view === 'artifacts'
            ? 'Artifacts · ' + explorerTitle
            : state.view === 'focus' && current
              ? 'Focus · ' + current.id + ' ' + (current.title || '') + ' · ' + explorerTitle
              : state.view !== 'overview' && viewName
                ? viewName + ' · ' + explorerTitle
                : explorerTitle;
    if (state.view === 'artifacts' && (changedView || changedId)) revealCurrent();

    /* Focus lands somewhere meaningful after a view or selection change, never lost. */
    if ((changedView || changedId) && !findOpen) {
      var focusTarget = null;
      if (state.view === 'artifacts' && (state.id || state.unknown)) {
        focusTarget = doc.querySelector('#detail h3.artifact');
      } else if (state.view === 'focus' && maps.focus.els[state.id]) {
        /* Refocusing keeps the keyboard on the map: the new centre takes focus. */
        focusTarget = maps.focus.els[state.id];
      } else if (state.view === 'columns' && !changedView) {
        focusTarget = null;
      } else {
        var shownSection = doc.getElementById('view-' + state.view);
        focusTarget = shownSection ? shownSection.querySelector('h2') : null;
      }
      if (focusTarget && lastView !== null) {
        if (!focusTarget.hasAttribute('data-id')) focusTarget.setAttribute('tabindex', '-1');
        focusTarget.focus();
      }
    }
    lastView = state.view;
    lastId = state.id;
  };

  /* -------------------------------------------------------------------- init */

  injectSprite();
  decorate(doc);

  doc.addEventListener(
    'click',
    function (ev) {
      var target = ev.target instanceof Element ? ev.target : null;
      if (!target) return;
      var link = target.closest('a[href^="#/"]');
      if (link && !ev.defaultPrevented && ev.button === 0 && !ev.metaKey && !ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
        link.setAttribute('href', withPresentation(link.getAttribute('href') || '#/'));
      }
    },
    true,
  );

  var clearChanges = function (which) {
    if (which === 'all') return { k: null, s: null, c: null, f: null };
    var changes = {};
    changes[which] = null;
    return changes;
  };
  var master = doc.querySelector('.master');
  if (master) {
    master.addEventListener('click', function (ev) {
      var target = ev.target instanceof Element ? ev.target : null;
      if (!target) return;
      var head = target.closest('.khead');
      if (head) {
        var kind = head.getAttribute('data-group');
        openGroups[kind] = !(head.getAttribute('aria-expanded') === 'true');
        syncList(false);
        var again = doc.querySelector('#artifact-list .khead[data-group="' + kind + '"]');
        if (again) again.focus();
        return;
      }
      var chip = target.closest('[data-clear]');
      if (chip) {
        catalogChanged(clearChanges(chip.getAttribute('data-clear')));
        return;
      }
      var railKind = target.closest('[data-rail]');
      if (railKind) {
        var rk = railKind.getAttribute('data-rail');
        openGroups[rk] = true;
        setPresentation({ m: null });
        syncList(false);
        var group = doc.querySelector('#artifact-list .kgroup[data-kind="' + rk + '"]');
        var wrap = doc.querySelector('.master .listwrap');
        if (group && wrap) wrap.scrollTop = group.offsetTop;
        var headAgain = group ? group.querySelector('.khead') : null;
        if (headAgain) headAgain.focus();
        return;
      }
      if (target.closest('#master-toggle')) toggleMaster();
    });
  }

  var detailHost = doc.getElementById('detail');
  if (detailHost) {
    detailHost.addEventListener('click', function (ev) {
      var target = ev.target instanceof Element ? ev.target : null;
      if (!target) return;
      var stepBtn = target.closest('[data-step]');
      if (stepBtn) {
        stepTo(Number(stepBtn.getAttribute('data-step')));
        return;
      }
      var copyBtn = target.closest('[data-copy]');
      if (copyBtn && state.id) {
        if (copyBtn.getAttribute('data-copy') === 'id') copyText(state.id, 'Copied ' + state.id);
        else copyText(location.href, 'Copied the link to ' + state.id);
        return;
      }
      var jump = target.closest('[data-jump]');
      if (jump) {
        var heading = doc.getElementById(jump.getAttribute('data-jump'));
        if (heading) detailHost.scrollTop = Math.max(0, heading.offsetTop - 12);
      }
    });
  }

  for (var mapName in maps) if (hasOwn(maps, mapName)) wireMap(maps[mapName]);
  wireMapControls();
  if (cardEl) {
    cardEl.addEventListener('mouseenter', function () {
      var m = activeMap();
      if (m && m.att && cardEl.hasAttribute('data-passive')) setAttention(m, null);
    });
  }
  window.addEventListener('resize', function () {
    var m = activeMap();
    if (m && m.plane) fitMap(m);
  });

  var appearance = doc.querySelectorAll('[data-appearance-set]');
  for (var ap = 0; ap < appearance.length; ap += 1) {
    appearance[ap].addEventListener('click', function (ev) {
      var value = ev.currentTarget.getAttribute('data-appearance-set');
      setPresentation({ a: value === 'auto' ? null : value });
    });
  }
  var openers = ['find-open', 'ov-find'];
  for (var o = 0; o < openers.length; o += 1) {
    var opener = doc.getElementById(openers[o]);
    if (opener) opener.addEventListener('click', openFind);
  }
  var keysOpen = doc.getElementById('keys-open');
  if (keysOpen) keysOpen.addEventListener('click', openKeys);
  var lensToggle = doc.getElementById('lens-toggle');
  if (lensToggle) lensToggle.addEventListener('click', toggleLens);
  if (keysEl) {
    keysEl.addEventListener('click', function (ev) {
      var target = ev.target instanceof Element ? ev.target : null;
      if (target === keysEl || (target && target.closest('#keys-close'))) closeKeys();
    });
    keysEl.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        closeKeys();
        return;
      }
      trapTab(ev, keysEl);
    });
  }

  /* Shortcuts accelerate; every one of them also has a visible control. */
  doc.addEventListener('keydown', function (ev) {
    if (findOpen || (keysEl && !keysEl.hidden)) return;
    var t = ev.target instanceof Element ? ev.target : null;
    var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    var mod = ev.ctrlKey || ev.metaKey;
    if (mod && !ev.altKey && (ev.key === 'k' || ev.key === 'K')) {
      ev.preventDefault();
      openFind();
      return;
    }
    if (mod && !ev.altKey && (ev.key === 'b' || ev.key === 'B')) {
      ev.preventDefault();
      toggleMaster();
      return;
    }
    if (typing || mod || ev.altKey) return;
    if (ev.key === '/') {
      ev.preventDefault();
      openFind();
    } else if (ev.key === '?') {
      ev.preventDefault();
      openKeys();
    } else if ((ev.key === 'j' || ev.key === 'k') && state.view === 'artifacts' && state.id) {
      stepTo(ev.key === 'j' ? 1 : -1);
    } else if (ev.key === 'l' || ev.key === 'L') {
      ev.preventDefault();
      toggleLens();
    } else if (ev.key === 'f' || ev.key === 'F') {
      var attended = activeMap() && activeMap().att ? activeMap().att : state.id;
      if (attended) {
        ev.preventDefault();
        focusOn(attended);
      }
    } else if (activeMap() && (ev.key === '+' || ev.key === '=' || ev.key === '-' || ev.key === '0')) {
      ev.preventDefault();
      if (ev.key === '0') fitMap(activeMap());
      else zoomCentre(activeMap(), ev.key === '-' ? 0.8 : 1.25);
    } else if (ev.key === 'Escape' && state.view === 'columns' && state.id) {
      selectInColumns(null);
    }
  });

  wireFind();
  warmIndex();

  window.addEventListener('hashchange', function () {
    if (suppress) {
      suppress = false;
      return;
    }
    fromAddress();
  });

  /* The phone menu: the views and display options open beneath the header on request and close
     once the reader has chosen, on Escape, or on a tap elsewhere. */
  var menuToggle = doc.getElementById('menu-toggle');
  var setMenu = function (open) {
    var views = doc.getElementById('site-views');
    /* Closing hides the control that has focus; hand focus back to the menu button, not the body. */
    if (!open && menuToggle && views && views.contains(doc.activeElement)) menuToggle.focus();
    if (open) doc.body.setAttribute('data-menu', 'open');
    else doc.body.removeAttribute('data-menu');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', String(open));
  };
  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      setMenu(doc.body.getAttribute('data-menu') !== 'open');
    });
    doc.addEventListener('click', function (ev) {
      if (doc.body.getAttribute('data-menu') !== 'open') return;
      var t = ev.target instanceof Element ? ev.target : null;
      if (!t || t.closest('#menu-toggle')) return;
      if (t.closest('nav.views a') || t.closest('#find-open') || !t.closest('header.site')) setMenu(false);
    });
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && doc.body.getAttribute('data-menu') === 'open') {
        setMenu(false);
        menuToggle.focus();
      }
    });
    window.addEventListener('hashchange', function () {
      setMenu(false);
    });
    var phoneQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 40rem)') : null;
    if (phoneQuery && typeof phoneQuery.addEventListener === 'function') {
      phoneQuery.addEventListener('change', function () {
        setMenu(false);
      });
    }
  }

  var noscript = doc.getElementById('needs-script');
  if (noscript && noscript.parentNode) noscript.parentNode.removeChild(noscript);

  /* A phone opened without an address starts where it can be read: the artifact catalog. The
     maps stay one tap away, and any address — including '#/' for the Overview — is honoured. */
  var phone = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 40rem)').matches;
  if (phone && (location.hash === '' || location.hash === '#')) {
    try {
      history.replaceState(null, '', '#/artifacts');
    } catch (err) {
      /* Some browsers refuse history manipulation on file:// URLs; the Overview then opens. */
    }
  }

  fromAddress();
  var launch = new URLSearchParams(window.location.search);
  if (launch.has('search')) openFind();
  else if (launch.has('keys')) openKeys();
})();
`.trim();

function token(kind: string): string {
  return `<span class="token k-${escapeHtml(kind)}" data-kind="${escapeHtml(kind)}" title="${escapeHtml(kindLabels[kind] ?? kind)}">${escapeHtml(kindTokens[kind] ?? '?')}</span>`;
}

function metaValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => metaValue(item)).join(', ');
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${metaValue(v)}`)
      .join('; ');
  }
  return String(value);
}

/** Frontmatter beyond the fields the header already shows, as plain key/value text pairs. */
function metaPairs(frontmatter: Record<string, unknown>): [string, string][] {
  const skip = new Set(['id', 'type', 'title', 'status']);
  return Object.entries(frontmatter)
    .filter(([key, value]) => !skip.has(key) && value !== undefined && value !== null)
    .filter(([, value]) => !(Array.isArray(value) && value.length === 0))
    .map(([key, value]) => [key, metaValue(value)]);
}

function sortedByKind(artifacts: LoadedArtifact[]): Map<string, LoadedArtifact[]> {
  const groups = new Map<string, LoadedArtifact[]>();
  const known = artifacts.filter((a) => a.id && a.type);
  const extraKinds = [...new Set(known.map((a) => a.type as string))]
    .filter((t) => !kindOrder.includes(t))
    .sort();
  for (const kind of [...kindOrder, ...extraKinds]) {
    const members = known
      .filter((a) => a.type === kind)
      .sort((a, b) => (a.id as string).localeCompare(b.id as string));
    if (members.length > 0) groups.set(kind, members);
  }
  return groups;
}

/**
 * Shift a rendered body's headings down so they nest under the detail's h3 artifact title without
 * skipping a level: h2 (the convention artifact bodies use) becomes h4, and deeper levels clamp at h6.
 */
function shiftHeadings(html: string): string {
  return html.replace(/<(\/?)h([1-6])>/g, (_, slash: string, level: string) => {
    const shifted = Math.min(6, Number(level) + 2);
    return `<${slash}h${shifted}>`;
  });
}

/** A frontmatter value as a list of text lines: a string is one line, an array one line per item. */
function textLines(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value))
    return value.map((item) => metaValue(item)).filter((line) => line !== '');
  const line = metaValue(value);
  return line === '' ? [] : [line];
}

/**
 * The inert data region: every artifact's rendered body, metadata and status, plus every
 * relationship. `<` is escaped so the JSON can never terminate its containing script element.
 *
 * Two derived fields serve the business lens without the page re-deriving model rules: a structured
 * behaviour's given / when / then as lists of lines, and `q`, the artifacts a change to this one
 * puts in question — the same one-hop rule `prodshape impact` applies.
 */
function explorerDataJson(graph: ProductGraph, groups: Map<string, LoadedArtifact[]>): string {
  const artifacts: Record<string, unknown>[] = [];
  for (const [kind, members] of groups) {
    for (const a of members) {
      const questioned = [...new Set(putInQuestionBy(graph, a.id as string).map((e) => e.id))];
      artifacts.push({
        id: a.id as string,
        kind,
        kindName: kindLabels[kind] ?? kind,
        title: a.title ?? (a.id as string),
        status: a.status ?? 'unknown',
        context:
          typeof a.frontmatter['bounded-context'] === 'string'
            ? a.frontmatter['bounded-context']
            : null,
        meta: metaPairs(a.frontmatter),
        body: shiftHeadings(renderMarkdown(a.body.trim())),
        ...(kind === 'structured-behaviour'
          ? {
              gwt: {
                given: textLines(a.frontmatter['given']),
                when: textLines(a.frontmatter['when']),
                then: textLines(a.frontmatter['then']),
              },
            }
          : {}),
        q: questioned,
      });
    }
  }
  const payload = {
    kindOrder: [...groups.keys()],
    kindLabels: Object.fromEntries([...groups.keys()].map((k) => [k, kindLabels[k] ?? k])),
    kindTokens: Object.fromEntries([...groups.keys()].map((k) => [k, kindTokens[k] ?? '?'])),
    artifacts,
    edges: graph.edges.map((edge) => ({ from: edge.from, to: edge.to, kind: edge.kind })),
  };
  return JSON.stringify(payload).replaceAll('<', '\\u003c');
}

interface AggregateRow {
  from: string;
  relKind: string;
  to: string;
  count: number;
}

/** Aggregate the relationships by source kind, relationship type and target kind, with counts. */
function kindAggregate(graph: ProductGraph): AggregateRow[] {
  const kindOf = new Map(graph.nodes.map((n) => [n.id, n.type]));
  // Keyed by the triple itself rather than a delimited string: no separator to choose, nothing to
  // parse back, and the source stays plain text.
  const counts = new Map<string, AggregateRow>();
  for (const edge of graph.edges) {
    const from = kindOf.get(edge.from);
    const to = kindOf.get(edge.to);
    if (!from || !to) continue;
    const key = [from, edge.kind, to].join('\u0000');
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { from, relKind: edge.kind, to, count: 1 });
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, row]) => row);
}

function kindAggregateRows(rows: AggregateRow[]): string[] {
  return rows.map(({ from, relKind, to, count }) =>
    [
      '<tr>',
      `<td>${token(from)} ${escapeHtml(kindLabels[from] ?? from)}</td>`,
      `<td class="rel">${escapeHtml(relKind)}</td>`,
      `<td>${token(to)} ${escapeHtml(kindLabels[to] ?? to)}</td>`,
      `<td class="n">${count}</td>`,
      '</tr>',
    ].join(''),
  );
}

/**
 * The same aggregate as a source-kind by target-kind grid. Bounded by the kinds present, so it
 * belongs in the opening document; each non-empty cell opens the catalog on its source kind.
 */
function kindGrid(rows: AggregateRow[], kinds: string[]): string {
  const cells = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.from}>${row.to}`;
    cells.set(key, (cells.get(key) ?? 0) + row.count);
  }
  const from = kinds.filter((k) => rows.some((r) => r.from === k));
  const to = kinds.filter((k) => rows.some((r) => r.to === k));
  const max = Math.max(1, ...cells.values());
  const head = to
    .map(
      (k) =>
        `<th scope="col" title="${escapeHtml(kindLabels[k] ?? k)}">${token(k)}<span class="sr-only"> ${escapeHtml(kindLabels[k] ?? k)}</span></th>`,
    )
    .join('');
  const body = from
    .map((f) => {
      const tds = to
        .map((t) => {
          const n = cells.get(`${f}>${t}`);
          if (!n) {
            return '<td class="z"><span aria-hidden="true">·</span><span class="sr-only">none</span></td>';
          }
          const label = `${n} relationship${n === 1 ? '' : 's'} from ${kindLabels[f] ?? f} to ${kindLabels[t] ?? t}`;
          const weight = Math.round(8 + (n / max) * 52);
          return `<td><a href="#/artifacts?k=${encodeURIComponent(f)}" style="--p:${weight}%" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${n}</a></td>`;
        })
        .join('');
      return `<tr><th scope="row">${token(f)}${escapeHtml(kindLabels[f] ?? f)}</th>${tds}</tr>`;
    })
    .join('\n');
  return [
    '<div class="gridwrap">',
    '<table class="kgrid" aria-labelledby="h-grid">',
    '<caption>Relationships from each row kind to each column kind. Open a cell to list the row kind’s artifacts.</caption>',
    `<thead><tr><th scope="col" class="corner">from ↓ to →</th>${head}</tr></thead>`,
    '<tbody>',
    body,
    '</tbody>',
    '</table>',
    '</div>',
  ].join('\n');
}

/**
 * The frame of one map view: an empty, focusable viewport the application draws into, its zoom
 * controls and a line stating its gestures. Bounded markup: the drawing itself comes from the data.
 */
function mapBox(name: string, label: string, hint: string): string {
  return [
    '<div class="mapbox">',
    `<div class="mapview" id="map-${name}" tabindex="0" role="group" aria-roledescription="map" aria-label="${escapeHtml(label)}" aria-describedby="maphint-${name}"></div>`,
    `<p class="maphint" id="maphint-${name}">${escapeHtml(hint)}</p>`,
    `<div class="mapctl" role="group" aria-label="${escapeHtml(label)} zoom">`,
    `<button type="button" class="tbtn" data-zoom="in" data-map="${name}" aria-label="Zoom in (+)" title="Zoom in (+)">+</button>`,
    `<button type="button" class="tbtn" data-zoom="out" data-map="${name}" aria-label="Zoom out (-)" title="Zoom out (-)">−</button>`,
    `<button type="button" class="tbtn" data-zoom="fit" data-map="${name}" aria-label="Fit the map to the view (0)" title="Fit the map to the view (0)">Fit</button>`,
    '</div>',
    '</div>',
  ].join('\n');
}

export interface ExplorerOptions {
  /** Adds a project-specific possessive before “Product Explorer”, e.g. “Lyceum’s Product Explorer”. */
  productName?: string;
  /** Destination for the persistent ProductShape attribution link. */
  productUrl?: string;
  /** ProductShape CLI version used to generate the Product Explorer. */
  productVersion?: string;
}

export function buildExplorerHtml(
  graph: ProductGraph,
  artifacts: LoadedArtifact[],
  revision: string | undefined,
  options: ExplorerOptions = {},
): string {
  const productName = options.productName?.trim();
  const explorerTitle = productName ? `${productName}’s Product Explorer` : 'Product Explorer';
  const productUrl = options.productUrl?.trim() || 'https://juangcarmona.github.io/productshape/';
  const parsedProductUrl = new URL(productUrl);
  if (parsedProductUrl.protocol !== 'https:' && parsedProductUrl.protocol !== 'http:') {
    throw new Error('Product attribution URL must use http or https.');
  }
  const groups = sortedByKind(artifacts);
  const revisionText = revision
    ? `revision <span class="rev">${escapeHtml(revision)}</span>`
    : 'revision unavailable (not generated from a Git checkout)';
  const revisionShort = revision
    ? `<span class="revshort" title="revision ${escapeHtml(revision)}">${escapeHtml(revision.slice(0, 7))}</span>`
    : '<span class="revshort" title="Not generated from a Git checkout">no revision</span>';

  const degree = new Map<string, number>(graph.nodes.map((n) => [n.id, 0]));
  for (const edge of graph.edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  const unconnected = graph.nodes
    .filter((n) => (degree.get(n.id) ?? 0) === 0)
    .map((n) => n.id)
    .sort((a, b) => a.localeCompare(b));

  const largest = Math.max(1, ...[...groups.values()].map((m) => m.length));
  const kindRows: string[] = [];
  for (const [kind, members] of groups) {
    kindRows.push(
      `<li class="k-${escapeHtml(kind)}">${token(kind)}<a href="#/artifacts?k=${encodeURIComponent(kind)}">${escapeHtml(kindLabels[kind] ?? kind)}</a><span class="bar" aria-hidden="true"><i style="width:${Math.round((members.length / largest) * 100)}%"></i></span><span class="count">${members.length}</span></li>`,
    );
  }

  const aggregate = kindAggregate(graph);
  const aggregateRows = kindAggregateRows(aggregate);

  const keyList = [
    ['<kbd>/</kbd> or <kbd>Ctrl</kbd> <kbd>K</kbd>', 'Search the product'],
    ['<kbd>Ctrl</kbd> <kbd>B</kbd>', 'Collapse or expand the artifact list'],
    ['<kbd>j</kbd> / <kbd>k</kbd>', 'Next or previous artifact in the list'],
    [
      '<kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd>',
      'On a map: move to the nearest artifact, or pan when the map itself has focus',
    ],
    [
      '<kbd>Enter</kbd>',
      'On a map: focus the artifact (Columns: select it; the Focus centre: read it)',
    ],
    ['<kbd>f</kbd>', 'Open the Focus view on the artifact you are on'],
    ['<kbd>+</kbd> / <kbd>-</kbd> / <kbd>0</kbd>', 'Zoom the map in, out, or fit it to the view'],
    ['<kbd>l</kbd>', 'Turn the business lens on or off'],
    ['<kbd>Esc</kbd>', 'Close search or this list; clear the Columns selection'],
    ['<kbd>?</kbd>', 'Show these shortcuts'],
  ]
    .map(([keys, what]) => `<dt>${keys}</dt><dd>${what}</dd>`)
    .join('');

  const lines = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    `<title>${escapeHtml(explorerTitle)}</title>`,
    `<style>\n${style}\n</style>`,
    '</head>',
    '<body data-pane="master" data-master="open">',
    '<a class="skip" href="#main">Skip to content</a>',
    '<header class="site">',
    `<h1 title="${escapeHtml(explorerTitle)}">${escapeHtml(explorerTitle)}</h1>`,
    revisionShort,
    '<nav class="views" id="site-views" aria-label="Explorer views">',
    '<a href="#/" data-view="overview" aria-current="page">Overview</a>',
    '<a href="#/focus" data-view="focus">Focus</a>',
    '<a href="#/columns" data-view="columns">Columns</a>',
    '<a href="#/artifacts" data-view="artifacts">Artifacts</a>',
    '</nav>',
    '<span class="spacer"></span>',
    '<button type="button" class="findbtn" id="find-open" aria-haspopup="dialog" aria-keyshortcuts="/ Control+K" data-icon="search"><span class="lbl">Search the product</span><kbd>/</kbd></button>',
    '<button type="button" class="iconbtn menubtn" id="menu-toggle" aria-expanded="false" aria-controls="site-views" aria-label="Views and display options" title="Views and display options" data-icon="menu"></button>',
    '<button type="button" class="lensbtn" id="lens-toggle" aria-pressed="false" aria-keyshortcuts="L" title="Business lens: read use cases in business language (l)" data-icon="lens"><span class="lbl">Business lens</span></button>',
    '<div class="seg" role="group" aria-label="Appearance">',
    '<button type="button" data-appearance-set="light" aria-pressed="false" aria-label="Light appearance" title="Light appearance" data-icon="sun"></button>',
    '<button type="button" data-appearance-set="dark" aria-pressed="false" aria-label="Dark appearance" title="Dark appearance" data-icon="moon"></button>',
    '<button type="button" data-appearance-set="auto" aria-pressed="true" aria-label="Follow the system appearance" title="Follow the system appearance" data-icon="auto"></button>',
    '</div>',
    '<button type="button" class="iconbtn" id="keys-open" aria-haspopup="dialog" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" data-icon="keys"></button>',
    '</header>',
    '<main id="main">',

    // ---- Overview: the opening view. Orientation, then the map the application draws from the
    // data (every artifact as a chip, no authored content), then the aggregate below it.
    '<section id="view-overview" aria-labelledby="h-overview">',
    '<div class="ovhead">',
    '<h2 class="view" id="h-overview">Overview</h2>',
    `<p class="ident">${graph.nodes.length} artifact${graph.nodes.length === 1 ? '' : 's'} · ${graph.edges.length} relationship${graph.edges.length === 1 ? '' : 's'} · ${groups.size} kind${groups.size === 1 ? '' : 's'} · ${revisionText}</p>`,
    '<p class="lead">This page is a generated, read-only projection of a product model at the',
    'revision stamped here. It is regenerated from the authored files at any time and is never',
    'authoritative. Nothing here can be edited, and nothing you do is stored.</p>',
    '<div role="search"><button type="button" class="bigfind" id="ov-find" aria-haspopup="dialog" data-icon="search"><span class="lbl">Search by identifier, title or phrase</span><kbd>/</kbd></button></div>',
    '<a class="tofacts" href="#h-facts">Counts and the kind-level aggregate ↓</a>',
    '</div>',
    mapBox(
      'overview',
      'Overview map: every artifact, by kind',
      'Drag to pan · wheel or pinch to zoom · hover or Tab onto an artifact to light its neighbours · click or Enter to focus it · arrow keys move between artifacts',
    ),
    '<div class="ovwrap">',
    '<div class="ovcol">',
    '<h3 class="block" id="h-facts">The model in numbers</h3>',
    '<dl class="metrics">',
    `<div><dt>Artifacts</dt><dd>${graph.nodes.length}</dd></div>`,
    `<div><dt>Relationships</dt><dd>${graph.edges.length}</dd></div>`,
    `<div><dt>Artifact kinds</dt><dd>${groups.size}</dd></div>`,
    '</dl>',
    '<h3 class="block" id="h-composition">Composition</h3>',
    '<ul class="kinds" aria-labelledby="h-composition">',
    ...kindRows,
    '</ul>',
    '<h3 class="block" id="h-entry">Ways into the model</h3>',
    '<div class="entry" id="ov-entry"></div>',
    '<h3 class="block" id="h-unconnected">Artifacts with no relationships</h3>',
    unconnected.length > 0
      ? [
          `<p class="note">${unconnected.length} of ${graph.nodes.length} artifacts declare no relationships and are referenced by none. This is derived from the compiled graph and says nothing about whether that is intended.</p>`,
          '<ul class="idlist" aria-labelledby="h-unconnected">',
          ...unconnected.map(
            (id) => `<li><a href="#/artifacts/${escapeHtml(id)}">${escapeHtml(id)}</a></li>`,
          ),
          '</ul>',
        ].join('\n')
      : '<p class="note">Every artifact in this model participates in at least one relationship.</p>',
    '</div>',
    '<div class="ovcol">',
    '<h3 class="block" id="h-grid">How the kinds connect</h3>',
    aggregate.length > 0
      ? kindGrid(aggregate, [...groups.keys()])
      : '<p class="note">This model declares no relationships.</p>',
    '<h3 class="block" id="h-aggregate">Relationships by kind</h3>',
    aggregateRows.length > 0
      ? [
          '<table class="grid" aria-labelledby="h-aggregate">',
          '<caption>Every relationship in the model, aggregated by the kinds it connects and its type.</caption>',
          '<thead><tr><th scope="col">From kind</th><th scope="col">Relationship</th><th scope="col">To kind</th><th scope="col" class="n">Count</th></tr></thead>',
          '<tbody>',
          ...aggregateRows,
          '</tbody>',
          '</table>',
        ].join('\n')
      : '<p class="note">This model declares no relationships.</p>',
    '</div>',
    '</div>',
    '</section>',

    // ---- Focus view: one artifact among its neighbours, drawn from the data on demand.
    '<section id="view-focus" aria-labelledby="h-focus" hidden>',
    '<div class="mapbar">',
    '<h2 class="view" id="h-focus">Focus</h2>',
    '<nav class="trail" id="focus-trail" aria-label="Recently focused"></nav>',
    '</div>',
    mapBox(
      'focus',
      'Focus view: the selected artifact and its direct neighbours',
      'Hover or Tab onto a neighbour to light its relationship · click or Enter to focus it · Enter on the centre reads it · a group heading collapses or expands its kind',
    ),
    '</section>',

    // ---- Columns view: one column per kind, every relationship drawn, on demand.
    '<section id="view-columns" aria-labelledby="h-columns" hidden>',
    '<div class="mapbar">',
    '<h2 class="view" id="h-columns">Columns</h2>',
    '<p class="note">One column per kind; use cases and domain terms grouped by bounded context.</p>',
    '</div>',
    mapBox(
      'columns',
      'Columns view: every artifact in one column per kind',
      'Hover or Tab onto an artifact to light its neighbours · click or Enter selects it · double-click or f focuses it · Esc clears',
    ),
    '</section>',

    // ---- Artifacts: master and Reader, rendered on demand.
    '<section id="view-artifacts" aria-labelledby="h-artifacts" hidden>',
    '<h2 class="view sr-only" id="h-artifacts">Artifacts</h2>',
    '<div class="md">',
    '<aside class="master" aria-label="Artifact list">',
    '<div class="masterhead">',
    '<h3 id="h-list">Artifacts</h3>',
    '<span class="counts" id="list-counts"></span>',
    '<button type="button" class="iconbtn" id="master-toggle" aria-controls="artifact-list" aria-expanded="true" aria-keyshortcuts="Control+B" aria-label="Collapse the artifact list to a kind rail (Ctrl+B)" data-icon="panel"></button>',
    '</div>',
    '<div class="chips" id="list-chips" role="group" aria-label="Active filters" hidden></div>',
    '<div class="listwrap"><div id="artifact-list"></div></div>',
    '<nav class="rail" id="kind-rail" aria-label="Artifact kinds"></nav>',
    `<a class="master-credit" href="${escapeHtml(parsedProductUrl.href)}" target="_blank" rel="noopener noreferrer" aria-label="Build with ProductShape v${escapeHtml(options.productVersion ?? 'unknown')}" title="Build with ProductShape v${escapeHtml(options.productVersion ?? 'unknown')}"><span class="info" aria-hidden="true">i</span><span class="label">Build with ProductShape v${escapeHtml(options.productVersion ?? 'unknown')}</span></a>`,
    '</aside>',
    '<article class="detail" id="detail"></article>',
    '</div>',
    '</section>',
    '<aside class="mcard" id="mcard" aria-label="Artifact summary" hidden></aside>',
    '<p id="needs-script" class="note">This page needs JavaScript to render artifact content, which',
    'it holds entirely within this file — no network access is involved.</p>',
    '</main>',

    // ---- Search dialog and shortcut list: overlays, opened on request.
    '<div class="dlg" id="find" role="dialog" aria-modal="true" aria-labelledby="find-title" hidden>',
    '<div class="dlgbox">',
    '<h2 class="sr-only" id="find-title">Search the product</h2>',
    '<div class="pin" data-icon="search">',
    '<label class="sr-only" for="q-body">Search</label>',
    '<input id="q-body" type="search" autocomplete="off" spellcheck="false" placeholder="Identifier, title or phrase" role="combobox" aria-expanded="true" aria-controls="q-body-results" aria-describedby="q-body-status">',
    '<button type="button" class="tbtn" id="find-close" aria-label="Close search (Esc)">Esc</button>',
    '</div>',
    '<div class="pchips" id="find-chips"></div>',
    '<p class="qstatus" id="q-body-status" role="status" aria-live="polite"></p>',
    '<ul class="results" id="q-body-results" role="listbox" aria-label="Search results"></ul>',
    '<div class="dlgfoot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>',
    '</div>',
    '</div>',
    '<div class="dlg" id="keys" role="dialog" aria-modal="true" aria-labelledby="keys-title" hidden>',
    '<div class="dlgbox">',
    '<div class="dlghead"><h2 id="keys-title">Keyboard shortcuts</h2><button type="button" class="iconbtn" id="keys-close" aria-label="Close keyboard shortcuts" data-icon="close"></button></div>',
    `<dl class="keys">${keyList}</dl>`,
    '</div>',
    '</div>',
    '<p class="toast" id="toast" role="status" aria-live="polite"></p>',
    `<script id="explorer-data" type="application/json">${explorerDataJson(graph, groups)}</script>`,
    `<script>\n${script}\n</script>`,
    '</body>',
    '</html>',
  ];
  return `${lines.filter((l) => l !== '').join('\n')}\n`;
}
