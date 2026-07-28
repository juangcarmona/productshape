import type { ProductGraph } from './graph.js';
import { escapeHtml, renderMarkdown } from './markdown.js';
import type { LoadedArtifact } from './model.js';

/**
 * The Product Snapshot: one self-contained, read-only HTML page projecting the whole product
 * model for people without the repository. Deterministic by construction: fixed kind order,
 * ID-sorted artifacts, LF line endings, no timestamps, no scripts, no external resources.
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
main { flex: 1; min-width: 0; padding: 1rem 2rem 4rem; max-width: 54rem; }
section.kind > h2 { font-size: 1.6rem; border-bottom: 2px solid var(--ink); padding-bottom: 0.3rem; margin-top: 3rem; }
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
.body h2 { font-size: 1.05rem; margin-top: 1.4rem; }
.body pre { background: var(--panel); padding: 0.6rem 0.9rem; border-radius: 4px; overflow-x: auto; }
footer.site { padding: 1rem 1.5rem; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.8rem; font-family: system-ui, sans-serif; }
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
    ...nav,
    '</nav>',
    '<main>',
    ...sections,
    '</main>',
    '</div>',
    '<footer class="site">',
    'Generated projection of the product model. Read-only, regenerable, never authoritative:',
    'the authored files in the repository remain the single source of truth.',
    '</footer>',
    '</body>',
    '</html>',
  ];
  return `${lines.filter((l) => l !== '').join('\n')}\n`;
}
