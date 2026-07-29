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
main { padding: 1rem; }
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
ul.plain li { padding: 0.18rem 0; border-bottom: 1px solid var(--line); }
ul.idlist { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.3rem 0.5rem; }
ul.idlist a { font-family: var(--mono); font-size: 0.8rem; border: 1px solid var(--line); border-radius: 2px; padding: 0.1rem 0.4rem; }

.md { display: grid; grid-template-columns: minmax(17rem, 22rem) minmax(0, 1fr); gap: 0; border: 1px solid var(--line-strong); }
.master { border-right: 1px solid var(--line-strong); min-width: 0; display: flex; flex-direction: column; max-height: calc(100vh - 9rem); }
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

.detail { min-width: 0; overflow-wrap: anywhere; padding: 0.9rem 1.1rem 2rem; max-width: 60rem; }
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
.rels .dir { font-family: var(--mono); font-size: 0.72rem; color: var(--muted); flex: none; }
.rels .none { color: var(--muted); font-size: 0.85rem; }

#graph-host svg { width: 100%; height: auto; background: var(--panel); border: 1px solid var(--line); }
#graph-host circle { stroke: #ffffff; stroke-width: 1; cursor: pointer; }
#graph-host circle.sel { stroke: var(--ink); stroke-width: 3; }
#graph-host circle.hl { stroke: var(--accent); stroke-width: 2; }
#graph-host circle.dim { opacity: 0.25; }
#graph-host line { stroke: #c9cedb; stroke-width: 0.6; }
#graph-host line.hl { stroke: var(--accent); stroke-width: 1.6; }
#graph-host line.dim { stroke: #eceff3; }
#graph-info { min-height: 1.4rem; font-size: 0.85rem; }

.unknown { border: 1px solid var(--line-strong); border-left: 3px solid var(--muted); padding: 0.7rem 0.9rem; max-width: 60rem; }
.unknown .aid { font-family: var(--mono); }
footer.site { border-top: 1px solid var(--line); padding: 0.8rem 1rem 1.5rem; color: var(--muted); font-size: 0.78rem; }
footer.site p { margin: 0.2rem 0; max-width: 78ch; }

@media (max-width: 62rem) {
  .md { grid-template-columns: minmax(0, 1fr); }
  .master { border-right: none; border-bottom: 1px solid var(--line-strong); max-height: none; }
  body[data-pane='detail'] .master, body[data-pane='master'] .detail { display: none; }
  .backlink { display: block; }
}
.backlink { display: none; margin: 0 0 0.6rem; font-size: 0.85rem; }
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

  var views = ['overview', 'artifacts', 'graph'];
  var state = { view: 'overview', id: null, graphMode: null, unknown: null };

  var parseHash = function (raw) {
    var hash = (raw || '').replace(/^#/, '');
    if (hash === '' || hash === '/') return { view: 'overview', id: null, legacy: false };
    if (/^\/artifacts\/(.+)$/.test(hash)) {
      return { view: 'artifacts', id: decodeURIComponent(hash.replace(/^\/artifacts\//, '')), legacy: false };
    }
    if (hash === '/artifacts') return { view: 'artifacts', id: null, legacy: false };
    if (hash === '/graph') return { view: 'graph', id: null, legacy: false };
    /* Legacy fragment produced by earlier snapshots: a bare artifact identifier. Permanent. */
    if (/^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/.test(hash)) {
      return { view: 'artifacts', id: hash, legacy: true };
    }
    return { view: 'artifacts', id: null, legacy: false, bad: hash };
  };

  var hashFor = function (next) {
    if (next.view === 'artifacts') return next.id ? '#/artifacts/' + next.id : '#/artifacts';
    if (next.view === 'graph') return '#/graph';
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
      state = { view: next.view, id: next.id, graphMode: next.graphMode || null, unknown: next.unknown || null };
      render();
      return;
    }
    if (location.hash === target) {
      state = { view: next.view, id: next.id, graphMode: next.graphMode || null, unknown: next.unknown || null };
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
    state = {
      view: parsed.view,
      id: unknown ? null : parsed.id,
      graphMode: null,
      unknown: unknown,
    };
    render();
  };

  /* ------------------------------------------------------------ master list */

  var filterKind = null;
  var filterStatus = null;
  var filterText = null;

  var matchesFilters = function (a) {
    if (filterKind && a.kind !== filterKind) return false;
    if (filterStatus && a.status !== filterStatus) return false;
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
      if (wanted && links[i].getAttribute('href') === wanted) {
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
        link.href = '#/artifacts/' + a.id;
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

  var relationshipList = function (host, heading, edges, direction) {
    var h = el('h5', null, heading);
    host.appendChild(h);
    if (!edges || edges.length === 0) {
      host.appendChild(el('p', 'none', 'None.'));
      return;
    }
    var list = el('ul');
    for (var i = 0; i < edges.length; i += 1) {
      var edge = edges[i];
      var otherId = direction === 'out' ? edge.to : edge.from;
      var other = byId[otherId];
      var li = el('li');
      li.appendChild(el('span', 'dir', (direction === 'out' ? '→ ' : '← ') + edge.kind));
      if (other) li.appendChild(tokenFor(other.kind));
      var link = doc.createElement('a');
      link.href = '#/artifacts/' + otherId;
      link.textContent = other && other.title ? other.title : otherId;
      li.appendChild(link);
      li.appendChild(el('span', 'aid mono', otherId));
      list.appendChild(li);
    }
    host.appendChild(list);
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

  /* ------------------------------------------------------------ model graph */

  var graphBuilt = false;
  var buildGraph = function () {
    var host = doc.getElementById('graph-host');
    if (!host || graphBuilt) return;
    graphBuilt = true;
    var ordered = [];
    for (var k = 0; k < ORDER.length; k += 1) {
      for (var i = 0; i < ARTIFACTS.length; i += 1) {
        if (ARTIFACTS[i].kind === ORDER[k]) ordered.push(ARTIFACTS[i]);
      }
    }
    var center = 500;
    var radius = 420;
    var pos = {};
    for (var n = 0; n < ordered.length; n += 1) {
      var angle = (n / ordered.length) * 2 * Math.PI - Math.PI / 2;
      pos[ordered[n].id] = {
        x: (center + radius * Math.cos(angle)).toFixed(2),
        y: (center + radius * Math.sin(angle)).toFixed(2),
      };
    }
    var NS = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 1000 1000');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Whole-model graph: ' + ordered.length + ' artifacts, ' + EDGES.length + ' relationships');
    for (var g = 0; g < EDGES.length; g += 1) {
      var from = pos[EDGES[g].from];
      var to = pos[EDGES[g].to];
      if (!from || !to) continue;
      var line = doc.createElementNS(NS, 'line');
      line.setAttribute('data-from', EDGES[g].from);
      line.setAttribute('data-to', EDGES[g].to);
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      svg.appendChild(line);
    }
    for (var c = 0; c < ordered.length; c += 1) {
      var node = ordered[c];
      var p = pos[node.id];
      var circle = doc.createElementNS(NS, 'circle');
      circle.setAttribute('data-id', node.id);
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r', '9');
      circle.setAttribute('fill', COLORS[node.kind] || '#5f6673');
      var title = doc.createElementNS(NS, 'title');
      title.textContent = node.id + (node.title ? ' — ' + node.title : '');
      circle.appendChild(title);
      svg.appendChild(circle);
    }
    host.appendChild(svg);

    svg.addEventListener('click', function (ev) {
      var target = ev.target instanceof Element ? ev.target.closest('circle[data-id]') : null;
      if (!target) return;
      var id = target.getAttribute('data-id');
      var related = {};
      related[id] = true;
      var lines = svg.querySelectorAll('line');
      for (var i = 0; i < lines.length; i += 1) {
        var f = lines[i].getAttribute('data-from');
        var t = lines[i].getAttribute('data-to');
        if (f === id || t === id) {
          lines[i].setAttribute('class', 'hl');
          related[f] = true;
          related[t] = true;
        } else {
          lines[i].setAttribute('class', 'dim');
        }
      }
      var circles = svg.querySelectorAll('circle[data-id]');
      for (var j = 0; j < circles.length; j += 1) {
        var cid = circles[j].getAttribute('data-id');
        circles[j].setAttribute('class', cid === id ? 'sel' : related[cid] ? 'hl' : 'dim');
      }
      var info = doc.getElementById('graph-info');
      if (info) {
        clear(info);
        var a = byId[id];
        var link = doc.createElement('a');
        link.href = '#/artifacts/' + id;
        link.textContent = 'Read ' + id + (a && a.title ? ' — ' + a.title : '');
        info.appendChild(link);
      }
    });
  };

  /* ------------------------------------------------------------------ carried-forward search */

  var searchText = null;
  var searchIndex = function () {
    if (searchText) return searchText;
    searchText = {};
    var probe = doc.createElement('div');
    for (var i = 0; i < ARTIFACTS.length; i += 1) {
      probe.innerHTML = ARTIFACTS[i].body;
      searchText[ARTIFACTS[i].id] = (probe.textContent || '').toLowerCase().replace(/\s+/g, ' ');
    }
    clear(probe);
    return searchText;
  };

  var wireSearch = function () {
    var input = doc.getElementById('q-body');
    var results = doc.getElementById('q-body-results');
    if (!input || !results) return;
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      clear(results);
      if (!q) return;
      var text = searchIndex();
      var hits = [];
      for (var i = 0; i < ARTIFACTS.length && hits.length < 25; i += 1) {
        var a = ARTIFACTS[i];
        if (
          a.id.toLowerCase().indexOf(q) >= 0 ||
          (a.title || '').toLowerCase().indexOf(q) >= 0 ||
          (text[a.id] || '').indexOf(q) >= 0
        ) {
          hits.push(a);
        }
      }
      if (hits.length === 0) {
        results.appendChild(el('li', 'empty', 'Nothing matches "' + q + '".'));
        return;
      }
      for (var h = 0; h < hits.length; h += 1) {
        var li = el('li');
        li.appendChild(tokenFor(hits[h].kind));
        var link = doc.createElement('a');
        link.href = '#/artifacts/' + hits[h].id;
        link.textContent = hits[h].title || hits[h].id;
        li.appendChild(link);
        li.appendChild(el('span', 'aid mono', hits[h].id));
        results.appendChild(li);
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
    }
    if (state.view === 'graph') buildGraph();

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
    text: doc.getElementById('f-text'),
  };
  if (filters.kind) {
    filters.kind.addEventListener('change', function () {
      filterKind = filters.kind.value || null;
      renderList();
      markCurrent();
    });
  }
  if (filters.status) {
    filters.status.addEventListener('change', function () {
      filterStatus = filters.status.value || null;
      renderList();
      markCurrent();
    });
  }
  if (filters.text) {
    filters.text.addEventListener('input', function () {
      filterText = filters.text.value.trim() || null;
      renderList();
      markCurrent();
    });
  }
  wireSearch();

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
  const counts = new Map<string, number>();
  for (const edge of graph.edges) {
    const from = kindOf.get(edge.from);
    const to = kindOf.get(edge.to);
    if (!from || !to) continue;
    const key = `${from} ${edge.kind} ${to}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => {
      const [from, relKind, to] = key.split(' ') as [string, string, string];
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
      `<li>${token(kind)} <a href="#/artifacts">${escapeHtml(kindLabels[kind] ?? kind)}</a><span class="count">${members.length}</span></li>`,
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
    '<a href="#/graph" data-view="graph">Model graph</a>',
    '</nav>',
    '</header>',
    '<main id="main">',

    // ---- Overview: the opening view. No artifact body, no artifact-level graph.
    '<section id="view-overview" aria-labelledby="h-overview">',
    '<h2 class="view" id="h-overview">Overview</h2>',
    '<p class="lead">This page is a generated, read-only projection of a product model at the',
    'revision stamped above. It is regenerated from the authored files at any time and is never',
    'authoritative. Nothing here can be edited, and nothing you do is stored.</p>',
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
    '<label for="f-text">Filter by name or ID<input id="f-text" type="search" autocomplete="off"></label>',
    '<label for="q-body">Search content<input id="q-body" type="search" autocomplete="off"></label>',
    '<ul class="plain" id="q-body-results"></ul>',
    '</div>',
    '<div class="listwrap"><div id="artifact-list"></div></div>',
    '<p class="counts" id="list-counts"></p>',
    '</aside>',
    '<article class="detail" id="detail"></article>',
    '</div>',
    '</section>',

    // ---- Model graph: opened explicitly; built from the embedded data, never at open time.
    '<section id="view-graph" aria-labelledby="h-graph" hidden>',
    '<h2 class="view" id="h-graph">Model graph</h2>',
    '<p class="note">The whole-model graph, drawn on request. Select a node to highlight its',
    'relationships and to open the artifact. Every relationship is also readable as text on each',
    "artifact's own view.</p>",
    '<p id="graph-info"></p>',
    '<div id="graph-host"></div>',
    '</section>',

    '<p id="needs-script" class="note">This page needs JavaScript to render artifact content, which',
    'it holds entirely within this file — no network access is involved.</p>',
    '</main>',
    '<footer class="site">',
    '<p>Generated projection of the product model. Read-only, regenerable, never authoritative:',
    'the authored files in the repository remain the single source of truth.</p>',
    '<p>Every artifact and every relationship is contained in this file and reachable from here.</p>',
    '</footer>',
    `<script id="snapshot-data" type="application/json">${snapshotDataJson(graph, groups)}</script>`,
    `<script>\n${script}\n</script>`,
    '</body>',
    '</html>',
  ];
  return `${lines.filter((l) => l !== '').join('\n')}\n`;
}
