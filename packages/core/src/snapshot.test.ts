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
];

function build(): string {
  return buildSnapshotHtml(compileGraph(model), model, 'abc123');
}

describe('buildSnapshotHtml', () => {
  it('renders every artifact, organized by kind, in fixed kind order', () => {
    const html = build();
    for (const id of ['ACT-A', 'UC-A', 'JRN-A']) expect(html).toContain(`id="${id}"`);
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

  it('is self-contained: no scripts, no external resources', () => {
    const html = build();
    expect(html).not.toContain('<script');
    expect(html).not.toContain('src=');
    expect(html).not.toContain('<link');
    expect(html).not.toContain('@import');
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
