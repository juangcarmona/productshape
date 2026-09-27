import type { ProductGraph } from './graph.js';
import { escapeHtml, renderMarkdown } from './markdown.js';
import type { LoadedArtifact } from './model.js';

/**
 * The Product Snapshot Explorer: one self-contained, read-only HTML file that contains the whole
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
  --topo-w: 27rem;
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
header.site h1 { margin: 0; font-size: 0.98rem; letter-spacing: -0.005em; white-space: nowrap; }
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
.gridwrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 4px; }
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
  grid-template-columns: var(--master-w) minmax(0, 1fr) 7px var(--topo-w);
}
body[data-master='rail'] .md { grid-template-columns: 3.4rem minmax(0, 1fr) 7px var(--topo-w); }
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
.rail { display: none; flex-direction: column; align-items: center; gap: 0.1rem; padding: 0.35rem 0; overflow-y: auto; }
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

.split { cursor: col-resize; background: var(--bg); border-left: 1px solid var(--line-strong); position: relative; touch-action: none; }
.split::after {
  content: ''; position: absolute; top: 50%; left: 1px; width: 3px; height: 2.2rem; margin-top: -1.1rem;
  border-left: 1px solid var(--line-strong); border-right: 1px solid var(--line-strong);
}
.split:hover, .split:focus-visible, .split[data-dragging] { background: var(--accent-soft); }
.topo { min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--bg); }
#graph-host { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.topohead { flex: none; display: flex; align-items: center; gap: 0.6rem; height: 2.4rem; padding: 0 0.8rem; border-bottom: 1px solid var(--line); }
.topohead h4 { margin: 0; font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.07em; }
.topohead .legend { margin-left: auto; font-size: 0.74rem; color: var(--muted); }
#graph-host p.note { margin: 0.8rem; }
.stage { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; position: relative; }
.canvas { position: relative; }
.canvas > svg { position: absolute; left: 0; top: 0; overflow: visible; }
.canvas line.edge { stroke: var(--edge-soft); stroke-width: 1.5; }
.canvas line.edge.out { stroke: var(--edge); }
.canvas line.edge.hl { stroke: var(--accent); stroke-width: 2.4; }
.canvas marker path { fill: var(--edge); }
.anode {
  position: absolute; overflow: hidden; text-align: center; background: var(--raise);
  border: 2px solid var(--ink); border-radius: 5px; padding: 0.4rem 0.6rem; z-index: 2;
}
.anode .aid { font: 0.7rem var(--mono); color: var(--muted); }
.anode .t { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; color: var(--ink); font-weight: 650; line-height: 1.25; margin-top: 0.2rem; font-size: 0.82rem; }
button.tg {
  position: absolute; z-index: 3; display: flex; flex-direction: column; align-items: center; gap: 0.1rem;
  border: 1px solid var(--line-strong); background: var(--raise); border-radius: 4px;
  padding: 0.25rem 0.4rem 0.3rem; cursor: pointer; text-align: center; overflow: hidden;
}
button.tg:hover, button.tg.hl { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
button.tg[aria-expanded='true'] { border-color: var(--accent); background: var(--accent-soft); }
button.tg .verb { font: 0.68rem var(--mono); color: var(--muted); white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
button.tg .main { display: flex; align-items: center; gap: 0.3rem; color: var(--ink); font-size: 0.78rem; font-weight: 600; white-space: nowrap; max-width: 100%; min-width: 0; }
button.tg .main .lbl { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
button.tg .gcount { flex: none; }
button.tg .gcount { font: 700 0.74rem var(--mono); color: var(--kc, var(--ink)); }
.members-pop {
  position: absolute; z-index: 6; display: flex; flex-direction: column; max-height: 300px;
  background: var(--raise); border: 1px solid var(--line-strong); border-radius: 5px; box-shadow: var(--shadow);
}
.members-pop header { display: flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.4rem 0.35rem 0.6rem; border-bottom: 1px solid var(--line); font-size: 0.76rem; color: var(--muted); }
.members-pop header b { color: var(--ink); }
.members-pop header .grow { flex: 1; }
.members-pop ul { list-style: none; margin: 0; padding: 0.2rem 0; overflow-y: auto; }
.members-pop li a { display: block; padding: 0.22rem 0.6rem; color: var(--text); font-size: 0.82rem; }
.members-pop li a:hover { background: var(--panel); text-decoration: none; }
.members-pop li a .aid { display: block; font: 0.68rem var(--mono); color: var(--muted); }
.ghint { flex: none; margin: 0; border-top: 1px solid var(--line); padding: 0.35rem 0.8rem; font-size: 0.74rem; color: var(--muted); }

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
  .md { grid-template-columns: var(--master-w) minmax(0, 1fr); }
  body[data-master='rail'] .md { grid-template-columns: 3.4rem minmax(0, 1fr); }
  .topo, .split { display: none; }
  .findbtn { min-width: 0; }
  .findbtn .lbl, .findbtn kbd { display: none; }
}
@media (max-width: 70rem) {
  .ovwrap { grid-template-columns: minmax(0, 1fr); padding: 1rem; }
}
@media (max-width: 62rem) {
  .md, body[data-master='rail'] .md { grid-template-columns: minmax(0, 1fr); }
  .master { border-right: none; }
  .rail, #master-toggle, .revshort { display: none; }
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
@media (max-width: 34rem) {
  header.site h1 {
    position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
  }
  #keys-open { display: none; }
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
  var dataEl = doc.getElementById('snapshot-data');
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

  var views = ['overview', 'artifacts'];

  /*
   * Everything the reader can share lives in the address, in a fixed serialization order so identical
   * states produce identical addresses: k = kind, s = status, c = bounded context, f = name/ID filter
   * (inbound from earlier snapshots), q = search query while the search dialog is open, x = the open
   * Focused Topology group, a = chosen appearance, m = collapsed master area.
   */
  var CAT_KEYS = ['k', 's', 'c', 'f', 'q', 'x', 'a', 'm'];
  var emptyCat = function () {
    return { k: null, s: null, c: null, f: null, q: null, x: null, a: null, m: null };
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
    if (/^\/artifacts\/(.+)$/.test(hash)) {
      return { view: 'artifacts', id: decodeURIComponent(hash.replace(/^\/artifacts\//, '')), legacy: false, cat: cat };
    }
    if (hash === '/artifacts') return { view: 'artifacts', id: null, legacy: false, cat: cat };
    var focused = /^\/graph\/focus\/(.+)$/.exec(hash);
    if (focused) {
      return { view: 'artifacts', id: decodeURIComponent(focused[1]), legacy: false, cat: cat, stale: true };
    }
    /* Routes earlier snapshots produced for the standalone projections resolve in place: the
       Focused Topology now lives beside the Reader on the artifacts view. */
    if (hash === '/graph' || hash === '/graph/layers' || hash === '/graph/focus') {
      return { view: 'artifacts', id: null, legacy: false, cat: cat, stale: true };
    }
    /* Legacy fragment produced by earlier snapshots: a bare artifact identifier. Permanent. */
    if (/^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/.test(hash)) {
      return { view: 'artifacts', id: hash, legacy: true, cat: cat };
    }
    return { view: 'artifacts', id: null, legacy: false, bad: hash, cat: cat };
  };

  var hashFor = function (next) {
    if (next.view === 'artifacts') {
      return (next.id ? '#/artifacts/' + next.id : '#/artifacts') + catQuery(next.cat);
    }
    return '#/' + catQuery(catWith(null, { q: next.cat.q, a: next.cat.a, m: next.cat.m }));
  };

  var state = { view: 'overview', id: null, cat: emptyCat(), unknown: null };
  var suppress = false;

  /** The discovery an artifact link carries: the filters, never the open dialog or disclosure. */
  var linkCat = function () {
    return catWith(state.cat, { q: null, x: null, a: null, m: null });
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
      cat.a = state.cat.a;
      cat.m = state.cat.m;
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
      state.cat = catWith(state.cat, { a: parsed.cat.a, m: parsed.cat.m });
      go({ view: 'artifacts', id: parsed.id, cat: parsed.cat }, 'replace');
      syncFind();
      return;
    }
    state = { view: parsed.view, id: unknown ? null : parsed.id, cat: parsed.cat, unknown: unknown };
    render();
    syncFind();
  };

  /* Presentation choices are added to every same-document link at the moment it is followed, so
     links built earlier — including the ones in the generated markup — never drop or revert them. */
  var withPresentation = function (href) {
    var q = href.indexOf('?');
    var path = q >= 0 ? href.slice(0, q) : href;
    var cat = catWith(catParse(q >= 0 ? href.slice(q + 1) : ''), { a: state.cat.a, m: state.cat.m });
    if (path === '#/' || path === '#') cat = catWith(null, { q: cat.q, a: cat.a, m: cat.m });
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
      box.appendChild(el('h3', 'artifact', 'No such artifact in this snapshot'));
      var p = el('p');
      p.appendChild(doc.createTextNode('This snapshot does not contain '));
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

  /* ------------------------------------------------------- focused topology */

  /* Layout constants of the row projection. Presentation, not product rules. */
  var CHIP_W = 184;
  var CHIP_H = 46;
  var COL_GAP = 12;
  var ROW_H = 58;
  var LANE = 52;
  var ANCHOR_W = 232;
  var ANCHOR_H = 76;
  var PAD = 14;
  var FALLBACK_W = 560;
  var LIST_W = 290;

  /**
   * Row layout: declared groups above the anchor, referencing groups below, each row centred and
   * wrapped to the pane width. A pure function of the counts and the width, so identical inputs
   * give identical boxes and no two boxes can overlap.
   */
  var layoutRows = function (nOut, nIn, width) {
    var usable = Math.max(CHIP_W, width - 2 * PAD);
    var per = Math.max(1, Math.floor((usable + COL_GAP) / (CHIP_W + COL_GAP)));
    var rowsOut = Math.ceil(nOut / per);
    var rowsIn = Math.ceil(nIn / per);
    var anchorTop = PAD + (rowsOut > 0 ? (rowsOut - 1) * ROW_H + CHIP_H + LANE : 0);
    var anchorBottom = anchorTop + ANCHOR_H;
    var cx = width / 2;
    var place = function (n, direction) {
      var boxes = [];
      for (var i = 0; i < n; i += 1) {
        var r = Math.floor(i / per);
        var inRow = Math.min(per, n - r * per);
        var j = i - r * per;
        var span = inRow * CHIP_W + (inRow - 1) * COL_GAP;
        var x = Math.round(cx - span / 2 + j * (CHIP_W + COL_GAP));
        var y = direction === 'out' ? anchorTop - LANE - CHIP_H - r * ROW_H : anchorBottom + LANE + r * ROW_H;
        boxes.push({ x: x, y: y, w: CHIP_W, h: CHIP_H, row: r });
      }
      return boxes;
    };
    var height = anchorBottom + (rowsIn > 0 ? LANE + (rowsIn - 1) * ROW_H + CHIP_H : 0) + PAD;
    return {
      width: width,
      height: height,
      anchor: { x: Math.round(cx - ANCHOR_W / 2), y: anchorTop, w: ANCHOR_W, h: ANCHOR_H },
      out: place(nOut, 'out'),
      inc: place(nIn, 'in'),
    };
  };

  var openGroupIndex = function (count) {
    if (!state.cat.x || state.cat.x === '-') return -1;
    var index = parseInt(String(state.cat.x).split('.')[0], 10);
    return isNaN(index) || index < 0 || index >= count ? -1 : index;
  };
  var setOpenGroup = function (index) {
    catalogChanged({ x: index < 0 ? null : String(index) });
  };

  var highlight = function (key) {
    var lit = doc.querySelectorAll('.hl[data-key]');
    for (var i = 0; i < lit.length; i += 1) lit[i].classList.remove('hl');
    if (!key) return;
    var matches = doc.querySelectorAll('[data-key]');
    for (var m = 0; m < matches.length; m += 1) {
      if (matches[m].getAttribute('data-key') === key) matches[m].classList.add('hl');
    }
  };
  /** Scroll the Reader so its group of the given key is in view, opening it if collapsed. */
  var revealInReader = function (key) {
    var detail = doc.getElementById('detail');
    if (!detail) return;
    var nodes = detail.querySelectorAll('[data-key]');
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].getAttribute('data-key') !== key) continue;
      if (nodes[i].tagName === 'DETAILS' && !nodes[i].open) {
        nodes[i].open = true;
        nodes[i].dispatchEvent(new Event('toggle'));
      }
      var top = nodes[i].offsetTop;
      if (top < detail.scrollTop || top + nodes[i].offsetHeight > detail.scrollTop + detail.clientHeight) {
        detail.scrollTop = Math.max(0, top - 24);
      }
      return;
    }
  };

  var svgEl = function (tag, attrs) {
    var node = doc.createElementNS(NS, tag);
    for (var key in attrs) {
      if (hasOwn(attrs, key)) node.setAttribute(key, String(attrs[key]));
    }
    return node;
  };

  var lastTopoKey = null;
  var buildFocus = function (force) {
    var host = doc.getElementById('graph-host');
    if (!host) return;
    var anchorId = state.id;
    var width = host.clientWidth || FALLBACK_W;
    var key = (anchorId || '') + '|' + (state.cat.x || '') + '|' + width;
    if (!force && key === lastTopoKey) return;
    lastTopoKey = key;
    clear(host);

    var head = el('div', 'topohead');
    head.appendChild(el('h4', null, 'Neighbourhood'));
    head.appendChild(el('span', 'legend', '↑ declares · ↓ referenced by'));
    host.appendChild(head);

    var anchor = byId[anchorId];
    if (!anchor) {
      host.appendChild(el('p', 'note', 'The neighbourhood of the selected artifact is drawn here. Nothing is selected yet.'));
      return;
    }
    var out = groupEdges(outgoing[anchorId] || [], 'out');
    var inc = groupEdges(incoming[anchorId] || [], 'in');
    var total = (outgoing[anchorId] || []).length + (incoming[anchorId] || []).length;
    if (total === 0) {
      host.appendChild(el('p', 'note', 'This artifact declares no relationships and is referenced by none.'));
      return;
    }
    var all = out.concat(inc);
    var open = openGroupIndex(all.length);
    var layout = layoutRows(out.length, inc.length, width);
    var boxes = layout.out.concat(layout.inc);

    var stage = el('div', 'stage');
    var canvas = el('div', 'canvas');
    canvas.setAttribute('role', 'group');
    canvas.setAttribute(
      'aria-label',
      'Neighbourhood of ' + anchorId + ': ' + total + ' relationships in ' + all.length + ' groups',
    );
    var height = layout.height;
    var popBox = null;
    if (open >= 0) {
      var ob = boxes[open];
      var listH = Math.min(300, 40 + all[open].edges.length * 36);
      var listW = Math.min(LIST_W, width - 16);
      popBox = {
        x: Math.round(Math.max(8, Math.min(width - listW - 8, ob.x + ob.w / 2 - listW / 2))),
        y: ob.y + ob.h + 6,
        w: listW,
        h: listH,
      };
      height = Math.max(height, popBox.y + popBox.h + PAD);
    }
    canvas.style.height = height + 'px';

    var svg = svgEl('svg', { width: width, height: height, viewBox: '0 0 ' + width + ' ' + height, 'aria-hidden': 'true', focusable: 'false' });
    var defs = svgEl('defs', {});
    var marker = svgEl('marker', { id: 'topo-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    marker.appendChild(svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z' }));
    defs.appendChild(marker);
    svg.appendChild(defs);
    var A = layout.anchor;
    /*
     * Straight lines, one anchor port each: ports are spread along the anchor's edge in the order of
     * the groups they reach, so lines fan out instead of converging on one point and never cross.
     * The group end attaches at the point of the group nearest its port. Every arrow follows the
     * relationship: into the group it declares, and into the anchor from each group referencing it.
     */
    var clamp = function (v, lo, hi) {
      return Math.max(lo, Math.min(hi, v));
    };
    var connect = function (from, count) {
      var order = [];
      for (var p = 0; p < count; p += 1) order.push(from + p);
      order.sort(function (x, y) {
        return boxes[x].x - boxes[y].x || boxes[x].row - boxes[y].row || x - y;
      });
      var margin = 22;
      var span = A.w - 2 * margin;
      for (var q = 0; q < order.length; q += 1) {
        var index = order[q];
        var b = boxes[index];
        var outward = all[index].direction === 'out';
        var port = Math.round(
          order.length === 1 ? A.x + A.w / 2 : A.x + margin + (span * (q + 0.5)) / order.length,
        );
        var attach = Math.round(clamp(port, b.x + 18, b.x + b.w - 18));
        var anchorY = outward ? A.y - 1 : A.y + A.h + 1;
        var groupY = outward ? b.y + b.h + 1 : b.y - 1;
        svg.appendChild(
          svgEl('line', {
            class: 'edge ' + (outward ? 'out' : 'in'),
            'data-key': all[index].key,
            'data-port': port,
            x1: outward ? port : attach,
            y1: outward ? anchorY : groupY,
            x2: outward ? attach : port,
            y2: outward ? groupY : anchorY,
            'marker-end': 'url(#topo-arrow)',
          }),
        );
      }
    };
    connect(0, out.length);
    connect(out.length, inc.length);
    canvas.appendChild(svg);

    var node = el('div', 'anode');
    node.style.left = A.x + 'px';
    node.style.top = A.y + 'px';
    node.style.width = A.w + 'px';
    node.style.height = A.h + 'px';
    node.appendChild(tokenFor(anchor.kind));
    node.appendChild(doc.createTextNode(' '));
    node.appendChild(el('span', 'aid', anchor.id));
    node.appendChild(el('span', 't', anchor.title || anchor.id));
    node.title = (anchor.title || anchor.id) + ' — ' + anchor.id;
    canvas.appendChild(node);

    for (var t = 0; t < all.length; t += 1) {
      var group = all[t];
      var box = boxes[t];
      var chip = el('button', 'tg k-' + group.kind);
      chip.type = 'button';
      chip.setAttribute('data-group', String(t));
      chip.setAttribute('data-key', group.key);
      chip.setAttribute('aria-expanded', String(t === open));
      chip.style.left = box.x + 'px';
      chip.style.top = box.y + 'px';
      chip.style.width = box.w + 'px';
      chip.style.height = box.h + 'px';
      var described =
        (group.direction === 'out' ? 'Declares ' : 'Referenced by ') + group.edges.length + ' ' +
        (LABELS[group.kind] || group.kind) + ' through ' + group.relKind;
      chip.setAttribute('aria-label', described);
      chip.title = described;
      chip.appendChild(el('span', 'verb', (group.direction === 'out' ? '↑ ' : '↓ ') + verbOf(group.relKind)));
      var main = el('span', 'main');
      main.appendChild(tokenFor(group.kind));
      main.appendChild(el('span', 'lbl', LABELS[group.kind] || group.kind));
      main.appendChild(el('span', 'gcount', group.edges.length));
      chip.appendChild(main);
      canvas.appendChild(chip);
    }

    if (open >= 0) {
      var opened = all[open];
      var pop = el('div', 'members-pop');
      pop.setAttribute('role', 'region');
      pop.setAttribute('data-members', opened.key);
      pop.setAttribute(
        'aria-label',
        verbOf(opened.relKind) + ' · ' + (LABELS[opened.kind] || opened.kind) + ', ' + opened.edges.length + ' members',
      );
      pop.style.left = popBox.x + 'px';
      pop.style.top = popBox.y + 'px';
      pop.style.width = popBox.w + 'px';
      var ph = doc.createElement('header');
      ph.appendChild(el('b', null, verbOf(opened.relKind)));
      ph.appendChild(el('span', 'grow', (LABELS[opened.kind] || opened.kind) + ' (' + opened.edges.length + ')'));
      var closeBtn = el('button', 'iconbtn');
      closeBtn.type = 'button';
      closeBtn.setAttribute('data-close', '');
      closeBtn.setAttribute('aria-label', 'Close the member list (Esc)');
      closeBtn.appendChild(icon('close'));
      ph.appendChild(closeBtn);
      pop.appendChild(ph);
      var ul = el('ul');
      for (var mm = 0; mm < opened.edges.length; mm += 1) {
        var memberId = otherEnd(opened.edges[mm], opened.direction);
        var member = byId[memberId];
        var li = el('li');
        var link = doc.createElement('a');
        link.href = artifactHref(memberId);
        link.setAttribute('data-member', memberId);
        link.appendChild(el('span', 'name', member && member.title ? member.title : memberId));
        link.appendChild(el('span', 'aid', memberId));
        li.appendChild(link);
        ul.appendChild(li);
      }
      pop.appendChild(ul);
      canvas.appendChild(pop);
    }

    stage.appendChild(canvas);
    host.appendChild(stage);
    host.appendChild(el('p', 'ghint', 'Select a group to list its members · a member to focus it · Esc closes'));
    if (open >= 0) revealInReader(all[open].key);
  };

  /* --------------------------------------------------------------- the split */

  var wireSplit = function () {
    var split = doc.getElementById('split');
    var md = doc.querySelector('.md');
    var topo = doc.querySelector('.topo');
    if (!split || !md || !topo) return;
    var currentWidth = function () {
      var measured = topo.getBoundingClientRect().width;
      if (measured > 0) return measured;
      var declared = parseInt(md.style.getPropertyValue('--topo-w'), 10);
      return isNaN(declared) ? 432 : declared;
    };
    var setWidth = function (px) {
      var total = md.clientWidth || 1200;
      var max = Math.max(300, Math.round(total * 0.6));
      var w = Math.round(Math.max(260, Math.min(max, px)));
      md.style.setProperty('--topo-w', w + 'px');
      split.setAttribute('aria-valuenow', String(w));
      split.setAttribute('aria-valuemax', String(max));
      split.setAttribute('aria-valuetext', 'Neighbourhood ' + w + ' pixels wide');
      buildFocus(false);
    };
    var dragging = false;
    split.addEventListener('pointerdown', function (ev) {
      dragging = true;
      split.setAttribute('data-dragging', '');
      if (split.setPointerCapture) split.setPointerCapture(ev.pointerId);
    });
    split.addEventListener('pointermove', function (ev) {
      if (dragging) setWidth(md.getBoundingClientRect().right - ev.clientX);
    });
    var stop = function () {
      dragging = false;
      split.removeAttribute('data-dragging');
    };
    split.addEventListener('pointerup', stop);
    split.addEventListener('pointercancel', stop);
    split.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft') setWidth(currentWidth() + 24);
      else if (ev.key === 'ArrowRight') setWidth(currentWidth() - 24);
      else return;
      ev.preventDefault();
    });
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
      if (links[l].getAttribute('data-view') === state.view) links[l].setAttribute('aria-current', 'page');
      else links[l].removeAttribute('aria-current');
    }
    doc.body.setAttribute('data-pane', state.view === 'artifacts' && (state.id || state.unknown) ? 'detail' : 'master');

    var changedView = state.view !== lastView;
    var changedId = state.id !== lastId;
    if (state.view === 'overview') renderEntryPoints();
    if (state.view === 'artifacts') {
      renderChips();
      syncList(changedId || changedView);
      renderRail();
      var key = (state.id || '') + '|' + (state.unknown || '') + '|' + catQuery(linkCat());
      if (key !== detailKey) {
        renderDetail();
        detailKey = key;
      }
      /* The Focused Topology sits beside the Reader and follows the same selection: the third
         region of one instrument, never a separate place. */
      buildFocus(changedId || changedView);
    }

    var current = state.id ? byId[state.id] : null;
    doc.title =
      state.view === 'artifacts' && current
        ? current.id + ' ' + (current.title || '') + ' · Product Snapshot'
        : state.view === 'artifacts' && state.unknown
          ? state.unknown + ' not found · Product Snapshot'
          : state.view === 'artifacts'
            ? 'Artifacts · Product Snapshot'
            : 'Product Snapshot';
    if (state.view === 'artifacts' && (changedView || changedId)) revealCurrent();

    /* Focus lands somewhere meaningful after a view or selection change, never lost. */
    if ((changedView || changedId) && !findOpen) {
      var focusTarget = null;
      if (state.view === 'artifacts' && (state.id || state.unknown)) {
        focusTarget = doc.querySelector('#detail h3.artifact');
      } else {
        var shownSection = doc.getElementById('view-' + state.view);
        focusTarget = shownSection ? shownSection.querySelector('h2') : null;
      }
      if (focusTarget && lastView !== null) {
        focusTarget.setAttribute('tabindex', '-1');
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
    detailHost.addEventListener('mouseover', function (ev) {
      var target = ev.target instanceof Element ? ev.target.closest('[data-key]') : null;
      highlight(target ? target.getAttribute('data-key') : null);
    });
    detailHost.addEventListener('mouseleave', function () {
      highlight(null);
    });
  }

  var graphHost = doc.getElementById('graph-host');
  if (graphHost) {
    graphHost.addEventListener('click', function (ev) {
      var target = ev.target instanceof Element ? ev.target : null;
      if (!target) return;
      if (target.closest('[data-close]')) {
        var openIndex = openGroupIndex(1000000);
        setOpenGroup(-1);
        var chipBack = graphHost.querySelector('button.tg[data-group="' + openIndex + '"]');
        if (chipBack) chipBack.focus();
        return;
      }
      var chip = target.closest('button.tg');
      if (chip) {
        var index = Number(chip.getAttribute('data-group'));
        var wasOpen = chip.getAttribute('aria-expanded') === 'true';
        setOpenGroup(wasOpen ? -1 : index);
        var again = graphHost.querySelector('button.tg[data-group="' + index + '"]');
        if (again) again.focus();
      }
    });
    var hover = function (ev) {
      var target = ev.target instanceof Element ? ev.target.closest('[data-key]') : null;
      highlight(target ? target.getAttribute('data-key') : null);
    };
    graphHost.addEventListener('mouseover', hover);
    graphHost.addEventListener('focusin', hover);
    graphHost.addEventListener('mouseleave', function () {
      highlight(null);
    });
    if (typeof window.ResizeObserver === 'function') {
      new window.ResizeObserver(function () {
        if (state.view === 'artifacts') buildFocus(false);
      }).observe(graphHost);
    }
  }

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
    } else if (ev.key === 'Escape' && state.view === 'artifacts' && state.cat.x) {
      setOpenGroup(-1);
    } else if ((ev.key === 'j' || ev.key === 'k') && state.view === 'artifacts' && state.id) {
      stepTo(ev.key === 'j' ? 1 : -1);
    }
  });

  wireSplit();
  wireFind();
  warmIndex();

  window.addEventListener('hashchange', function () {
    if (suppress) {
      suppress = false;
      return;
    }
    fromAddress();
  });

  var noscript = doc.getElementById('needs-script');
  if (noscript && noscript.parentNode) noscript.parentNode.removeChild(noscript);

  fromAddress();
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

/**
 * The inert data region: every artifact's rendered body, metadata and status, plus every
 * relationship. `<` is escaped so the JSON can never terminate its containing script element.
 */
function snapshotDataJson(graph: ProductGraph, groups: Map<string, LoadedArtifact[]>): string {
  const artifacts: Record<string, unknown>[] = [];
  for (const [kind, members] of groups) {
    for (const a of members) {
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

export function buildSnapshotHtml(
  graph: ProductGraph,
  artifacts: LoadedArtifact[],
  revision: string | undefined,
): string {
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
    ['<kbd>Esc</kbd>', 'Close search, this list, or an open neighbourhood group'],
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
    '<title>Product Snapshot</title>',
    `<style>\n${style}\n</style>`,
    '</head>',
    '<body data-pane="master" data-master="open">',
    '<a class="skip" href="#main">Skip to content</a>',
    '<header class="site">',
    '<h1>Product Snapshot</h1>',
    revisionShort,
    '<nav class="views" aria-label="Snapshot views">',
    '<a href="#/" data-view="overview" aria-current="page">Overview</a>',
    '<a href="#/artifacts" data-view="artifacts">Artifacts</a>',
    '</nav>',
    '<span class="spacer"></span>',
    '<button type="button" class="findbtn" id="find-open" aria-haspopup="dialog" aria-keyshortcuts="/ Control+K" data-icon="search"><span class="lbl">Search the product</span><kbd>/</kbd></button>',
    '<div class="seg" role="group" aria-label="Appearance">',
    '<button type="button" data-appearance-set="light" aria-pressed="false" aria-label="Light appearance" title="Light appearance" data-icon="sun"></button>',
    '<button type="button" data-appearance-set="dark" aria-pressed="false" aria-label="Dark appearance" title="Dark appearance" data-icon="moon"></button>',
    '<button type="button" data-appearance-set="auto" aria-pressed="true" aria-label="Follow the system appearance" title="Follow the system appearance" data-icon="auto"></button>',
    '</div>',
    '<button type="button" class="iconbtn" id="keys-open" aria-haspopup="dialog" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" data-icon="keys"></button>',
    '</header>',
    '<main id="main">',

    // ---- Overview: the opening view. No artifact body, no artifact-level graph.
    '<section id="view-overview" aria-labelledby="h-overview">',
    '<div class="ovwrap">',
    '<div class="ovcol">',
    '<h2 class="view" id="h-overview">Overview</h2>',
    '<p class="lead">This page is a generated, read-only projection of a product model at the',
    'revision stamped below. It is regenerated from the authored files at any time and is never',
    'authoritative. Nothing here can be edited, and nothing you do is stored.</p>',
    `<p class="ident">${graph.nodes.length} artifact${graph.nodes.length === 1 ? '' : 's'} · ${graph.edges.length} relationship${graph.edges.length === 1 ? '' : 's'} · ${revisionText}</p>`,
    '<dl class="metrics">',
    `<div><dt>Artifacts</dt><dd>${graph.nodes.length}</dd></div>`,
    `<div><dt>Relationships</dt><dd>${graph.edges.length}</dd></div>`,
    `<div><dt>Artifact kinds</dt><dd>${groups.size}</dd></div>`,
    '</dl>',
    '<div role="search"><button type="button" class="bigfind" id="ov-find" aria-haspopup="dialog" data-icon="search"><span class="lbl">Search by identifier, title or phrase</span><kbd>/</kbd></button></div>',
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

    // ---- Artifacts: master, Reader, split and Focused Topology, rendered on demand.
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
    '</aside>',
    '<article class="detail" id="detail"></article>',
    '<div class="split" id="split" role="separator" tabindex="0" aria-orientation="vertical" aria-controls="graph-host" aria-label="Resize the neighbourhood" aria-valuemin="260"></div>',
    '<aside class="topo" aria-label="Focused topology of the selected artifact">',
    '<div id="graph-host"></div>',
    '</aside>',
    '</div>',
    '</section>',
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
    `<script id="snapshot-data" type="application/json">${snapshotDataJson(graph, groups)}</script>`,
    `<script>\n${script}\n</script>`,
    '</body>',
    '</html>',
  ];
  return `${lines.filter((l) => l !== '').join('\n')}\n`;
}
