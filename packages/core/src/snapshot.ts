import type { ProductGraph } from './graph.js';
import { escapeHtml, renderMarkdown } from './markdown.js';
import type { LoadedArtifact } from './model.js';

/**
 * The Product Snapshot Explorer: one self-contained, read-only HTML file that contains the whole
 * product model and discloses it progressively.
 *
 * Packaging and presentation are deliberately separate. The file carries every artifact's content
 * and every relationship as inert embedded data; the document the browser parses at open time
 * carries the orientation view only — no artifact body, no artifact-level graph. Everything else is
 * rendered on demand from that data, so the opening document's size is bounded by the artifact
 * kinds present rather than by the artifact count.
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
};

/**
 * Stable per-kind colours. Every value meets WCAG 2.1 AA against the page background as text
 * (verified in the test suite), and colour is never the only carrier of kind: the monospace token
 * below and the kind label in text accompany it everywhere.
 */
const kindColors: Record<string, string> = {
  actor: '#2b5fb8',
  journey: '#7b3fb8',
  'use-case': '#1d6b34',
  'business-rule': '#a14d18',
  'domain-term': '#8a6d1a',
  'bounded-context': '#16748c',
  'functional-requirement': '#b8305f',
  'quality-requirement': '#5f6673',
  constraint: '#872f2f',
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
};

const statusColors: Record<string, { fg: string; bg: string }> = {
  active: { fg: '#17512a', bg: '#e4efe6' },
  draft: { fg: '#6f5714', bg: '#f7efd6' },
  deprecated: { fg: '#8a4214', bg: '#fae4d6' },
  retired: { fg: '#4f5560', bg: '#eceff3' },
};

/**
 * A precise, calm engineering instrument: light-only, system sans-serif, monospaced identifiers,
 * thin borders, deliberate alignment, low-radius controls, compact density. No gradients, no
 * shadows, no decorative illustration, no hero typography, no rounded-card dashboard treatment.
 */
const style = `
:root {
  --ink: #14181f;
  --text: #1f2430;
  --muted: #4f5560;
  --line: #d9dde5;
  --line-strong: #b9c0cd;
  --bg: #ffffff;
  --panel: #f6f7f9;
  --accent: #1c4fa3;
  --accent-soft: #e8eef8;
  --sans: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
}
* { box-sizing: border-box; }
html { color-scheme: light; }
body {
  margin: 0;
  font: 15px/1.55 var(--sans);
  color: var(--text);
  background: var(--bg);
  -webkit-text-size-adjust: 100%;
}
h1, h2, h3, h4, h5, h6 { color: var(--ink); line-height: 1.3; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
code, kbd, samp, pre, .mono { font-family: var(--mono); }
.skip {
  position: absolute; left: -9999px; top: 0;
  background: var(--bg); color: var(--accent);
  padding: 0.5rem 0.75rem; border: 1px solid var(--accent); z-index: 5;
}
.skip:focus { left: 0.5rem; top: 0.5rem; }

header.site { border-bottom: 1px solid var(--line-strong); padding: 0.7rem 1rem 0; }
header.site .title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.6rem 1rem; }
header.site h1 { margin: 0; font-size: 1.05rem; letter-spacing: 0.01em; }
header.site .facts { color: var(--muted); font-size: 0.8rem; display: flex; flex-wrap: wrap; gap: 0.9rem; }
header.site .facts .rev { font-family: var(--mono); }
nav.views { display: flex; gap: 0.15rem; margin-top: 0.55rem; }
nav.views a {
  padding: 0.3rem 0.7rem; font-size: 0.82rem; color: var(--muted);
  border: 1px solid transparent; border-bottom: none; border-radius: 2px 2px 0 0;
  position: relative; top: 1px;
}
nav.views a[aria-current='page'] {
  color: var(--ink); background: var(--bg); font-weight: 600;
  border-color: var(--line-strong); border-bottom: 1px solid var(--bg);
}
html, body { height: 100%; }
body { display: flex; flex-direction: column; overflow: hidden; }
header.site { flex: none; }
main { flex: 1 1 auto; min-height: 0; overflow: hidden; padding: 1rem; }
main > section { height: 100%; min-height: 0; }
#view-overview { overflow-y: auto; }
section[hidden] { display: none; }
h2.view { margin: 0 0 0.7rem; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); }
h3.block { margin: 1.4rem 0 0.5rem; font-size: 0.9rem; letter-spacing: 0.01em; }
p.lead { margin: 0 0 1rem; max-width: 64ch; color: var(--text); }
.note { color: var(--muted); font-size: 0.82rem; max-width: 72ch; }

.metrics { display: flex; flex-wrap: wrap; gap: 0 2rem; margin: 0 0 0.4rem; padding: 0; list-style: none; }
.metrics div { padding: 0.2rem 0; }
.metrics dt { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
.metrics dd { margin: 0; font-size: 1.35rem; font-variant-numeric: tabular-nums; }

table.grid { border-collapse: collapse; font-size: 0.83rem; width: 100%; max-width: 60rem; }
table.grid caption { text-align: left; color: var(--muted); font-size: 0.8rem; padding-bottom: 0.3rem; }
table.grid th, table.grid td { border: 1px solid var(--line); padding: 0.28rem 0.5rem; text-align: left; vertical-align: top; }
table.grid thead th { background: var(--panel); font-weight: 600; }
table.grid td.n, table.grid th.n { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--mono); }
table.grid td.rel { font-family: var(--mono); font-size: 0.78rem; color: var(--muted); }

ul.kinds { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 0.15rem 1.2rem; max-width: 60rem; }
ul.kinds li { display: flex; align-items: baseline; gap: 0.5rem; padding: 0.22rem 0; border-bottom: 1px solid var(--line); }
ul.kinds .count { margin-left: auto; font-family: var(--mono); font-variant-numeric: tabular-nums; color: var(--muted); }

.token {
  font-family: var(--mono); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em;
  border: 1px solid currentColor; border-radius: 2px; padding: 0 0.28em;
  display: inline-block; min-width: 2.9em; text-align: center; flex: none;
}
.badge {
  font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  border-radius: 2px; padding: 0.05em 0.4em; white-space: nowrap;
}

ul.plain { list-style: none; margin: 0; padding: 0; }
.master .filters p.qstatus { margin: 0; font-size: 0.72rem; color: var(--muted); min-height: 0.9rem; }
ul.results { list-style: none; margin: 0; padding: 0; max-height: 18rem; overflow-y: auto; }
ul.results li { padding: 0.25rem 0.35rem; border-bottom: 1px solid var(--line); border-left: 3px solid transparent; }
ul.results li[data-active='true'] { background: var(--accent-soft); border-left-color: var(--accent); }
ul.results li.empty { color: var(--muted); font-size: 0.8rem; border-left: none; }
ul.results .hithead { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.35rem; }
ul.results .snippet { display: block; margin-top: 0.1rem; font-size: 0.75rem; color: var(--muted); overflow-wrap: anywhere; }
ul.plain li { padding: 0.18rem 0; border-bottom: 1px solid var(--line); }
ul.idlist { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.3rem 0.5rem; }
ul.idlist a { font-family: var(--mono); font-size: 0.8rem; border: 1px solid var(--line); border-radius: 2px; padding: 0.1rem 0.4rem; }

.md { display: grid; grid-template-columns: minmax(16rem, 20rem) minmax(24rem, 52rem) minmax(0, 1fr); gap: 0; border: 1px solid var(--line-strong); height: 100%; min-height: 0; }
.master { border-right: 1px solid var(--line-strong); min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.master .filters h3.findhead { margin: 0; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); }
.master .filters { padding: 0.5rem; border-bottom: 1px solid var(--line); background: var(--panel); display: grid; gap: 0.4rem; }
.master .filters label { font-size: 0.75rem; color: var(--muted); display: grid; gap: 0.15rem; }
.master .filters select, .master .filters input {
  font: inherit; font-size: 0.85rem; padding: 0.25rem 0.35rem;
  border: 1px solid var(--line-strong); border-radius: 2px; background: var(--bg); color: var(--text); width: 100%;
}
.master .listwrap { overflow-y: auto; min-height: 6rem; }
.master h4 {
  margin: 0; padding: 0.3rem 0.5rem; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--muted); background: var(--panel); border-bottom: 1px solid var(--line); position: sticky; top: 0;
}
.master ul { list-style: none; margin: 0; padding: 0; }
.master li { border-bottom: 1px solid var(--line); }
.master a {
  display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.4rem;
  align-items: baseline; padding: 0.3rem 0.5rem 0.3rem 0.35rem;
  color: var(--text); border-left: 3px solid transparent;
}
.master a:hover { background: var(--panel); text-decoration: none; }
.master a .name { overflow-wrap: anywhere; }
.master a .aid { grid-column: 2; font-family: var(--mono); font-size: 0.72rem; color: var(--muted); }
.master a[aria-current='true'] {
  background: var(--accent-soft); border-left-color: var(--accent); font-weight: 600; color: var(--ink);
}
.master .empty { padding: 0.6rem 0.5rem; color: var(--muted); font-size: 0.85rem; }
.master .counts { padding: 0.3rem 0.5rem; border-top: 1px solid var(--line); background: var(--panel); color: var(--muted); font-size: 0.75rem; }

.detail { min-width: 0; min-height: 0; overflow-y: auto; overflow-wrap: anywhere; padding: 0.9rem 1.1rem 2rem; }
.topo { border-left: 1px solid var(--line-strong); min-width: 0; min-height: 0; overflow-y: auto; padding: 0.5rem; background: var(--bg); display: flex; flex-direction: column; }
.topo #graph-host { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.topo #graph-host svg { flex: 1 1 auto; min-height: 0; height: 100%; max-height: none; }
.topo #graph-host .denselist { flex: none; }
.topo #graph-host p.note { flex: none; }
.detail .placeholder { color: var(--muted); }
.detail > header { border-bottom: 1px solid var(--line); padding-bottom: 0.5rem; margin-bottom: 0.7rem; }
.detail h3.artifact { margin: 0.25rem 0 0.3rem; font-size: 1.2rem; }
.detail .idline { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; }
.detail .idline .aid { font-family: var(--mono); font-size: 0.82rem; color: var(--muted); }
.detail .idline .kindname { font-size: 0.78rem; color: var(--muted); }
.detail dl.meta { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0 0.7rem; margin: 0.6rem 0 0; font-size: 0.82rem; }
.detail dl.meta dt { color: var(--muted); font-family: var(--mono); font-size: 0.76rem; padding: 0.1rem 0; }
.detail dl.meta dd { margin: 0; padding: 0.1rem 0; }
.detail .body { font-size: 0.95rem; }
.detail .body h4 { margin: 1.3rem 0 0.35rem; font-size: 0.98rem; }
.detail .body h5 { margin: 1.1rem 0 0.3rem; font-size: 0.9rem; }
.detail .body h6 { margin: 1rem 0 0.3rem; font-size: 0.85rem; }
.rels h4.relhead { margin: 0 0 0.2rem; font-size: 0.85rem; }
.detail .body p, .detail .body ul, .detail .body ol { margin: 0.5rem 0; max-width: 74ch; }
.detail .body pre { background: var(--panel); border: 1px solid var(--line); padding: 0.5rem 0.7rem; overflow-x: auto; font-size: 0.82rem; }
.detail .body code { font-size: 0.88em; }
.rels { margin-top: 1.5rem; border-top: 1px solid var(--line-strong); padding-top: 0.6rem; }
.rels h5 { margin: 0.8rem 0 0.3rem; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); }
.rels ul { list-style: none; margin: 0; padding: 0; font-size: 0.85rem; }
.rels li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.4rem; padding: 0.15rem 0; border-bottom: 1px solid var(--line); }
.rels .dir { font-family: var(--mono); font-size: 0.78rem; color: var(--muted); flex: none; }
.rels .none { color: var(--muted); font-size: 0.85rem; }
details.relgroup { border: 1px solid var(--line); border-left: 2px solid var(--line-strong); margin: 0.3rem 0; }
details.relgroup > summary {
  display: flex; align-items: baseline; gap: 0.5rem; cursor: pointer;
  padding: 0.25rem 0.5rem; background: var(--panel); font-size: 0.8rem; list-style-position: inside;
}
details.relgroup > summary::marker { color: var(--muted); }
details.relgroup > summary .glabel { font-family: var(--mono); color: var(--muted); overflow-wrap: anywhere; }
details.relgroup > summary .gcount {
  margin-left: auto; font-family: var(--mono); font-variant-numeric: tabular-nums;
  border: 1px solid var(--line-strong); border-radius: 2px; padding: 0 0.35em; flex: none;
}
details.relgroup[open] > summary { border-bottom: 1px solid var(--line); }
details.relgroup ul.members { padding: 0.1rem 0.5rem 0.3rem; }
.rels p.glabel.solo {
  display: flex; align-items: baseline; gap: 0.5rem; margin: 0.3rem 0 0.1rem;
  font-family: var(--mono); font-size: 0.8rem; color: var(--muted);
}
.rels p.glabel.solo .gcount {
  margin-left: auto; font-variant-numeric: tabular-nums;
  border: 1px solid var(--line-strong); border-radius: 2px; padding: 0 0.35em; flex: none;
}
details.relgroup ul.members li:last-child { border-bottom: none; }

  padding: 0.25rem 0.7rem; font-size: 0.82rem; color: var(--muted);
  border: 1px solid var(--line); border-radius: 2px; background: var(--bg);
}
#graph-host svg { width: 100%; height: auto; max-height: 68vh; background: var(--bg); border: 1px solid var(--line); display: block; }
#graph-host text { font-family: var(--sans); fill: var(--text); }
#graph-host circle { stroke: #ffffff; stroke-width: 1.5; }
#graph-host circle.anchor { stroke: var(--ink); stroke-width: 3; }
#graph-host circle.satellite { cursor: pointer; stroke-width: 2; }
#graph-host circle.satellite:focus-visible, #graph-host circle.member:focus-visible,
  outline: 2px solid var(--accent); outline-offset: 2px;
}
#graph-host line.spoke { stroke: var(--line-strong); stroke-width: 1.4; }
#graph-host line.spoke.in { stroke-dasharray: 4 3; }
#graph-host line.member { stroke: var(--line); stroke-width: 1; }
#graph-host text.aggcount { font-family: var(--mono); font-size: 10px; fill: var(--muted); }
#graph-host .arrowhead { fill: #9aa2b3; }
#graph-host text.satcount { font-family: var(--mono); font-size: 15px; font-weight: 700; fill: #ffffff; }
#graph-host text.satkind { font-size: 12px; fill: var(--text); }
#graph-host text.edgelabel { font-family: var(--mono); font-size: 11px; fill: var(--muted); }
#graph-host svg.focus { cursor: grab; touch-action: none; }
#graph-host svg.focus[data-panning] { cursor: grabbing; }
.gcontrols { display: flex; gap: 0.3rem; margin: 0 0 0.4rem; justify-content: flex-end; }
.gcontrols button {
  font: inherit; font-size: 0.78rem; padding: 0.2rem 0.6rem;
  border: 1px solid var(--line-strong); border-radius: 2px;
  background: var(--bg); color: var(--text); cursor: pointer;
}
.gcontrols button:hover { background: var(--panel); }
#graph-host text.mlabel { font-family: var(--mono); font-size: 10px; fill: var(--muted); }
#graph-host text.anchorid { font-family: var(--mono); font-size: 13px; font-weight: 600; }
#graph-host text.anchorsub { font-size: 11px; fill: var(--muted); }
#graph-host text.axis { font-size: 11px; fill: var(--muted); letter-spacing: 0.08em; }
#graph-host rect.cell { fill: #ffffff; stroke: var(--line-strong); cursor: pointer; }
#graph-host rect.cell.collapsed { fill: var(--panel); stroke-dasharray: 4 3; }
#graph-host text.celltoken { font-family: var(--mono); font-size: 11px; font-weight: 700; fill: var(--muted); }
#graph-host text.cellcount { font-family: var(--mono); font-size: 12px; fill: var(--muted); }
#graph-host text.celllabel { font-size: 11px; fill: var(--muted); }

div.ovsearch { margin: 0.6rem 0 0.2rem; max-width: 34rem; }
div.ovsearch label { display: block; font-size: 0.78rem; color: var(--muted); margin-bottom: 0.2rem; }
div.ovsearch input { width: 100%; font: inherit; padding: 0.3rem 0.5rem; border: 1px solid var(--line-strong); border-radius: 2px; background: #ffffff; }

.unknown { border: 1px solid var(--line-strong); border-left: 3px solid var(--muted); padding: 0.7rem 0.9rem; max-width: 60rem; }
.unknown .aid { font-family: var(--mono); }

@media (max-width: 76rem) {
  .md { grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr); }
  .topo { display: none; }
}
@media (max-width: 62rem) {
  .md { grid-template-columns: minmax(0, 1fr); }
  .master { border-right: none; border-bottom: 1px solid var(--line-strong); }
  body[data-pane='detail'] .master, body[data-pane='master'] .detail { display: none; }
  .backlink { display: block; }
}
.backlink { display: block; margin: 0 0 0.6rem; font-size: 0.85rem; }
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
  var dataEl = doc.getElementById('snapshot-data');
  if (!dataEl) return;
  var DATA = JSON.parse(dataEl.textContent || '{}');
  var ARTIFACTS = DATA.artifacts || [];
  var EDGES = DATA.edges || [];
  var LABELS = DATA.kindLabels || {};
  var COLORS = DATA.kindColors || {};
  var TOKENS = DATA.kindTokens || {};
  var ORDER = DATA.kindOrder || [];

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
  var tokenFor = function (kind) {
    var span = el('span', 'token', TOKENS[kind] || '?');
    span.style.color = COLORS[kind] || '#4f5560';
    return span;
  };
  var badgeFor = function (status) {
    var span = el('span', 'badge', status || 'unknown');
    var pair = DATA.statusColors[status] || DATA.statusColors.retired;
    span.style.color = pair.fg;
    span.style.background = pair.bg;
    return span;
  };

  /* ---------------------------------------------------------------- routing */

  var views = ['overview', 'artifacts'];
  var state = { view: 'overview', id: null, graphMode: null, cat: { k: null, s: null, c: null, f: null, q: null, x: null }, unknown: null };

  /*
   * Catalog state (FR-SNAPSHOT-008): the active query and filters are part of the address, in a
   * fixed serialization order so identical states produce identical addresses. k = kind,
   * s = status, c = bounded context, f = name/ID filter, q = search query.
   */
  var CAT_KEYS = ['k', 's', 'c', 'f', 'q', 'x'];
  var emptyCat = function () {
    return { k: null, s: null, c: null, f: null, q: null, x: null };
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
      return {
        view: 'artifacts',
        id: decodeURIComponent(hash.replace(/^\/artifacts\//, '')),
        legacy: false,
        cat: cat,
      };
    }
    if (hash === '/artifacts') return { view: 'artifacts', id: null, legacy: false, cat: cat };
    var focused = /^\/graph\/focus\/(.+)$/.exec(hash);
    if (focused) {
      return {
        view: 'artifacts',
        id: decodeURIComponent(focused[1]),
        legacy: false,
        cat: cat,
        stale: true,
      };
    }
    /* Routes earlier snapshots produced for the standalone projections resolve in place: the
       Focused Topology now lives beside the Reader on the artifacts view. */
    if (hash === '/graph' || hash === '/graph/layers' || hash === '/graph/focus') {
      return { view: 'artifacts', id: null, legacy: false, cat: cat, stale: true };
    }
    /* Legacy fragment produced by earlier snapshots: a bare artifact identifier. Permanent. */
    if (/^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/.test(hash)) {
      return { view: 'artifacts', id: hash, legacy: true };
    }
    return { view: 'artifacts', id: null, legacy: false, bad: hash };
  };

  var hashFor = function (next) {
    if (next.view === 'artifacts') {
      return (next.id ? '#/artifacts/' + next.id : '#/artifacts') + catQuery(next.cat);
    }
    return '#/';
  };

  var suppress = false;

  /** The single owner of state transitions. Every surface calls this; none mutates state. */
  var go = function (next, mode) {
    var target = hashFor(next);
    if (mode === 'replace') {
      var replaced = false;
      try {
        history.replaceState(null, '', target);
        replaced = true;
      } catch (err) {
        /* Some browsers refuse history manipulation on file:// URLs. */
      }
      if (!replaced) {
        suppress = true;
        location.hash = target;
      }
      state = { view: next.view, id: next.id, graphMode: next.graphMode || null, cat: next.cat || emptyCat(), unknown: next.unknown || null };
      render();
      return;
    }
    if (location.hash === target) {
      state = { view: next.view, id: next.id, graphMode: next.graphMode || null, cat: next.cat || emptyCat(), unknown: next.unknown || null };
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
    if (parsed.legacy && !unknown) {
      /* Resolve, then normalize in place so no redundant history entry is created. */
      go({ view: 'artifacts', id: parsed.id }, 'replace');
      return;
    }
    if (parsed.stale && !unknown) {
      go({ view: parsed.view, id: parsed.id, cat: parsed.cat }, 'replace');
      return;
    }
    state = {
      view: parsed.view,
      id: unknown ? null : parsed.id,
      graphMode: parsed.graphMode || null,
      cat: parsed.cat || emptyCat(),
      unknown: unknown,
    };
    applyCatalogState();
    render();
  };

  /* ------------------------------------------------------------ master list */

  var filterKind = null;
  var filterStatus = null;
  var filterContext = null;
  var filterText = null;
  var searchSync = null;

  /** Reflect the address's catalog state into the filter variables and their controls. */
  var applyCatalogState = function () {
    filterKind = state.cat.k || null;
    filterStatus = state.cat.s || null;
    filterContext = state.cat.c || null;
    filterText = state.cat.f || null;
    var controls = [
      ['f-kind', filterKind],
      ['f-status', filterStatus],
      ['f-context', filterContext],
      ['f-text', filterText],
      ['q-body', state.cat.q],
    ];
    for (var i = 0; i < controls.length; i += 1) {
      var node = doc.getElementById(controls[i][0]);
      if (node && node.value !== (controls[i][1] || '')) node.value = controls[i][1] || '';
    }
    if (listBuilt) renderList();
    if (searchSync) searchSync();
  };

  /** Every filter or query change re-addresses the catalog in place: shareable, never history. */
  var catalogChanged = function () {
    state.cat = {
      k: filterKind,
      s: filterStatus,
      c: filterContext,
      f: filterText,
      q: state.cat.q,
      x: state.cat.x,
    };
    go({ view: state.view, id: state.id, graphMode: state.graphMode, cat: state.cat }, 'replace');
  };

  var matchesFilters = function (a) {
    if (filterKind && a.kind !== filterKind) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterContext && a.context !== filterContext) return false;
    if (filterText) {
      var needle = filterText.toLowerCase();
      if (a.id.toLowerCase().indexOf(needle) < 0 && (a.title || '').toLowerCase().indexOf(needle) < 0) {
        return false;
      }
    }
    return true;
  };

  var listBuilt = false;

  var markCurrent = function () {
    var links = doc.querySelectorAll('#artifact-list a[href^="#/artifacts/"]');
    var wanted = state.id ? '#/artifacts/' + state.id : null;
    for (var i = 0; i < links.length; i += 1) {
      var href = links[i].getAttribute('href') || '';
      var path = href.indexOf('?') >= 0 ? href.slice(0, href.indexOf('?')) : href;
      if (wanted && path === wanted) {
        links[i].setAttribute('aria-current', 'true');
      } else {
        links[i].removeAttribute('aria-current');
      }
    }
  };

  var renderList = function () {
    var wrap = doc.getElementById('artifact-list');
    var counts = doc.getElementById('list-counts');
    if (!wrap) return;
    clear(wrap);
    var shown = 0;
    for (var k = 0; k < ORDER.length; k += 1) {
      var kind = ORDER[k];
      var members = [];
      for (var i = 0; i < ARTIFACTS.length; i += 1) {
        if (ARTIFACTS[i].kind === kind && matchesFilters(ARTIFACTS[i])) members.push(ARTIFACTS[i]);
      }
      if (members.length === 0) continue;
      var heading = el('h4', null, LABELS[kind] || kind);
      wrap.appendChild(heading);
      var list = el('ul');
      for (var m = 0; m < members.length; m += 1) {
        var a = members[m];
        var li = el('li');
        var link = doc.createElement('a');
        link.href = '#/artifacts/' + a.id + catQuery(state.cat);
        link.appendChild(tokenFor(a.kind));
        link.appendChild(el('span', 'name', a.title || a.id));
        link.appendChild(el('span', 'aid', a.id));
        if (a.id === state.id) link.setAttribute('aria-current', 'true');
        li.appendChild(link);
        list.appendChild(li);
        shown += 1;
      }
      wrap.appendChild(list);
    }
    if (shown === 0) {
      wrap.appendChild(el('p', 'empty', 'No artifact matches these filters.'));
    }
    listBuilt = true;
    if (counts) {
      counts.textContent =
        shown === ARTIFACTS.length
          ? shown + ' artifact' + (shown === 1 ? '' : 's')
          : shown + ' of ' + ARTIFACTS.length + ' artifacts shown';
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
   * deterministic.
   */
  var groupEdges = function (edges, direction) {
    var groups = [];
    var index = {};
    for (var i = 0; i < edges.length; i += 1) {
      var other = byId[otherEnd(edges[i], direction)];
      var otherKind = other ? other.kind : 'unknown';
      var key = edges[i].kind + '\u0000' + otherKind;
      if (!index[key]) {
        index[key] = { relKind: edges[i].kind, kind: otherKind, edges: [] };
        groups.push(index[key]);
      }
      index[key].edges.push(edges[i]);
    }
    return groups;
  };

  var relationshipEntry = function (edge, direction) {
    var otherId = otherEnd(edge, direction);
    var other = byId[otherId];
    var li = el('li');
    li.appendChild(el('span', 'dir', direction === 'out' ? '→' : '←'));
    if (other) li.appendChild(tokenFor(other.kind));
    var link = doc.createElement('a');
    link.href = '#/artifacts/' + otherId + catQuery(state.cat);
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

  var groupLabel = function (group, direction) {
    return (
      (direction === 'out' ? '→ ' : '← ') +
      group.relKind +
      ' · ' +
      (LABELS[group.kind] || group.kind)
    );
  };

  var relationshipList = function (host, heading, edges, direction) {
    host.appendChild(el('h5', null, heading));
    if (!edges || edges.length === 0) {
      host.appendChild(el('p', 'none', 'None.'));
      return;
    }
    var groups = groupEdges(edges, direction);
    /* A lone small group needs no disclosure, but its label still has to state the relationship
       type: the type is required on every entry, and the label is where it is carried. A lone
       *large* group still collapses — whether a group overwhelms the view depends on its size, not
       on how many other groups sit beside it, and one type accounting for every relationship is the
       most common shape a high-degree artifact takes. */
    if (groups.length === 1 && groups[0].edges.length <= COLLAPSE_ABOVE) {
      var only = el('p', 'glabel solo');
      only.appendChild(el('span', null, groupLabel(groups[0], direction)));
      only.appendChild(el('span', 'gcount', groups[0].edges.length));
      host.appendChild(only);
      host.appendChild(memberList(groups[0].edges, direction));
      return;
    }
    for (var g = 0; g < groups.length; g += 1) {
      var group = groups[g];
      var count = group.edges.length;
      var details = doc.createElement('details');
      details.className = 'relgroup';
      var summary = doc.createElement('summary');
      summary.appendChild(el('span', 'glabel', groupLabel(group, direction)));
      summary.appendChild(el('span', 'gcount', count));
      details.appendChild(summary);
      if (count > COLLAPSE_ABOVE) {
        /* Collapsed groups render no members until first opened: a high-degree artifact must not
           pay to build what it immediately hides. */
        details.addEventListener(
          'toggle',
          (function (node, groupEdgesList, dir) {
            return function () {
              if (node.open && !node.querySelector('ul.members')) {
                node.appendChild(memberList(groupEdgesList, dir));
              }
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
        doc.createTextNode(
          '. The model may have changed since the link was shared, or the identifier may be mistyped.'
        )
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
      return;
    }
    var a = byId[state.id];
    if (!a) return;

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
      for (var i = 0; i < a.meta.length; i += 1) {
        dl.appendChild(el('dt', null, a.meta[i][0]));
        dl.appendChild(el('dd', null, a.meta[i][1]));
      }
      header.appendChild(dl);
    }
    host.appendChild(header);

    var body = el('div', 'body');
    /* a.body is Markdown already rendered and escaped at generation time. */
    body.innerHTML = a.body;
    host.appendChild(body);

    var rels = el('div', 'rels');
    rels.appendChild(el('h4', 'relhead', 'Relationships'));
    relationshipList(rels, 'Declares (references)', outgoing[a.id], 'out');
    relationshipList(rels, 'Referenced by (derived)', incoming[a.id], 'in');
    host.appendChild(rels);
  };

  /* ------------------------------------------------------- graph projections */

  var NS = 'http://www.w3.org/2000/svg';
  var svgEl = function (tag, attrs) {
    var node = doc.createElementNS(NS, tag);
    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, String(attrs[key]));
    }
    return node;
  };
  var svgText = function (x, y, text, cls, anchor) {
    var node = svgEl('text', { x: x, y: y, class: cls || '', 'text-anchor': anchor || 'middle' });
    node.textContent = text;
    return node;
  };
  /** Identity on hover and, because <title> is not enough on its own, on focus too. */
  var describe = function (node, label) {
    node.appendChild((function () {
      var t = doc.createElementNS(NS, 'title');
      t.textContent = label;
      return t;
    })());
    node.setAttribute('aria-label', label);
    return node;
  };

  var FOCUS_PREOPEN = 4;
  /* A neighbourhood this small is more legible fully open than counted: below this many total
     relationships every group starts open. Presentation constant, not a product rule. */
  var FOCUS_OPEN_ALL_BELOW = 12;
  /* Past this size an opened group falls back to a structured list below the drawing: a fan of
     dozens of labelled nodes stops being legible before it stops being possible. Presentation
     constant, not a product rule. */
  var FOCUS_LIST_ABOVE = 24;

  /**
   * Which groups are open is explicit reader state, carried in the address (?x=0.2). x absent
   * means the defaults (small groups open); 'x=-' means everything closed; otherwise x lists the
   * open group indices in the projection's deterministic group order. Addressable, shareable,
   * never persisted anywhere else.
   */
  var focusOpenSet = function (groups) {
    var open = {};
    if (state.cat.x === null || state.cat.x === undefined) {
      var total = 0;
      for (var t = 0; t < groups.length; t += 1) total += groups[t].edges.length;
      for (var i = 0; i < groups.length; i += 1) {
        open[i] = total <= FOCUS_OPEN_ALL_BELOW || groups[i].edges.length <= FOCUS_PREOPEN;
      }
      return open;
    }
    if (state.cat.x === '-') return open;
    var parts = String(state.cat.x).split('.');
    for (var j = 0; j < parts.length; j += 1) {
      var index = parseInt(parts[j], 10);
      if (!isNaN(index)) open[index] = true;
    }
    return open;
  };
  var focusXFor = function (groups) {
    var indices = [];
    for (var i = 0; i < groups.length; i += 1) {
      if (groups[i].open) indices.push(i);
    }
    return indices.length === 0 ? '-' : indices.join('.');
  };

  /**
   * The focused neighbourhood: the selected artifact anchors the centre and its relationship groups
   * orbit it — outgoing above the axis, incoming below, so direction is positional.
   *
   * Each group owns an angular sector sized to what it currently needs, so expanding one re-allocates
   * the whole hemisphere rather than letting its members collide with its neighbours or run off the
   * canvas. Members fan inside their own sector, wrapping onto further rings when one ring cannot hold
   * their labels. Placement is a pure function of the model and of which groups are open: no physics,
   * nothing seeded, nothing settles.
   */
  var buildFocus = function (host, anchorId) {
    clear(host);
    var anchor = byId[anchorId];
    if (!anchor) {
      host.appendChild(
        el('p', 'note', 'The neighbourhood of the selected artifact is drawn here. Nothing is selected yet.')
      );
      return;
    }
    var out = groupEdges(outgoing[anchorId] || [], 'out');
    var inc = groupEdges(incoming[anchorId] || [], 'in');
    var total = (outgoing[anchorId] || []).length + (incoming[anchorId] || []).length;

    var CX = 500;
    var CY = 500;
    var R = 210;
    var RING = 150;
    var LABEL_ARC = 150;
    var GUARD = 0.12;

    var bounds = { minX: CX - 40, maxX: CX + 40, minY: CY - 40, maxY: CY + 40 };
    var extend = function (x, y, halfW, halfH) {
      bounds.minX = Math.min(bounds.minX, x - halfW);
      bounds.maxX = Math.max(bounds.maxX, x + halfW);
      bounds.minY = Math.min(bounds.minY, y - halfH);
      bounds.maxY = Math.max(bounds.maxY, y + halfH);
    };

    var svg = svgEl('svg', {
      role: 'img',
      class: 'focus',
      'aria-label':
        'Neighbourhood of ' + anchorId + ': ' + total + ' relationships in ' +
        (out.length + inc.length) + ' groups',
    });
    var defs = svgEl('defs', {});
    var mk = function (id, cls) {
      var marker = svgEl('marker', {
        id: id,
        viewBox: '0 0 10 10',
        refX: '9',
        refY: '5',
        markerWidth: '5',
        markerHeight: '5',
        orient: 'auto-start-reverse',
      });
      marker.appendChild(svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: cls }));
      return marker;
    };
    defs.appendChild(mk('spoke-arrow', 'arrowhead'));
    svg.appendChild(defs);
    var edgeLayer = svgEl('g', { class: 'edges' });
    var nodeLayer = svgEl('g', { class: 'nodes' });
    svg.appendChild(edgeLayer);
    svg.appendChild(nodeLayer);

    /* Roughly how wide a label runs, so sectors can be sized to what a group has to draw. */
    var runWidth = function (text, perChar) {
      return text.length * perChar + 14;
    };

    /* How much angular room each group wants: one unit closed, more when open. */
    var weigh = function (group) {
      if (!group.open || group.listed) return 1;
      return Math.max(1, Math.min(6, group.edges.length / 2));
    };

    /**
     * Each group is given at least the angle its own label needs, and the slack is shared out by
     * weight. If the minimums cannot fit the hemisphere, the ring grows until they do — sizing sectors
     * by member count alone left adjacent small groups with 12° each, which is 44 px at this radius and
     * nowhere near enough for "Quality Requirements".
     */
    var allocate = function (groups, direction) {
      if (groups.length === 0) return;
      var lo = direction === 'out' ? Math.PI + GUARD : GUARD;
      var span = Math.PI - 2 * GUARD;
      for (var i = 0; i < groups.length; i += 1) groups[i].direction = direction;

      var labelOfGroup = function (group) {
        return runWidth(LABELS[group.kind] || group.kind, 6.6);
      };
      var totalWeight = 0;
      for (var w = 0; w < groups.length; w += 1) totalWeight += weigh(groups[w]);

      var radius = R;
      for (var attempt = 0; attempt < 12; attempt += 1) {
        var need = 0;
        for (var n = 0; n < groups.length; n += 1) need += labelOfGroup(groups[n]) / radius;
        if (need <= span * 0.85) break;
        radius *= 1.18;
      }
      groups.radius = radius;

      var minTotal = 0;
      for (var m = 0; m < groups.length; m += 1) minTotal += labelOfGroup(groups[m]) / radius;
      var slack = Math.max(0, span - minTotal);

      var cursor = lo;
      for (var j = 0; j < groups.length; j += 1) {
        var slice =
          labelOfGroup(groups[j]) / radius + (weigh(groups[j]) / totalWeight) * slack;
        groups[j].sector = slice;
        groups[j].angle = cursor + slice / 2;
        groups[j].radius = radius;
        groups[j].x = CX + radius * Math.cos(groups[j].angle);
        groups[j].y = CY + radius * Math.sin(groups[j].angle);
        cursor += slice;
      }
    };
    var all = out.concat(inc);
    var openNow = focusOpenSet(all);
    for (var gi = 0; gi < all.length; gi += 1) {
      all[gi].open = Boolean(openNow[gi]);
      all[gi].listed = all[gi].open && all[gi].edges.length > FOCUS_LIST_ABOVE;
    }
    allocate(out, 'out');
    allocate(inc, 'in');

    var listedPanels = [];
    var openMembers = function (group) {
      if (group.listed) {
        listedPanels.push(group);
        return;
      }
      var m = group.edges.length;
      /* Members fan inside the group's own sector, wrapping to a further ring when the arc at this
         radius cannot hold their labels. Rings grow outward; the viewBox grows with them. */
      var placed = 0;
      var ring = 0;
      while (placed < m) {
        var radius = group.radius + RING * (ring + 1);
        var perRing = Math.max(1, Math.floor((group.sector * radius) / LABEL_ARC));
        var take = Math.min(perRing, m - placed);
        for (var k = 0; k < take; k += 1) {
          var t = take === 1 ? 0.5 : k / (take - 1);
          var a = group.angle + (t - 0.5) * group.sector * (take === 1 ? 0 : 1);
          var mx = CX + radius * Math.cos(a);
          var my = CY + radius * Math.sin(a);
          var edge = group.edges[placed + k];
          var otherId = group.direction === 'out' ? edge.to : edge.from;
          var other = byId[otherId];
          edgeLayer.appendChild(
            svgEl('line', {
              x1: group.x,
              y1: group.y,
              x2: mx,
              y2: my,
              class: 'member',
            }),
          );
          var dot = svgEl('circle', {
            cx: mx,
            cy: my,
            r: 7,
            class: 'member',
            'data-member': otherId,
            tabindex: '0',
            role: 'link',
            fill: COLORS[other ? other.kind : ''] || '#4f5560',
          });
          describe(dot, (other && other.title ? other.title + ' — ' : '') + otherId);
          nodeLayer.appendChild(dot);
          var below = group.direction === 'in';
          nodeLayer.appendChild(svgText(mx, my + (below ? 20 : -14), otherId, 'mlabel'));
          extend(mx, my + (below ? 20 : -14), 3 * otherId.length + 4, 10);
          extend(mx, my, 9, 9);
        }
        placed += take;
        ring += 1;
      }
    };

    for (var g = 0; g < all.length; g += 1) {
      var group = all[g];
      var count = group.edges.length;
      /* The relationship type annotates the spoke; the satellite carries the kind and the count. */
      /* Sit the type label out near the satellite, where the sectors have separated. */
      var mid = 0.5;
      var lx = CX + group.radius * mid * Math.cos(group.angle);
      var ly = CY + group.radius * mid * Math.sin(group.angle);
      /* Rotate the label along its spoke so it reads as the edge's own annotation, kept upright. */
      var deg = (group.angle * 180) / Math.PI;
      if (deg > 90) deg -= 180;
      if (deg < -90) deg += 180;
      var spoke = svgEl('line', {
        x1: group.direction === 'out' ? CX : group.x,
        y1: group.direction === 'out' ? CY : group.y,
        x2: group.direction === 'out' ? group.x : CX,
        y2: group.direction === 'out' ? group.y : CY,
        class: 'spoke',
        'marker-end': 'url(#spoke-arrow)',
      });
      edgeLayer.appendChild(spoke);
      var edgeLabel = svgText(lx, ly - 5, group.relKind, 'edgelabel');
      edgeLabel.setAttribute('transform', 'rotate(' + deg.toFixed(2) + ' ' + lx + ' ' + ly + ')');
      nodeLayer.appendChild(edgeLabel);
      extend(lx, ly - 4, 3.6 * group.relKind.length, 10);

      var sat = svgEl('circle', {
        cx: group.x,
        cy: group.y,
        r: 20,
        class: 'satellite',
        'data-group': String(g),
        tabindex: '0',
        role: 'button',
        'aria-expanded': String(group.open),
        fill: COLORS[group.kind] || '#4f5560',
      });
      describe(
        sat,
        (group.direction === 'out' ? 'outgoing ' : 'incoming ') +
          group.relKind + ' · ' + (LABELS[group.kind] || group.kind) + ' · ' + count +
          (group.listed ? ' — too many to draw legibly; shown as a list below the drawing' : ''),
      );
      nodeLayer.appendChild(sat);
      nodeLayer.appendChild(svgText(group.x, group.y + 5, String(count), 'satcount'));
      var above = group.direction === 'out';
      nodeLayer.appendChild(
        svgText(group.x, group.y + (above ? -28 : 40), LABELS[group.kind] || group.kind, 'satkind'),
      );
      extend(group.x, group.y, 24, 24);
      extend(
        group.x,
        group.y + (above ? -28 : 40),
        3.6 * (LABELS[group.kind] || group.kind).length,
        14,
      );
      if (group.open) openMembers(group);
    }

    var anchorNode = svgEl('circle', {
      cx: CX,
      cy: CY,
      r: 30,
      class: 'anchor',
      fill: COLORS[anchor.kind] || '#4f5560',
    });
    describe(anchorNode, anchor.title + ' — ' + anchorId);
    nodeLayer.appendChild(anchorNode);
    nodeLayer.appendChild(svgText(CX, CY + 52, anchorId, 'anchorid'));
    nodeLayer.appendChild(
      svgText(CX, CY + 68, total + (total === 1 ? ' relationship' : ' relationships'), 'anchorsub'),
    );
    extend(CX, CY + 68, 3.6 * anchorId.length, 24);

    var PADV = 20;
    var fit = {
      x: bounds.minX - PADV,
      y: bounds.minY - PADV,
      w: bounds.maxX - bounds.minX + 2 * PADV,
      h: bounds.maxY - bounds.minY + 2 * PADV,
    };
    var view = { x: fit.x, y: fit.y, w: fit.w, h: fit.h };
    var applyView = function () {
      svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h);
    };
    applyView();

    /* Pan, zoom and fit, so a dense neighbourhood can be explored rather than only looked at. */
    var zoomBy = function (factor, cx, cy) {
      var nx = cx - (cx - view.x) * factor;
      var ny = cy - (cy - view.y) * factor;
      var nw = view.w * factor;
      var nh = view.h * factor;
      if (nw < fit.w / 8 || nw > fit.w * 4) return;
      view = { x: nx, y: ny, w: nw, h: nh };
      applyView();
    };
    svg.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var rect = svg.getBoundingClientRect();
      var px = view.x + ((ev.clientX - rect.left) / rect.width) * view.w;
      var py = view.y + ((ev.clientY - rect.top) / rect.height) * view.h;
      zoomBy(ev.deltaY > 0 ? 1.15 : 1 / 1.15, px, py);
    });
    var dragging = null;
    svg.addEventListener('pointerdown', function (ev) {
      if (ev.target instanceof Element && ev.target.closest('[data-group],[data-member]')) return;
      dragging = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y };
      svg.setAttribute('data-panning', 'true');
    });
    svg.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      var rect = svg.getBoundingClientRect();
      view.x = dragging.vx - ((ev.clientX - dragging.x) / rect.width) * view.w;
      view.y = dragging.vy - ((ev.clientY - dragging.y) / rect.height) * view.h;
      applyView();
    });
    var endDrag = function () {
      dragging = null;
      svg.removeAttribute('data-panning');
    };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointerleave', endDrag);

    var toggle = function (index) {
      all[index].open = !all[index].open;
      var cat = {};
      for (var key in state.cat) {
        if (Object.prototype.hasOwnProperty.call(state.cat, key)) cat[key] = state.cat[key];
      }
      cat.x = focusXFor(all);
      /* Disclosure is not navigation: the address changes, the history entry does not. */
      go({ view: state.view, id: anchorId, cat: cat }, 'replace');
    };
    var activate = function (target) {
      if (!target) return;
      var member = target.getAttribute('data-member');
      if (member) {
        /* Refocusing produces a newly focused projection: the disclosure does not accumulate. */
        var cat = {};
        for (var key in state.cat) {
          if (Object.prototype.hasOwnProperty.call(state.cat, key)) cat[key] = state.cat[key];
        }
        cat.x = null;
        go({ view: state.view, id: member, cat: cat });
        return;
      }
      var index = target.getAttribute('data-group');
      if (index !== null) toggle(Number(index));
    };
    svg.addEventListener('click', function (ev) {
      activate(ev.target instanceof Element ? ev.target.closest('[data-group],[data-member]') : null);
    });
    svg.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        activate(
          ev.target instanceof Element ? ev.target.closest('[data-group],[data-member]') : null,
        );
        ev.preventDefault();
        return;
      }
      var step = view.w / 12;
      if (ev.key === '+' || ev.key === '=') zoomBy(1 / 1.2, view.x + view.w / 2, view.y + view.h / 2);
      else if (ev.key === '-') zoomBy(1.2, view.x + view.w / 2, view.y + view.h / 2);
      else if (ev.key === '0') {
        view = { x: fit.x, y: fit.y, w: fit.w, h: fit.h };
        applyView();
      } else if (ev.key === 'ArrowLeft') view.x -= step;
      else if (ev.key === 'ArrowRight') view.x += step;
      else if (ev.key === 'ArrowUp') view.y -= step;
      else if (ev.key === 'ArrowDown') view.y += step;
      else return;
      applyView();
      ev.preventDefault();
    });

    var controls = el('div', 'gcontrols');
    var button = function (label, onClick) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', onClick);
      controls.appendChild(b);
    };
    button('Zoom in', function () {
      zoomBy(1 / 1.2, view.x + view.w / 2, view.y + view.h / 2);
    });
    button('Zoom out', function () {
      zoomBy(1.2, view.x + view.w / 2, view.y + view.h / 2);
    });
    button('Fit', function () {
      view = { x: fit.x, y: fit.y, w: fit.w, h: fit.h };
      applyView();
    }, 'key 0 · drag pans · scroll zooms · arrows pan');
    host.appendChild(controls);
    host.appendChild(svg);
    /* Dense sets fall back to a legible structure: every entry stays selectable, nothing is
       drawn that cannot be read. */
    for (var lp = 0; lp < listedPanels.length; lp += 1) {
      var listedGroup = listedPanels[lp];
      var panel = el('div', 'denselist');
      var head = el('p', 'glabel solo');
      head.appendChild(el('span', null, groupLabel(listedGroup, listedGroup.direction)));
      head.appendChild(el('span', 'gcount', listedGroup.edges.length));
      head.appendChild(el('span', 'note', ' too many to draw legibly — listed instead'));
      panel.appendChild(head);
      panel.appendChild(memberList(listedGroup.edges, listedGroup.direction));
      host.appendChild(panel);
    }
    if (total === 0) {
      host.appendChild(
        el('p', 'note', 'This artifact declares no relationships and is referenced by none.'),
      );
    }
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
   * every body through the DOM — which cost 849 ms on the first keystroke at 730 artifacts, since it
   * is a full HTML parse of the entire model before a single result can be shown.
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
    for (var i = 0; i < ARTIFACTS.length; i += 1) {
      plainText[ARTIFACTS[i].id] = stripTags(ARTIFACTS[i].body);
    }
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
   * Score every artifact, then sort, then cap. Capping during the scan is what made the previous
   * implementation unable to rank: it could not know whether a better match lay further down.
   */
  var searchAll = function (needle) {
    var text = searchIndex();
    var hits = [];
    for (var i = 0; i < ARTIFACTS.length; i += 1) {
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

  var wireSearch = function () {
    var input = doc.getElementById('q-body');
    var results = doc.getElementById('q-body-results');
    var status = doc.getElementById('q-body-status');
    if (!input || !results) return;

    var active = -1;
    var shown = [];

    var markActive = function () {
      var items = results.querySelectorAll('li[data-id]');
      for (var i = 0; i < items.length; i += 1) {
        if (i === active) {
          items[i].setAttribute('data-active', 'true');
          input.setAttribute('aria-activedescendant', items[i].id);
        } else {
          items[i].removeAttribute('data-active');
        }
      }
      if (active < 0) input.removeAttribute('aria-activedescendant');
    };

    var render = function () {
      var q = input.value.trim();
      clear(results);
      active = -1;
      shown = [];
      input.removeAttribute('aria-activedescendant');
      if (!q) {
        if (status) status.textContent = '';
        return;
      }
      var hits = searchAll(q.toLowerCase());
      if (hits.length === 0) {
        if (status) status.textContent = 'Nothing matches “' + q + '”.';
        results.appendChild(el('li', 'empty', 'Nothing matches “' + q + '”.'));
        return;
      }
      shown = hits.slice(0, RESULT_LIMIT);
      if (status) {
        /* Truncation is never silent: a reader who sees 25 of 73 must be told there are 73. */
        status.textContent =
          hits.length > shown.length
            ? hits.length + ' matches · showing the top ' + shown.length
            : hits.length + (hits.length === 1 ? ' match' : ' matches');
      }
      for (var h = 0; h < shown.length; h += 1) {
        var hit = shown[h];
        var li = el('li');
        li.id = 'q-hit-' + h;
        li.setAttribute('data-id', hit.artifact.id);
        var head = el('span', 'hithead');
        head.appendChild(tokenFor(hit.artifact.kind));
        var link = doc.createElement('a');
        link.href = '#/artifacts/' + hit.artifact.id + catQuery(state.cat);
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

    input.addEventListener('input', function () {
      render();
      var q = input.value.trim() || null;
      if (q !== state.cat.q && state.view === 'artifacts') {
        state.cat.q = q;
        go({ view: state.view, id: state.id, graphMode: state.graphMode, cat: state.cat }, 'replace');
      }
    });
    searchSync = render;
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        input.value = '';
        render();
        return;
      }
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
        go({ view: 'artifacts', id: shown[active].artifact.id, cat: state.cat });
        ev.preventDefault();
      }
    });
  };

  /* ------------------------------------------------------------------ render */

  var lastView = null;
  var lastId = null;

  var render = function () {
    for (var v = 0; v < views.length; v += 1) {
      var section = doc.getElementById('view-' + views[v]);
      if (section) section.hidden = views[v] !== state.view;
    }
    var links = doc.querySelectorAll('nav.views a[data-view]');
    for (var l = 0; l < links.length; l += 1) {
      if (links[l].getAttribute('data-view') === state.view) {
        links[l].setAttribute('aria-current', 'page');
      } else {
        links[l].removeAttribute('aria-current');
      }
    }
    doc.body.setAttribute('data-pane', state.view === 'artifacts' && (state.id || state.unknown) ? 'detail' : 'master');



    if (state.view === 'artifacts') {
      /* Selecting an artifact must not cost a full list rebuild: the list is independent of the
         selection, so only the current marker moves. */
      if (listBuilt) markCurrent();
      else renderList();
      renderDetail();
      /* The Focused Topology sits beside the Reader and follows the same selection: the third
         region of one instrument, never a separate place. */
      buildFocus(doc.getElementById('graph-host'), state.id);
      /* Returning to the list resumes the discovery in progress: the way back carries the state
         and names it, so the reader can see how they arrived without relying on browser chrome. */
      var back = doc.querySelector('.backlink a');
      if (back) {
        back.setAttribute('href', '#/artifacts' + catQuery(state.cat));
        var crumbs = [];
        if (state.cat.k) crumbs.push(LABELS[state.cat.k] || state.cat.k);
        if (state.cat.s) crumbs.push(state.cat.s);
        if (state.cat.c) crumbs.push(state.cat.c);
        if (state.cat.f) crumbs.push('filter \u201C' + state.cat.f + '\u201D');
        if (state.cat.q) crumbs.push('search \u201C' + state.cat.q + '\u201D');
        back.textContent = crumbs.length > 0
          ? '\u2190 Results \u00B7 ' + crumbs.join(' \u00B7 ')
          : '\u2190 All artifacts';
      }
    }

    /* Focus lands somewhere meaningful after a view or selection change, never lost. */
    var changedView = state.view !== lastView;
    var changedId = state.id !== lastId;
    if (changedView || changedId) {
      var focusTarget = null;
      if (state.view === 'artifacts' && (state.id || state.unknown)) {
        focusTarget = doc.querySelector('#detail h3.artifact');
      } else {
        var section = doc.getElementById('view-' + state.view);
        focusTarget = section ? section.querySelector('h2') : null;
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

  var filters = {
    kind: doc.getElementById('f-kind'),
    status: doc.getElementById('f-status'),
    context: doc.getElementById('f-context'),
    text: doc.getElementById('f-text'),
  };
  if (filters.kind) {
    filters.kind.addEventListener('change', function () {
      filterKind = filters.kind.value || null;
      renderList();
      markCurrent();
      catalogChanged();
    });
  }
  if (filters.status) {
    filters.status.addEventListener('change', function () {
      filterStatus = filters.status.value || null;
      renderList();
      markCurrent();
      catalogChanged();
    });
  }
  if (filters.context) {
    filters.context.addEventListener('change', function () {
      filterContext = filters.context.value || null;
      renderList();
      markCurrent();
      catalogChanged();
    });
  }
  if (filters.text) {
    filters.text.addEventListener('input', function () {
      filterText = filters.text.value.trim() || null;
      renderList();
      markCurrent();
      catalogChanged();
    });
  }
  var overviewSearch = doc.getElementById('ov-q');
  if (overviewSearch) {
    /* Global search from the first screen: submitting lands in the Catalog with the query live. */
    overviewSearch.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      var q = overviewSearch.value.trim() || null;
      var cat = emptyCat();
      cat.q = q;
      go({ view: 'artifacts', id: null, cat: cat });
    });
  }
  wireSearch();
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
  const color = kindColors[kind] ?? '#4f5560';
  return `<span class="token" style="color:${color}">${escapeHtml(kindTokens[kind] ?? '?')}</span>`;
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
    kindColors: Object.fromEntries([...groups.keys()].map((k) => [k, kindColors[k] ?? '#5f6673'])),
    kindTokens: Object.fromEntries([...groups.keys()].map((k) => [k, kindTokens[k] ?? '?'])),
    statusColors,
    artifacts,
    edges: graph.edges.map((edge) => ({ from: edge.from, to: edge.to, kind: edge.kind })),
  };
  return JSON.stringify(payload).replaceAll('<', '\\u003c');
}

/** Aggregate the relationships by source kind, relationship type and target kind, with counts. */
function kindAggregateRows(graph: ProductGraph): string[] {
  const kindOf = new Map(graph.nodes.map((n) => [n.id, n.type]));
  // Keyed by the triple itself rather than a delimited string: no separator to choose, nothing to
  // parse back, and the source stays plain text.
  const counts = new Map<string, { from: string; relKind: string; to: string; count: number }>();
  for (const edge of graph.edges) {
    const from = kindOf.get(edge.from);
    const to = kindOf.get(edge.to);
    if (!from || !to) continue;
    const key = [from, edge.kind, to].join('\u0000');
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { from, relKind: edge.kind, to, count: 1 });
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, { from, relKind, to, count }]) => {
      return [
        '<tr>',
        `<td>${token(from)} ${escapeHtml(kindLabels[from] ?? from)}</td>`,
        `<td class="rel">${escapeHtml(relKind)}</td>`,
        `<td>${token(to)} ${escapeHtml(kindLabels[to] ?? to)}</td>`,
        `<td class="n">${count}</td>`,
        '</tr>',
      ].join('');
    });
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

  const degree = new Map<string, number>(graph.nodes.map((n) => [n.id, 0]));
  for (const edge of graph.edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  const unconnected = graph.nodes
    .filter((n) => (degree.get(n.id) ?? 0) === 0)
    .map((n) => n.id)
    .sort((a, b) => a.localeCompare(b));

  const kindRows: string[] = [];
  for (const [kind, members] of groups) {
    kindRows.push(
      `<li>${token(kind)} <a href="#/artifacts?k=${encodeURIComponent(kind)}">${escapeHtml(kindLabels[kind] ?? kind)}</a><span class="count">${members.length}</span></li>`,
    );
  }

  const aggregateRows = kindAggregateRows(graph);
  const kindOptions = [...groups.keys()]
    .map((k) => `<option value="${escapeHtml(k)}">${escapeHtml(kindLabels[k] ?? k)}</option>`)
    .join('');
  const statuses = [...new Set(artifacts.map((a) => a.status ?? 'unknown'))].sort();
  const statusOptions = statuses
    .map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
    .join('');
  const contexts = [
    ...new Set(
      artifacts
        .map((a) => a.frontmatter['bounded-context'])
        .filter((c): c is string => typeof c === 'string'),
    ),
  ].sort();
  const contextFilter =
    contexts.length > 0
      ? `<label for="f-context">Bounded context<select id="f-context"><option value="">Any context</option>${contexts
          .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
          .join('')}</select></label>`
      : '';

  const lines = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Product Snapshot</title>',
    `<style>\n${style}\n</style>`,
    '</head>',
    '<body data-pane="master">',
    '<a class="skip" href="#main">Skip to content</a>',
    '<header class="site">',
    '<div class="title">',
    '<h1>Product Snapshot</h1>',
    '<div class="facts">',
    `<span>${graph.nodes.length} artifact${graph.nodes.length === 1 ? '' : 's'}</span>`,
    `<span>${graph.edges.length} relationship${graph.edges.length === 1 ? '' : 's'}</span>`,
    `<span>${revisionText}</span>`,
    '</div>',
    '</div>',
    '<nav class="views" aria-label="Snapshot views">',
    '<a href="#/" data-view="overview" aria-current="page">Overview</a>',
    '<a href="#/artifacts" data-view="artifacts">Artifacts</a>',
    '</nav>',
    '</header>',
    '<main id="main">',

    // ---- Overview: the opening view. No artifact body, no artifact-level graph.
    '<section id="view-overview" aria-labelledby="h-overview">',
    '<h2 class="view" id="h-overview">Overview</h2>',
    '<p class="lead">This page is a generated, read-only projection of a product model at the',
    'revision stamped above. It is regenerated from the authored files at any time and is never',
    'authoritative. Nothing here can be edited, and nothing you do is stored.</p>',
    '<div class="ovsearch" role="search">',
    '<label for="ov-q">Search the product</label>',
    '<input id="ov-q" type="search" autocomplete="off" placeholder="Identifier, title or phrase — press Enter">',
    '</div>',
    '<dl class="metrics">',
    `<div><dt>Artifacts</dt><dd>${graph.nodes.length}</dd></div>`,
    `<div><dt>Relationships</dt><dd>${graph.edges.length}</dd></div>`,
    `<div><dt>Artifact kinds</dt><dd>${groups.size}</dd></div>`,
    '</dl>',
    '<h3 class="block" id="h-composition">Composition</h3>',
    '<ul class="kinds" aria-labelledby="h-composition">',
    ...kindRows,
    '</ul>',
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
    '</section>',

    // ---- Artifacts: master-detail. Both panes rendered on demand from the embedded data.
    '<section id="view-artifacts" aria-labelledby="h-artifacts" hidden>',
    '<h2 class="view" id="h-artifacts">Artifacts</h2>',
    '<p class="backlink"><a href="#/artifacts">&#8592; All artifacts</a></p>',
    '<div class="md">',
    '<aside class="master" aria-label="Artifact list">',
    '<div class="filters">',
    '<h3 class="findhead" id="h-find">Find an artifact</h3>',
    `<label for="f-kind">Kind<select id="f-kind"><option value="">All kinds</option>${kindOptions}</select></label>`,
    `<label for="f-status">Status<select id="f-status"><option value="">Any status</option>${statusOptions}</select></label>`,
    contextFilter,
    '<label for="f-text">Filter by name or ID<input id="f-text" type="search" autocomplete="off"></label>',
    '<label for="q-body">Search</label>',
    '<input id="q-body" type="search" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="q-body-results" aria-describedby="q-body-status">',
    '<p class="qstatus" id="q-body-status" role="status" aria-live="polite"></p>',
    '<ul class="results" id="q-body-results" role="listbox" aria-label="Search results"></ul>',
    '</div>',
    '<div class="listwrap"><div id="artifact-list"></div></div>',
    '<p class="counts" id="list-counts"></p>',
    '</aside>',
    '<article class="detail" id="detail"></article>',
    '<aside class="topo" aria-label="Focused topology of the selected artifact">',
    '<div id="graph-host"></div>',
    '</aside>',
    '</div>',
    '</section>',

    // ---- Model graph: opened explicitly; built from the embedded data, never at open time.
    '<p id="needs-script" class="note">This page needs JavaScript to render artifact content, which',
    'it holds entirely within this file — no network access is involved.</p>',
    '</main>',
    `<script id="snapshot-data" type="application/json">${snapshotDataJson(graph, groups)}</script>`,
    `<script>\n${script}\n</script>`,
    '</body>',
    '</html>',
  ];
  return `${lines.filter((l) => l !== '').join('\n')}\n`;
}
