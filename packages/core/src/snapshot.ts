import type { ProductGraph } from './graph.js';
import { escapeHtml, renderMarkdown } from './markdown.js';
import type { LoadedArtifact } from './model.js';

/**
 * The Product Snapshot: one self-contained, read-only HTML page projecting the whole product
 * model for people without the repository. Deterministic by construction: fixed kind order,
 * ID-sorted artifacts, LF line endings, no timestamps, no external resources. The only script
 * is the embedded static block serving search and graph highlighting.
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

const style = `
:root { --ink: #1f2430; --muted: #5f6673; --line: #d9dde5; --bg: #ffffff; --panel: #f5f6f9; --accent: #2b5fb8; }
* { box-sizing: border-box; }
body { margin: 0; font: 16px/1.6 Georgia, 'Times New Roman', serif; color: var(--ink); background: var(--bg); }
code, pre { font-family: Consolas, Menlo, monospace; font-size: 0.9em; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
header.site { padding: 1.2rem 1.5rem; border-bottom: 2px solid var(--ink); }
header.site h1 { margin: 0; font-size: 1.5rem; }
header.site .revision { color: var(--muted); font-size: 0.85rem; font-family: Consolas, Menlo, monospace; }
.layout { display: flex; align-items: flex-start; }
nav.toc { position: sticky; top: 0; max-height: 100vh; overflow-y: auto; width: 21rem; flex: none; padding: 1rem 1.5rem; border-right: 1px solid var(--line); background: var(--panel); font-family: system-ui, sans-serif; font-size: 0.85rem; }
nav.toc h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 1.2rem 0 0.3rem; }
nav.toc ul { list-style: none; margin: 0; padding: 0; }
nav.toc li { margin: 0.15rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.search input { width: 100%; padding: 0.4rem 0.6rem; border: 1px solid var(--line); border-radius: 4px; font: inherit; }
.search ul { list-style: none; margin: 0.4rem 0 0; padding: 0; }
.search li { margin: 0.2rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
main { flex: 1; min-width: 0; padding: 1rem 2rem 4rem; max-width: 54rem; }
section.kind > h2 { font-size: 1.6rem; border-bottom: 2px solid var(--ink); padding-bottom: 0.3rem; margin-top: 3rem; }
section.graphviz > h2 { font-size: 1.6rem; border-bottom: 2px solid var(--ink); padding-bottom: 0.3rem; }
section.graphviz svg { width: 100%; height: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; }
section.graphviz .hint { color: var(--muted); font-size: 0.85rem; font-family: system-ui, sans-serif; }
#graph-info { min-height: 1.4rem; font-family: system-ui, sans-serif; font-size: 0.9rem; }
svg .edge { stroke: #c9cedb; stroke-width: 0.6; }
svg .edge.hl { stroke: var(--accent); stroke-width: 1.6; }
svg .edge.dim { stroke: #eceff3; }
svg circle { stroke: #ffffff; stroke-width: 1; cursor: pointer; }
svg circle.sel { stroke: var(--ink); stroke-width: 3; }
svg circle.hl { stroke: var(--accent); stroke-width: 2; }
svg circle.dim { opacity: 0.25; }
article.artifact { border: 1px solid var(--line); border-radius: 6px; padding: 1rem 1.5rem; margin: 1.5rem 0; }
article.artifact > header h3 { margin: 0; font-size: 1.2rem; }
article.artifact > header .id { font-family: Consolas, Menlo, monospace; font-size: 0.85rem; color: var(--muted); }
.badge { display: inline-block; font: 700 0.7rem/1.6 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 3px; padding: 0 0.5em; margin-left: 0.6em; vertical-align: middle; }
.badge-active { background: #e0efe3; color: #1d6b34; }
.badge-draft { background: #fdf2d0; color: #8a6d1a; }
.badge-deprecated { background: #fbe4d5; color: #a14d18; }
.badge-retired { background: #eceff3; color: #5f6673; }
table.meta { border-collapse: collapse; font-family: system-ui, sans-serif; font-size: 0.8rem; margin: 0.8rem 0; }
table.meta td { border: 1px solid var(--line); padding: 0.2rem 0.6rem; vertical-align: top; }
table.meta td.key { color: var(--muted); white-space: nowrap; }
.rels { font-family: system-ui, sans-serif; font-size: 0.85rem; border-top: 1px dashed var(--line); margin-top: 1rem; padding-top: 0.6rem; }
.rels h4 { margin: 0.4rem 0 0.2rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.rels ul { list-style: none; margin: 0; padding: 0; }
.rels li { margin: 0.15rem 0; }
.rels .edgekind { font-family: Consolas, Menlo, monospace; font-size: 0.75rem; color: var(--muted); }
.body h2 { font-size: 1.05rem; margin-top: 1.4rem; }
.body pre { background: var(--panel); padding: 0.6rem 0.9rem; border-radius: 4px; overflow-x: auto; }
footer.site { padding: 1rem 1.5rem; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.8rem; font-family: system-ui, sans-serif; }
`.trim();

/**
 * The one embedded script: sidebar search over the JSON index, and neighborhood highlighting
 * on the pre-rendered SVG. Static string — interactivity is presentation only, never mutation.
 */
const script = `
(function () {
  var doc = document;
  var input = doc.getElementById('search-input');
  var results = doc.getElementById('search-results');
  var dataEl = doc.getElementById('search-index');
  if (input && results && dataEl) {
    input.hidden = false;
    var index = JSON.parse(dataEl.textContent || '[]');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      results.innerHTML = '';
      if (!q) return;
      var hits = [];
      for (var i = 0; i < index.length && hits.length < 20; i += 1) {
        var e = index[i];
        if (
          e.id.toLowerCase().indexOf(q) >= 0 ||
          e.title.toLowerCase().indexOf(q) >= 0 ||
          e.text.indexOf(q) >= 0
        ) {
          hits.push(e);
        }
      }
      for (var j = 0; j < hits.length; j += 1) {
        var li = doc.createElement('li');
        var a = doc.createElement('a');
        a.href = '#' + hits[j].id;
        a.textContent = hits[j].title + ' (' + hits[j].id + ')';
        li.appendChild(a);
        results.appendChild(li);
      }
    });
  }
  var svg = doc.getElementById('graph-svg');
  if (svg) {
    var current = null;
    svg.addEventListener('click', function (ev) {
      var target = ev.target instanceof Element ? ev.target.closest('circle[data-id]') : null;
      if (!target) return;
      var id = target.getAttribute('data-id');
      if (current === id) {
        location.hash = id;
        return;
      }
      current = id;
      var related = {};
      related[id] = true;
      var lines = svg.querySelectorAll('line');
      for (var i = 0; i < lines.length; i += 1) {
        var from = lines[i].getAttribute('data-from');
        var to = lines[i].getAttribute('data-to');
        if (from === id || to === id) {
          lines[i].setAttribute('class', 'edge hl');
          related[from] = true;
          related[to] = true;
        } else {
          lines[i].setAttribute('class', 'edge dim');
        }
      }
      var nodes = svg.querySelectorAll('circle[data-id]');
      for (var k = 0; k < nodes.length; k += 1) {
        var nid = nodes[k].getAttribute('data-id');
        var state = nid === id ? ' sel' : related[nid] ? ' hl' : ' dim';
        nodes[k].setAttribute('class', state.trim());
      }
      var info = doc.getElementById('graph-info');
      if (info) {
        info.innerHTML = '';
        var link = doc.createElement('a');
        link.href = '#' + id;
        link.textContent = 'Open ' + id;
        info.appendChild(link);
        info.appendChild(doc.createTextNode(' — click the node again to jump to it.'));
      }
    });
  }
})();
`.trim();

function badge(status: string): string {
  const known = ['active', 'draft', 'deprecated', 'retired'];
  const cls = known.includes(status) ? `badge-${status}` : 'badge-retired';
  return `<span class="badge ${cls}">${escapeHtml(status || 'unknown')}</span>`;
}

function metaValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => metaValue(item)).join(', ');
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${escapeHtml(k)}: ${metaValue(v)}`)
      .join('; ');
  }
  return escapeHtml(String(value));
}

function metadataTable(frontmatter: Record<string, unknown>): string {
  const skip = new Set(['id', 'type', 'title', 'status']);
  const rows = Object.entries(frontmatter)
    .filter(([key, value]) => !skip.has(key) && value !== undefined && value !== null)
    .filter(([, value]) => !(Array.isArray(value) && value.length === 0))
    .map(
      ([key, value]) =>
        `<tr><td class="key">${escapeHtml(key)}</td><td>${metaValue(value)}</td></tr>`,
    );
  if (rows.length === 0) return '';
  return `<table class="meta">\n${rows.join('\n')}\n</table>`;
}

function artifactLink(graph: ProductGraph, id: string): string {
  const node = graph.nodeById.get(id);
  const label = node?.title && node.title !== id ? `${id} — ${node.title}` : id;
  return `<a href="#${escapeHtml(id)}">${escapeHtml(label)}</a>`;
}

/** References (authored, outgoing) and Referenced by (derived, incoming) as navigable links. */
function relationshipSections(graph: ProductGraph, id: string): string {
  const outgoing = graph.outgoing.get(id) ?? [];
  const incoming = graph.incoming.get(id) ?? [];
  if (outgoing.length === 0 && incoming.length === 0) return '';
  const parts: string[] = ['<div class="rels">'];
  if (outgoing.length > 0) {
    parts.push('<h4>References</h4>', '<ul>');
    for (const edge of outgoing) {
      parts.push(
        `<li><span class="edgekind">${escapeHtml(edge.kind)}</span> ${artifactLink(graph, edge.to)}</li>`,
      );
    }
    parts.push('</ul>');
  }
  if (incoming.length > 0) {
    parts.push('<h4>Referenced by</h4>', '<ul>');
    for (const edge of incoming) {
      parts.push(
        `<li>${artifactLink(graph, edge.from)} <span class="edgekind">${escapeHtml(edge.kind)}</span></li>`,
      );
    }
    parts.push('</ul>');
  }
  parts.push('</div>');
  return parts.join('\n');
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

/** JSON search index over IDs, titles and collapsed body text, embedded in the page. */
function searchIndexJson(groups: Map<string, LoadedArtifact[]>): string {
  const entries: { id: string; title: string; kind: string; text: string }[] = [];
  for (const [kind, members] of groups) {
    for (const a of members) {
      entries.push({
        id: a.id as string,
        title: a.title ?? (a.id as string),
        kind,
        text: a.body.toLowerCase().replace(/\s+/g, ' ').trim(),
      });
    }
  }
  // `<` escaped so the JSON can never terminate its containing script element.
  return JSON.stringify(entries).replaceAll('<', '\\u003c');
}

/**
 * Inline SVG of the whole graph: nodes on a circle grouped by kind (the page's own order),
 * colored by kind, edges as lines. Deterministic trigonometric layout; the script only
 * toggles highlight classes on what is rendered here.
 */
function buildGraphSvg(graph: ProductGraph, groups: Map<string, LoadedArtifact[]>): string {
  const ordered: { id: string; kind: string; title: string }[] = [];
  for (const [kind, members] of groups) {
    for (const a of members) ordered.push({ id: a.id as string, kind, title: a.title ?? '' });
  }
  const center = 500;
  const radius = 420;
  const positions = new Map<string, { x: string; y: string }>();
  ordered.forEach((node, index) => {
    const angle = (index / ordered.length) * 2 * Math.PI - Math.PI / 2;
    positions.set(node.id, {
      x: (center + radius * Math.cos(angle)).toFixed(2),
      y: (center + radius * Math.sin(angle)).toFixed(2),
    });
  });

  const lines: string[] = [];
  for (const edge of graph.edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;
    lines.push(
      `<line class="edge" data-from="${escapeHtml(edge.from)}" data-to="${escapeHtml(edge.to)}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>`,
    );
  }
  const circles: string[] = [];
  for (const node of ordered) {
    const pos = positions.get(node.id);
    if (!pos) continue;
    const color = kindColors[node.kind] ?? '#5f6673';
    const label = node.title ? `${node.id} — ${node.title}` : node.id;
    circles.push(
      `<circle data-id="${escapeHtml(node.id)}" cx="${pos.x}" cy="${pos.y}" r="9" fill="${color}"><title>${escapeHtml(label)}</title></circle>`,
    );
  }
  return [
    '<svg id="graph-svg" viewBox="0 0 1000 1000" role="img" aria-label="Product graph">',
    ...lines,
    ...circles,
    '</svg>',
  ].join('\n');
}

export function buildSnapshotHtml(
  graph: ProductGraph,
  artifacts: LoadedArtifact[],
  revision: string | undefined,
): string {
  const groups = sortedByKind(artifacts);
  const revisionText = revision
    ? `revision ${escapeHtml(revision)}`
    : 'revision unavailable (not generated from a Git checkout)';

  const nav: string[] = [];
  const sections: string[] = [];
  for (const [kind, members] of groups) {
    const label = kindLabels[kind] ?? kind;
    nav.push(`<h2>${escapeHtml(label)}</h2>`);
    nav.push('<ul>');
    for (const a of members) {
      nav.push(
        `<li><a href="#${escapeHtml(a.id as string)}">${escapeHtml(a.title ?? (a.id as string))}</a></li>`,
      );
    }
    nav.push('</ul>');

    sections.push(`<section class="kind"><h2>${escapeHtml(label)}</h2>`);
    for (const a of members) {
      sections.push(`<article class="artifact" id="${escapeHtml(a.id as string)}">`);
      sections.push('<header>');
      sections.push(
        `<h3>${escapeHtml(a.title ?? '')}${badge(a.status ?? '')}</h3>`,
        `<div class="id">${escapeHtml(a.id as string)}</div>`,
      );
      sections.push('</header>');
      sections.push(metadataTable(a.frontmatter));
      sections.push(`<div class="body">\n${renderMarkdown(a.body.trim())}\n</div>`);
      sections.push(relationshipSections(graph, a.id as string));
      sections.push('</article>');
    }
    sections.push('</section>');
  }

  const lines = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Product Snapshot</title>',
    `<style>\n${style}\n</style>`,
    '</head>',
    '<body>',
    '<header class="site">',
    '<h1>Product Snapshot</h1>',
    `<div class="revision">${graph.nodes.length} artifacts &middot; ${revisionText}</div>`,
    '</header>',
    '<div class="layout">',
    '<nav class="toc">',
    '<div class="search">',
    '<input id="search-input" type="search" placeholder="Search artifacts" hidden>',
    '<ul id="search-results"></ul>',
    '</div>',
    ...nav,
    '</nav>',
    '<main>',
    '<section class="graphviz">',
    '<h2>Product Graph</h2>',
    '<p class="hint">Select a node to highlight its relationships; select it again to jump to the artifact.</p>',
    '<div id="graph-info"></div>',
    buildGraphSvg(graph, groups),
    '</section>',
    ...sections,
    '</main>',
    '</div>',
    '<footer class="site">',
    'Generated projection of the product model. Read-only, regenerable, never authoritative:',
    'the authored files in the repository remain the single source of truth.',
    '</footer>',
    `<script id="search-index" type="application/json">${searchIndexJson(groups)}</script>`,
    `<script>\n${script}\n</script>`,
    '</body>',
    '</html>',
  ];
  return `${lines.filter((l) => l !== '').join('\n')}\n`;
}
