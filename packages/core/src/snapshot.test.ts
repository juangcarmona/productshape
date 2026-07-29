import { describe, expect, it } from 'vitest';
import { compileGraph } from './graph.js';
import { buildSnapshotHtml } from './snapshot.js';
import { artifact } from './test-support.js';

const model = [
  artifact('ACT-A', 'actor', { 'actor-kind': 'human' }, { body: '## Purpose\n\nA person.' }),
  artifact(
    'UC-A',
    'use-case',
    { 'primary-actor': 'ACT-A', status: 'draft' },
    { body: '## Goal\n\nDo the thing with **emphasis**.', status: 'draft' },
  ),
  artifact('JRN-A', 'journey', {
    'primary-actor': 'ACT-A',
    steps: [{ 'use-case': 'UC-A' }],
  }),
  artifact('FR-A', 'functional-requirement', { 'derived-from': ['UC-A'] }),
];

function build(): string {
  return buildSnapshotHtml(compileGraph(model), model, 'abc123');
}

describe('buildSnapshotHtml', () => {
  it('renders every artifact, organized by kind, in fixed kind order', () => {
    const html = build();
    for (const id of ['ACT-A', 'UC-A', 'JRN-A', 'FR-A']) expect(html).toContain(`id="${id}"`);
    const actors = html.indexOf('<h2>Actors</h2>', html.indexOf('<main>'));
    const journeys = html.indexOf('<h2>Journeys</h2>', html.indexOf('<main>'));
    const useCases = html.indexOf('<h2>Use Cases</h2>', html.indexOf('<main>'));
    expect(actors).toBeGreaterThan(-1);
    expect(actors).toBeLessThan(journeys);
    expect(journeys).toBeLessThan(useCases);
  });

  it('shows a status badge per artifact', () => {
    const html = build();
    expect(html).toContain('<span class="badge badge-active">active</span>');
    expect(html).toContain('<span class="badge badge-draft">draft</span>');
  });

  it('stamps the source revision in the header', () => {
    expect(build()).toContain('revision abc123');
    expect(buildSnapshotHtml(compileGraph(model), model, undefined)).toContain(
      'revision unavailable',
    );
  });

  it('renders artifact bodies as HTML and frontmatter as metadata', () => {
    const html = build();
    expect(html).toContain('Do the thing with <strong>emphasis</strong>');
    expect(html).toContain('<td class="key">primary-actor</td><td>ACT-A</td>');
    expect(html).toContain('use-case: UC-A');
  });

  it('renders outgoing references as links with their edge kind', () => {
    const html = build();
    expect(html).toContain(
      '<li><span class="edgekind">primary-actor</span> <a href="#ACT-A">ACT-A</a></li>',
    );
  });

  it('renders derived incoming references as links, never authored', () => {
    const html = build();
    // FR-A derives from UC-A; UC-A's article lists FR-A under "Referenced by".
    const ucArticle = html.slice(html.indexOf('<article class="artifact" id="UC-A">'));
    const ucEnd = ucArticle.indexOf('</article>');
    expect(ucArticle.slice(0, ucEnd)).toContain('<a href="#FR-A">FR-A</a>');
    expect(ucArticle.slice(0, ucEnd)).toContain('Referenced by');
  });

  it('embeds a search index covering every artifact with searchable text', () => {
    const html = build();
    expect(html).toContain('<script id="search-index" type="application/json">');
    const start = html.indexOf('type="application/json">') + 'type="application/json">'.length;
    const json = html.slice(start, html.indexOf('</script>', start));
    const index = JSON.parse(json) as { id: string; title: string; text: string }[];
    expect(index.map((e) => e.id).sort()).toEqual(['ACT-A', 'FR-A', 'JRN-A', 'UC-A']);
    expect(index.find((e) => e.id === 'UC-A')?.text).toContain('do the thing');
  });

  it('renders the graph SVG with one node per artifact and one line per edge', () => {
    const html = build();
    const graph = compileGraph(model);
    expect((html.match(/<circle data-id=/g) ?? []).length).toBe(graph.nodes.length);
    expect((html.match(/<line class="edge"/g) ?? []).length).toBe(graph.edges.length);
    expect(html).toContain('data-from="FR-A" data-to="UC-A"');
  });

  it('is self-contained: only the embedded snapshot scripts, no external resources', () => {
    const html = build();
    expect((html.match(/<script/g) ?? []).length).toBe(2);
    expect(html).toContain('<script id="search-index" type="application/json">');
    expect(html).not.toContain('src=');
    expect(html).not.toContain('<link');
    expect(html).not.toContain('@import');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('http://');
    expect(html).not.toContain('https://');
  });

  it('is byte-identical across builds and ends with a newline', () => {
    expect(build()).toBe(build());
    expect(build().endsWith('\n')).toBe(true);
    expect(build()).not.toContain('\r');
  });

  it('navigation links every artifact by anchor', () => {
    const html = build();
    for (const id of ['ACT-A', 'UC-A', 'JRN-A']) expect(html).toContain(`href="#${id}"`);
  });
});
