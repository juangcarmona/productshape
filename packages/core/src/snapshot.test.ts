import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { compileGraph } from './graph.js';
import { buildSnapshotHtml } from './snapshot.js';
import { artifact } from './test-support.js';

const hostile = '<script>alert(1)</script> and <div unclosed and " onload="x" and \'q\'';

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
  // Isolated: declares nothing and is referenced by nothing.
  artifact('CON-A', 'constraint', {}, { body: '## Constraint\n\nA boundary.' }),
];

/** 12 use cases citing one actor: enough for a group above the collapse threshold. */
const busy = [
  artifact('ACT-H', 'actor', { 'actor-kind': 'human' }, { body: '## Purpose\n\nA hub.' }),
  artifact('BR-H', 'business-rule', {}, { body: '## Rule\n\nA rule.' }),
  ...Array.from({ length: 12 }, (_, i) =>
    artifact(`UC-H${String(i).padStart(2, '0')}`, 'use-case', {
      'primary-actor': 'ACT-H',
      'governed-by': ['BR-H'],
    }),
  ),
];

function build(artifacts = model): string {
  return buildSnapshotHtml(compileGraph(artifacts), artifacts, 'abc123');
}

/** The markup the browser parses at open time: <body> up to the first inert data block. */
function openingDocument(html: string): string {
  const start = html.indexOf('<body');
  return html.slice(start, html.indexOf('<script id=', start));
}

function embeddedData(html: string): {
  artifacts: {
    id: string;
    kind: string;
    title: string;
    status: string;
    meta: [string, string][];
    body: string;
  }[];
  edges: { from: string; to: string; kind: string }[];
  kindOrder: string[];
} {
  const open = '<script id="snapshot-data" type="application/json">';
  const start = html.indexOf(open) + open.length;
  const json = html.slice(start, html.indexOf('</script>', start));
  return JSON.parse(json);
}

describe('buildSnapshotHtml — generation contract', () => {
  it('is byte-identical across builds, LF-only, and ends with a newline', () => {
    expect(build()).toBe(build());
    expect(build().endsWith('\n')).toBe(true);
    expect(build()).not.toContain('\r');
  });

  it('stamps the source revision, monospaced, in the header', () => {
    expect(build()).toContain('revision <span class="rev">abc123</span>');
    expect(buildSnapshotHtml(compileGraph(model), model, undefined)).toContain(
      'revision unavailable',
    );
  });

  it('is self-contained: one inert data block, one application block, no external resources', () => {
    const html = build();
    expect((html.match(/<script/g) ?? []).length).toBe(2);
    expect(html).toContain('<script id="snapshot-data" type="application/json">');
    expect(html).not.toContain('src=');
    expect(html).not.toContain('<link');
    expect(html).not.toContain('@import');
    expect(html).not.toContain('<form');
    // No resource is ever referenced across the network.
    expect(html).not.toMatch(/(?:href|src)="https?:/);
    expect(html).not.toMatch(/url\(\s*['"]?https?:/);
    // The only absolute URL in the file is the SVG namespace identifier, which is never fetched.
    const urls = [...html.matchAll(/https?:\/\/[^\s'"<)]+/g)].map((m) => m[0]);
    expect([...new Set(urls)]).toEqual(['http://www.w3.org/2000/svg']);
  });

  it('declares a single light appearance with no theme branch or control', () => {
    const html = build();
    expect(html).toContain('color-scheme: light');
    expect(html).not.toContain('prefers-color-scheme');
    expect(html).not.toContain('data-theme');
  });

  it('respects a reduced-motion preference', () => {
    expect(build()).toContain('@media (prefers-reduced-motion: reduce)');
  });
});

describe('buildSnapshotHtml — the opening document is bounded', () => {
  it('renders no artifact body and no artifact-level graph at open', () => {
    const opening = openingDocument(build());
    expect(opening).not.toContain('A person.');
    expect(opening).not.toContain('Do the thing');
    expect(opening).not.toContain('<circle');
    expect(opening).not.toContain('<line');
    expect(opening).not.toContain('<svg');
  });

  it('does not grow in proportion to the artifact count', () => {
    const wide = Array.from({ length: 200 }, (_, i) =>
      artifact(`UC-${String(i).padStart(3, '0')}`, 'use-case', { 'primary-actor': 'ACT-A' }),
    ).concat(model);
    const small = openingDocument(build()).length;
    const large = openingDocument(build(wide)).length;
    // 40x the artifacts must not mean anything like 40x the opening document.
    expect(large / small).toBeLessThan(2);
  });
});

describe('buildSnapshotHtml — orientation view', () => {
  it('states identity, revision and totals without exposing the corpus', () => {
    const html = build();
    const opening = openingDocument(html);
    expect(opening).toContain('<h1>Product Snapshot</h1>');
    expect(opening).toContain('5 artifacts');
    expect(opening).toContain('4 relationships');
    expect(opening).toContain('generated, read-only projection');
  });

  it('counts artifacts per kind, matching the compiled graph exactly', () => {
    const graph = compileGraph(model);
    const opening = openingDocument(build());
    const byKind = new Map<string, number>();
    for (const node of graph.nodes) byKind.set(node.type, (byKind.get(node.type) ?? 0) + 1);
    for (const [, count] of byKind)
      expect(opening).toContain(`<span class="count">${count}</span>`);
    expect(opening).toContain('Use Cases');
    expect(opening).toContain('Actors');
  });

  it('aggregates relationships by kind and relationship type with exact counts', () => {
    const opening = openingDocument(build());
    expect(opening).toContain('Relationships by kind');
    // UC-A -> ACT-A via primary-actor, JRN-A -> ACT-A via primary-actor: two of the same triple.
    expect(opening).toContain('<td class="rel">primary-actor</td>');
    const graph = compileGraph(model);
    const kindOf = new Map(graph.nodes.map((n) => [n.id, n.type]));
    const triples = new Map<string, number>();
    for (const e of graph.edges) {
      const key = `${kindOf.get(e.from)} ${e.kind} ${kindOf.get(e.to)}`;
      triples.set(key, (triples.get(key) ?? 0) + 1);
    }
    // Every aggregate row's count corresponds to a real triple, and the total is conserved.
    const counts = [...(openingDocument(build()).matchAll(/<td class="n">(\d+)<\/td>/g) ?? [])].map(
      (m) => Number(m[1]),
    );
    expect(counts.reduce((a, b) => a + b, 0)).toBe(graph.edges.length);
    expect(counts.length).toBe(triples.size);
  });

  it('reports artifacts with no relationships neutrally, with exact count and identities', () => {
    const opening = openingDocument(build());
    expect(opening).toContain('Artifacts with no relationships');
    expect(opening).toContain('1 of 5 artifacts declare no relationships');
    expect(opening).toContain('>CON-A<');
    for (const pejorative of ['orphan', 'dangling', 'unused', 'missing', 'warning', 'health']) {
      expect(opening.toLowerCase()).not.toContain(pejorative);
    }
  });

  it('says so plainly when every artifact participates in a relationship', () => {
    const connected = model.filter((a) => a.id !== 'CON-A');
    expect(openingDocument(build(connected))).toContain(
      'Every artifact in this model participates in at least one relationship',
    );
  });

  it('describes only the artifact kinds the model contains', () => {
    const twoKinds = [model[0]!, model[1]!];
    const opening = openingDocument(build(twoKinds));
    expect(opening).toContain('Actors');
    expect(opening).toContain('Use Cases');
    expect(opening).not.toContain('Constraints');
    expect(opening).not.toContain('Domain Terms');
  });

  it('renders an empty aggregate without breaking when there are no relationships', () => {
    const lone = [artifact('CON-B', 'constraint', {}, { body: '## Constraint\n\nAlone.' })];
    const opening = openingDocument(build(lone));
    expect(opening).toContain('This model declares no relationships');
    expect(opening).toContain('1 of 1 artifacts declare no relationships');
  });
});

describe('buildSnapshotHtml — embedded data completeness', () => {
  it('carries every artifact with its body, metadata and status', () => {
    const data = embeddedData(build());
    expect(data.artifacts.map((a) => a.id).sort()).toEqual([
      'ACT-A',
      'CON-A',
      'FR-A',
      'JRN-A',
      'UC-A',
    ]);
    const uc = data.artifacts.find((a) => a.id === 'UC-A');
    expect(uc?.status).toBe('draft');
    expect(uc?.body).toContain('Do the thing with <strong>emphasis</strong>');
    expect(uc?.meta).toEqual(expect.arrayContaining([['primary-actor', 'ACT-A']]));
    const jrn = data.artifacts.find((a) => a.id === 'JRN-A');
    expect(jrn?.meta).toEqual(expect.arrayContaining([['steps', 'use-case: UC-A']]));
  });

  it('carries every relationship of the compiled graph', () => {
    const graph = compileGraph(model);
    const data = embeddedData(build());
    expect(data.edges.length).toBe(graph.edges.length);
    expect(data.edges).toEqual(graph.edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind })));
  });

  it('nests body headings under the detail title without skipping a level', () => {
    const data = embeddedData(build());
    // Bodies conventionally start at h2; the detail title is h3, so h2 becomes h4.
    expect(data.artifacts.find((a) => a.id === 'ACT-A')?.body).toContain('<h4>Purpose</h4>');
  });

  it('escapes the data block so it cannot terminate its own script element', () => {
    const nasty = [
      artifact('ACT-A', 'actor', { 'actor-kind': 'human' }, { body: `## Purpose\n\n${hostile}` }),
    ];
    const html = build(nasty);
    const open = '<script id="snapshot-data" type="application/json">';
    const start = html.indexOf(open) + open.length;
    const raw = html.slice(start, html.indexOf('</script>', start));
    expect(raw).not.toContain('<');
    expect(raw).toContain('\\u003c');
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe('buildSnapshotHtml — hostile authored content', () => {
  it('never lets an authored script or attribute become markup', () => {
    const nasty = [
      artifact(
        'ACT-A',
        'actor',
        { 'actor-kind': 'human', 'x-note': hostile },
        { body: `## Purpose\n\n${hostile}` },
      ),
    ];
    const data = embeddedData(build(nasty));
    const body = data.artifacts[0]?.body ?? '';
    expect(body).not.toContain('<script');
    expect(body).toContain('&lt;script&gt;');
    expect(body).toContain('&quot;');
    expect(data.artifacts[0]?.meta.find(([k]) => k === 'x-note')?.[1]).toContain('<script>');
  });

  it('refuses link targets that could execute', () => {
    const linky = [
      artifact(
        'ACT-A',
        'actor',
        { 'actor-kind': 'human' },
        {
          body: [
            '## Purpose',
            '',
            '[ok](https://example.org/a) [rel](./x.md) [bad](javascript:alert(1)) [worse](data:text/html,x)',
          ].join('\n'),
        },
      ),
    ];
    const body = embeddedData(build(linky)).artifacts[0]?.body ?? '';
    expect(body).toContain('<a href="https://example.org/a">ok</a>');
    expect(body).toContain('<a href="./x.md">rel</a>');
    expect(body).not.toContain('href="javascript:');
    expect(body).not.toContain('href="data:');
    // The refused links survive as the inert text the author wrote, not as anchors.
    expect(body).toContain('[bad](javascript:alert(1))');
    expect(body).toContain('[worse](data:text/html,x)');
  });
});

describe('buildSnapshotHtml — accessibility of the opening document', () => {
  it('exposes landmarks and a heading outline with no skipped levels', () => {
    const opening = openingDocument(build());
    expect(opening).toContain('<header class="site">');
    expect(opening).toContain('<nav class="views" aria-label="Snapshot views">');
    expect(opening).toContain('<main id="main">');
    expect(opening).toContain('<footer class="site">');
    expect(opening).toContain('class="skip"');
    const levels = [...opening.matchAll(/<h([1-6])[ >]/g)].map((m) => Number(m[1]));
    expect(levels[0]).toBe(1);
    let previous = levels[0] ?? 1;
    for (const level of levels) {
      expect(level - previous).toBeLessThanOrEqual(1);
      previous = level;
    }
  });

  it('marks the active view with aria-current and labels every control', () => {
    const opening = openingDocument(build());
    expect(opening).toContain('data-view="overview" aria-current="page"');
    for (const id of ['f-kind', 'f-status', 'f-text', 'q-body']) {
      expect(opening).toContain(`for="${id}"`);
      expect(opening).toContain(`id="${id}"`);
    }
  });

  it('meets WCAG 2.1 AA contrast for every text-and-background pair the stylesheet produces', () => {
    const html = build();
    const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    const value = (name: string): string =>
      new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(style)?.[1] ?? '';
    const luminance = (hex: string): number => {
      const parts = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const linear = parts.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
    };
    const ratio = (a: string, b: string): number => {
      const [x, y] = [luminance(a), luminance(b)];
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const bg = value('bg');
    const panel = value('panel');
    const accentSoft = value('accent-soft');
    // Foregrounds that appear on the page background and on the panel fills.
    for (const name of ['ink', 'text', 'muted', 'accent']) {
      for (const behind of [bg, panel, accentSoft]) {
        expect(ratio(value(name), behind), `--${name} on ${behind}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    // Every kind colour is used as text, on the page background and on the panel.
    const kindHexes = [...style.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0]);
    expect(kindHexes.length).toBeGreaterThan(0);
    const data = embeddedData(html) as unknown as { kindColors: Record<string, string> };
    for (const [kind, hex] of Object.entries(data.kindColors)) {
      expect(ratio(hex, bg), `kind ${kind} on background`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(hex, panel), `kind ${kind} on panel`).toBeGreaterThanOrEqual(4.5);
    }
    const statuses = (
      embeddedData(html) as unknown as {
        statusColors: Record<string, { fg: string; bg: string }>;
      }
    ).statusColors;
    for (const [status, pair] of Object.entries(statuses)) {
      expect(ratio(pair.fg, pair.bg), `status ${status}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('never carries kind or status by colour alone', () => {
    const data = embeddedData(build()) as unknown as { kindTokens: Record<string, string> };
    // Every kind has a text token, and status badges render their status as text.
    for (const token of Object.values(data.kindTokens)) expect(token).toMatch(/^[A-Z]{2,4}$/);
    const html = build();
    // Kind tokens accompany every kind in the opening document; status text is rendered with the
    // badge on demand, which the DOM suite below asserts reads 'draft' rather than a colour alone.
    expect(openingDocument(html)).toContain('class="token"');
    const statuses = (
      embeddedData(html) as unknown as {
        statusColors: Record<string, { fg: string; bg: string }>;
      }
    ).statusColors;
    expect(Object.keys(statuses)).toContain('draft');
  });
});

/**
 * The embedded application, driven in a real DOM. The generated file is loaded as a document and
 * its own script executed, so routing, selection and on-demand rendering are exercised as a reader
 * would exercise them rather than asserted from the markup.
 */
describe('the embedded application', () => {
  let dom: JSDOM;
  let doc: Document;

  const load = (hash = '', artifacts = model): void => {
    dom = new JSDOM(build(artifacts), {
      url: `https://snapshot.invalid/snapshot.html${hash}`,
      runScripts: 'dangerously',
    });
    doc = dom.window.document;
  };
  const navigate = (hash: string): void => {
    dom.window.location.hash = hash;
    // jsdom dispatches hashchange asynchronously as a microtask-adjacent task.
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
  };
  const visible = (view: string): boolean => !doc.getElementById(`view-${view}`)?.hidden;

  beforeEach(() => {
    load();
  });

  it('opens on the overview with the other views hidden', () => {
    expect(visible('overview')).toBe(true);
    expect(visible('artifacts')).toBe(false);
    expect(visible('graph')).toBe(false);
    expect(doc.getElementById('needs-script')).toBeNull();
  });

  it('renders the artifact list on demand, grouped by kind, with every artifact selectable', () => {
    navigate('#/artifacts');
    expect(visible('artifacts')).toBe(true);
    const links = [...doc.querySelectorAll('#artifact-list a')].map((a) => a.getAttribute('href'));
    for (const id of ['ACT-A', 'UC-A', 'JRN-A', 'FR-A', 'CON-A']) {
      expect(links).toContain(`#/artifacts/${id}`);
    }
    expect(doc.querySelectorAll('#artifact-list h4').length).toBeGreaterThan(1);
    expect(doc.getElementById('list-counts')?.textContent).toContain('5 artifacts');
  });

  it('renders exactly one artifact detail, with no other artifact body present', () => {
    navigate('#/artifacts/UC-A');
    const detail = doc.getElementById('detail');
    expect(detail?.querySelectorAll('h3.artifact').length).toBe(1);
    expect(detail?.textContent).toContain('Do the thing with emphasis');
    expect(detail?.textContent).not.toContain('A person.');
    expect(doc.getElementById('main')?.textContent).not.toContain('A person.');
  });

  it('shows the selected artifact as current in the list', () => {
    navigate('#/artifacts/UC-A');
    const current = doc.querySelectorAll('#artifact-list a[aria-current="true"]');
    expect(current.length).toBe(1);
    expect(current[0]?.getAttribute('href')).toBe('#/artifacts/UC-A');
  });

  it('shows identity, kind, status and metadata for the selected artifact', () => {
    navigate('#/artifacts/UC-A');
    const detail = doc.getElementById('detail');
    expect(detail?.querySelector('.aid')?.textContent).toBe('UC-A');
    expect(detail?.querySelector('.badge')?.textContent).toBe('draft');
    expect(detail?.querySelector('.kindname')?.textContent).toBe('Use Cases');
    expect(detail?.querySelector('dl.meta')?.textContent).toContain('primary-actor');
  });

  it('separates declared references from derived reverse references', () => {
    navigate('#/artifacts/UC-A');
    const rels = doc.querySelector('#detail .rels');
    const headings = [...(rels?.querySelectorAll('h5') ?? [])].map((h) => h.textContent);
    expect(headings).toEqual(['Declares (references)', 'Referenced by (derived)']);
    // Relationship type and direction are carried by each group's label, which every entry sits
    // under — including the single-group case, which renders the label without a disclosure.
    const text = rels?.textContent ?? '';
    expect(text).toContain('→ primary-actor');
    expect(text).toContain('← derived-from');
    expect(text).toContain('← steps');
  });

  it('reports both directions as empty for an isolated artifact', () => {
    navigate('#/artifacts/CON-A');
    const rels = doc.querySelector('#detail .rels');
    expect(rels?.querySelectorAll('p.none').length).toBe(2);
    expect(doc.getElementById('detail')?.textContent).toContain('A boundary.');
  });

  it('follows a relationship to the next artifact, moving the same selection', () => {
    navigate('#/artifacts/UC-A');
    const link = [...doc.querySelectorAll('#detail .rels a')].find(
      (a) => a.getAttribute('href') === '#/artifacts/ACT-A',
    );
    expect(link).toBeDefined();
    navigate('#/artifacts/ACT-A');
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe('ACT-A');
    const current = doc.querySelectorAll('#artifact-list a[aria-current="true"]');
    expect(current.length).toBe(1);
    expect(current[0]?.getAttribute('href')).toBe('#/artifacts/ACT-A');
  });

  it('opens directly on an artifact named in the address', () => {
    load('#/artifacts/FR-A');
    expect(visible('artifacts')).toBe(true);
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe('FR-A');
  });

  it('resolves a legacy bare-identifier fragment and normalizes it in place', () => {
    load('#UC-A');
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe('UC-A');
    expect(dom.window.location.hash).toBe('#/artifacts/UC-A');
    // Normalized by replacement: no extra history entry was pushed.
    expect(dom.window.history.length).toBe(1);
  });

  it('names an identifier it cannot resolve, in either route form', () => {
    for (const hash of ['#/artifacts/UC-NOPE', '#UC-NOPE']) {
      load(hash);
      const text = doc.getElementById('detail')?.textContent ?? '';
      expect(text).toContain('does not contain');
      expect(text).toContain('UC-NOPE');
      expect(doc.querySelector('#detail a[href="#/"]')).not.toBeNull();
    }
  });

  it('marks the active view with aria-current as the reader moves', () => {
    navigate('#/artifacts');
    expect(doc.querySelector('nav.views a[aria-current="page"]')?.getAttribute('data-view')).toBe(
      'artifacts',
    );
    navigate('#/graph');
    expect(doc.querySelector('nav.views a[aria-current="page"]')?.getAttribute('data-view')).toBe(
      'graph',
    );
  });

  it('builds the whole-model graph only when that view is opened', () => {
    expect(doc.querySelector('#graph-host svg')).toBeNull();
    navigate('#/graph');
    const svg = doc.querySelector('#graph-host svg');
    expect(svg).not.toBeNull();
    const graph = compileGraph(model);
    expect(svg?.querySelectorAll('circle').length).toBe(graph.nodes.length);
    expect(svg?.querySelectorAll('line').length).toBe(graph.edges.length);
  });

  it('filters the list by kind, status and text without losing the selection', () => {
    navigate('#/artifacts/UC-A');
    const kind = doc.getElementById('f-kind') as HTMLSelectElement;
    kind.value = 'actor';
    kind.dispatchEvent(new dom.window.Event('change'));
    const links = [...doc.querySelectorAll('#artifact-list a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['#/artifacts/ACT-A']);
    expect(doc.getElementById('list-counts')?.textContent).toContain('1 of 5');
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe('UC-A');
    kind.value = '';
    kind.dispatchEvent(new dom.window.Event('change'));
    expect(doc.querySelectorAll('#artifact-list a').length).toBe(5);
  });

  it('says so when a filter matches nothing', () => {
    navigate('#/artifacts');
    const text = doc.getElementById('f-text') as HTMLInputElement;
    text.value = 'zzz-nothing';
    text.dispatchEvent(new dom.window.Event('input'));
    expect(doc.querySelector('#artifact-list .empty')?.textContent).toContain(
      'No artifact matches',
    );
  });

  it('searches content offline and reports when nothing matches', () => {
    navigate('#/artifacts');
    const q = doc.getElementById('q-body') as HTMLInputElement;
    q.value = 'thing';
    q.dispatchEvent(new dom.window.Event('input'));
    const hits = [...doc.querySelectorAll('#q-body-results a')].map((a) => a.getAttribute('href'));
    expect(hits).toContain('#/artifacts/UC-A');
    q.value = 'zzz-nothing';
    q.dispatchEvent(new dom.window.Event('input'));
    expect(doc.querySelector('#q-body-results .empty')?.textContent).toContain('Nothing matches');
  });

  it('never executes authored content, on first render or after navigating away and back', () => {
    const nasty = [
      artifact('ACT-A', 'actor', { 'actor-kind': 'human' }, { body: `## Purpose\n\n${hostile}` }),
      artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A' }),
    ];
    load('#/artifacts/ACT-A', nasty);
    const detail = () => doc.getElementById('detail');
    expect(detail()?.querySelector('script')).toBeNull();
    expect(detail()?.textContent).toContain('<script>alert(1)</script>');
    expect((dom.window as unknown as { __xss?: boolean }).__xss).toBeUndefined();
    navigate('#/artifacts/UC-A');
    navigate('#/artifacts/ACT-A');
    expect(detail()?.querySelector('script')).toBeNull();
    expect(detail()?.textContent).toContain('<script>alert(1)</script>');
  });

  it('persists nothing outside the address', () => {
    navigate('#/artifacts/UC-A');
    navigate('#/graph');
    expect(dom.window.localStorage.length).toBe(0);
    expect(dom.window.sessionStorage.length).toBe(0);
    expect(doc.cookie).toBe('');
  });

  it('switches the narrow-viewport pane with the selection', () => {
    navigate('#/artifacts');
    expect(doc.body.getAttribute('data-pane')).toBe('master');
    navigate('#/artifacts/UC-A');
    expect(doc.body.getAttribute('data-pane')).toBe('detail');
  });
});

describe('relationship groups', () => {
  let dom: JSDOM;
  let doc: Document;

  const open = (hash: string, artifacts: typeof model): void => {
    dom = new JSDOM(build(artifacts), {
      url: `https://snapshot.invalid/snapshot.html${hash}`,
      runScripts: 'dangerously',
    });
    doc = dom.window.document;
  };
  const groups = (): Element[] => [...doc.querySelectorAll('#detail details.relgroup')];

  it('groups a direction by relationship type and artifact kind, with exact counts', () => {
    open('#/artifacts/ACT-H', busy);
    // ACT-H is referenced by 12 use cases via primary-actor: one group, above the threshold, so it
    // presents as a collapsed disclosure carrying the label and the count.
    const label = doc.querySelector('#detail .glabel');
    expect(label?.textContent).toContain('← primary-actor');
    expect(label?.textContent).toContain('Use Cases');
    expect(doc.querySelector('#detail .gcount')?.textContent).toBe('12');
  });

  it('collapses a lone group that is large, rather than exempting it for being alone', () => {
    open('#/artifacts/ACT-H', busy);
    const only = doc.querySelectorAll('#detail details.relgroup');
    expect(only.length).toBe(1);
    expect((only[0] as HTMLDetailsElement).open).toBe(false);
    expect(only[0]?.querySelector('ul.members')).toBeNull();
    expect(doc.querySelector('#detail p.glabel.solo')).toBeNull();
  });

  it('uses a plain label, not a disclosure, for a lone small group', () => {
    open('#/artifacts/UC-A', model);
    // UC-A declares one primary-actor: a lone group of one.
    const solo = doc.querySelector('#detail p.glabel.solo');
    expect(solo?.textContent).toContain('→ primary-actor');
    expect(solo?.querySelector('.gcount')?.textContent).toBe('1');
  });

  it('splits distinct relationship types into separate counted groups', () => {
    open('#/artifacts/UC-H00', busy);
    const labels = groups().map((g) => g.querySelector('.glabel')?.textContent ?? '');
    expect(labels.some((l) => l.includes('→ primary-actor') && l.includes('Actors'))).toBe(true);
    expect(labels.some((l) => l.includes('→ governed-by') && l.includes('Business Rules'))).toBe(
      true,
    );
    for (const g of groups()) expect(Number(g.querySelector('.gcount')?.textContent)).toBe(1);
  });

  it('group counts sum to exactly the compiled graph edges per direction', () => {
    const graph = compileGraph(busy);
    for (const node of graph.nodes) {
      open(`#/artifacts/${node.id}`, busy);
      const rels = doc.querySelector('#detail .rels');
      const counts = [...(rels?.querySelectorAll('.gcount') ?? [])].map((c) =>
        Number(c.textContent),
      );
      const total = counts.reduce((a, b) => a + b, 0);
      const expected =
        graph.edges.filter((e) => e.from === node.id).length +
        graph.edges.filter((e) => e.to === node.id).length;
      expect(total, `totals for ${node.id}`).toBe(expected);
    }
  });

  it('starts a group above the threshold collapsed, rendering none of its members', () => {
    open('#/artifacts/BR-H', busy);
    // BR-H is referenced by 12 use cases via governed-by; a single group, but above the threshold.
    const detail = doc.getElementById('detail');
    const collapsed = detail?.querySelector('details.relgroup:not([open])');
    expect(collapsed).not.toBeNull();
    expect(collapsed?.querySelector('ul.members')).toBeNull();
    expect(collapsed?.querySelector('.gcount')?.textContent).toBe('12');
  });

  it('reveals exactly the counted members when expanded, each selectable', () => {
    open('#/artifacts/BR-H', busy);
    const collapsed = doc.querySelector(
      '#detail details.relgroup:not([open])',
    ) as HTMLDetailsElement;
    const declared = Number(collapsed.querySelector('.gcount')?.textContent);
    collapsed.open = true;
    collapsed.dispatchEvent(new dom.window.Event('toggle'));
    const members = collapsed.querySelectorAll('ul.members li');
    expect(members.length).toBe(declared);
    for (const li of members) {
      expect(li.querySelector('a')?.getAttribute('href')).toMatch(/^#\/artifacts\/UC-H\d\d$/);
    }
  });

  it('keeps small groups open so nothing is hidden without reason', () => {
    open('#/artifacts/UC-H00', busy);
    for (const g of groups()) {
      if (Number(g.querySelector('.gcount')?.textContent) <= 8) {
        expect((g as HTMLDetailsElement).open).toBe(true);
        expect(g.querySelector('ul.members')).not.toBeNull();
      }
    }
  });

  it('makes every relationship reachable as text, including after expansion', () => {
    const graph = compileGraph(busy);
    open('#/artifacts/BR-H', busy);
    for (const g of doc.querySelectorAll('#detail details.relgroup')) {
      const d = g as HTMLDetailsElement;
      d.open = true;
      d.dispatchEvent(new dom.window.Event('toggle'));
    }
    const hrefs = [...doc.querySelectorAll('#detail .rels a')].map((a) => a.getAttribute('href'));
    const expected = graph.edges
      .filter((e) => e.from === 'BR-H' || e.to === 'BR-H')
      .map((e) => `#/artifacts/${e.from === 'BR-H' ? e.to : e.from}`);
    for (const href of expected) expect(hrefs).toContain(href);
  });

  it('escapes related-artifact titles rendered from the embedded data', () => {
    const nasty = [
      artifact(
        'ACT-X',
        'actor',
        { 'actor-kind': 'human' },
        { body: '## Purpose\n\nx.', title: hostile },
      ),
      artifact('UC-X', 'use-case', { 'primary-actor': 'ACT-X' }),
    ];
    open('#/artifacts/UC-X', nasty);
    const rels = doc.querySelector('#detail .rels');
    expect(rels?.querySelector('script')).toBeNull();
    expect(rels?.textContent).toContain('<script>alert(1)</script>');
  });

  it('exposes expanded state as state, not appearance', () => {
    open('#/artifacts/BR-H', busy);
    const d = doc.querySelector('#detail details.relgroup') as HTMLDetailsElement;
    // <details> reports expansion natively; assistive technology reads it without an ARIA attribute.
    expect(d.tagName.toLowerCase()).toBe('details');
    expect(d.querySelector('summary')).not.toBeNull();
    expect(d.open).toBe(false);
    d.open = true;
    expect(d.open).toBe(true);
  });

  it('still reports both directions as empty for an isolated artifact', () => {
    open('#/artifacts/CON-A', model);
    expect(doc.querySelectorAll('#detail .rels p.none').length).toBe(2);
  });
});

describe('ranked search', () => {
  let dom: JSDOM;
  let doc: Document;

  /**
   * A model built to expose ranking: "product" appears in several titles, in one identifier prefix,
   * and in many bodies. Document order puts the body-only matches first, which is exactly the failure
   * the previous implementation had.
   */
  const ranked = [
    artifact(
      'ACT-ALPHA',
      'actor',
      { 'actor-kind': 'human' },
      {
        title: 'Alpha operator',
        body: '## Purpose\n\nMentions product repeatedly: product, product, product.',
      },
    ),
    artifact(
      'ACT-BETA',
      'actor',
      { 'actor-kind': 'human' },
      {
        title: 'Beta operator',
        body: '## Purpose\n\nAlso mentions product in its body only.',
      },
    ),
    artifact(
      'TERM-PRODUCT',
      'domain-term',
      { 'defined-in': 'BC-Z' },
      {
        title: 'Product Snapshot',
        body: '## Definition\n\nA projection.',
      },
    ),
    artifact(
      'BC-Z',
      'bounded-context',
      {},
      {
        title: 'Zeta context',
        body: '## Responsibility\n\nThe product definition lives here.',
      },
    ),
    artifact(
      'UC-PRODUCT-READ',
      'use-case',
      { 'primary-actor': 'ACT-ALPHA' },
      {
        title: 'Read the catalogue',
        body: '## Goal\n\nNothing relevant.',
      },
    ),
    artifact(
      'FR-NAMED',
      'functional-requirement',
      { 'derived-from': ['UC-PRODUCT-READ'] },
      {
        title: 'A requirement about the product model',
        body: '## Requirement\n\nUnrelated text.',
      },
    ),
  ];

  const open = (artifacts = ranked): void => {
    dom = new JSDOM(build(artifacts), {
      url: 'https://snapshot.invalid/snapshot.html#/artifacts',
      runScripts: 'dangerously',
    });
    doc = dom.window.document;
  };
  const type = (q: string): void => {
    const input = doc.getElementById('q-body') as HTMLInputElement;
    input.value = q;
    input.dispatchEvent(new dom.window.Event('input'));
  };
  const ids = (): string[] =>
    [...doc.querySelectorAll('#q-body-results li[data-id]')].map(
      (li) => li.getAttribute('data-id') ?? '',
    );
  const status = (): string => doc.getElementById('q-body-status')?.textContent ?? '';
  const key = (k: string): void => {
    const input = doc.getElementById('q-body') as HTMLInputElement;
    input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: k, bubbles: true }));
  };

  beforeEach(() => open());

  it('puts an exact identifier match first', () => {
    type('TERM-PRODUCT');
    expect(ids()[0]).toBe('TERM-PRODUCT');
  });

  it('ranks identifier prefix above titles, and titles above body-only matches', () => {
    type('product');
    const order = ids();
    // TERM-PRODUCT's title starts with "Product" — a prefix-title match, tier 3 of the five.
    // UC-PRODUCT-READ matches only as an identifier substring, which is not a prefix, so it sits in
    // the substring tier below it. FR-NAMED's title contains "product" further in, same tier.
    expect(order.indexOf('TERM-PRODUCT')).toBeLessThan(order.indexOf('UC-PRODUCT-READ'));
    expect(order.indexOf('TERM-PRODUCT')).toBeLessThan(order.indexOf('FR-NAMED'));
    // Both title matches outrank the artifacts matched only in their bodies.
    expect(order.indexOf('FR-NAMED')).toBeLessThan(order.indexOf('ACT-ALPHA'));
    expect(order.indexOf('FR-NAMED')).toBeLessThan(order.indexOf('BC-Z'));
  });

  it('no longer buries title matches under body matches, the failure that motivated the slice', () => {
    type('product');
    const order = ids();
    // Document order would have put ACT-ALPHA and ACT-BETA first; ranking must not.
    expect(order[0]).not.toBe('ACT-ALPHA');
    expect(order[0]).not.toBe('ACT-BETA');
    for (const titled of ['TERM-PRODUCT', 'FR-NAMED']) {
      expect(order.indexOf(titled)).toBeLessThan(order.indexOf('ACT-ALPHA'));
    }
  });

  it('matches by artifact kind', () => {
    type('Domain Terms');
    expect(ids()).toContain('TERM-PRODUCT');
  });

  it('shows a snippet for body matches only, containing the phrase', () => {
    type('mentions product repeatedly');
    const li = doc.querySelector('#q-body-results li[data-id="ACT-ALPHA"]');
    // The snippet preserves the body's original casing; the match itself is case-insensitive.
    expect(li?.querySelector('.snippet')?.textContent?.toLowerCase()).toContain(
      'mentions product repeatedly',
    );
    type('TERM-PRODUCT');
    const exact = doc.querySelector('#q-body-results li[data-id="TERM-PRODUCT"]');
    expect(exact?.querySelector('.snippet')).toBeNull();
  });

  it('keeps snippets as text when the body contains markup-like content', () => {
    const nasty = [
      artifact(
        'ACT-N',
        'actor',
        { 'actor-kind': 'human' },
        {
          body: `## Purpose\n\nfindme ${hostile}`,
        },
      ),
    ];
    open(nasty);
    type('findme');
    const snippet = doc.querySelector('#q-body-results .snippet');
    expect(snippet?.querySelector('script')).toBeNull();
    expect(snippet?.textContent).toContain('<script>alert(1)</script>');
  });

  it('reports the total match count and never omits a higher-ranked match', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      artifact(
        `UC-M${String(i).padStart(2, '0')}`,
        'use-case',
        { 'primary-actor': 'ACT-ALPHA' },
        {
          title: `Case ${i}`,
          body: '## Goal\n\nwidget appears in every body.',
        },
      ),
    ).concat(ranked);
    open(many);
    type('widget');
    expect(status()).toMatch(/40 matches · showing the top 25/);
    expect(ids().length).toBe(25);
  });

  it('states the count plainly when nothing is truncated', () => {
    type('TERM-PRODUCT');
    expect(status()).toBe('1 match');
  });

  it('names the query when nothing matches', () => {
    type('zzz-nothing-here');
    expect(status()).toContain('zzz-nothing-here');
    expect(doc.querySelector('#q-body-results .empty')?.textContent).toContain('zzz-nothing-here');
    expect(ids().length).toBe(0);
  });

  it('moves an active marker with the arrow keys and reports it to assistive technology', () => {
    type('product');
    const input = doc.getElementById('q-body') as HTMLInputElement;
    expect(input.getAttribute('aria-activedescendant')).toBeNull();
    key('ArrowDown');
    const first = doc.querySelector('#q-body-results li[data-active="true"]');
    expect(first?.getAttribute('data-id')).toBe(ids()[0]);
    expect(input.getAttribute('aria-activedescendant')).toBe(first?.id);
    key('ArrowDown');
    expect(
      doc.querySelector('#q-body-results li[data-active="true"]')?.getAttribute('data-id'),
    ).toBe(ids()[1]);
    key('ArrowUp');
    expect(
      doc.querySelector('#q-body-results li[data-active="true"]')?.getAttribute('data-id'),
    ).toBe(ids()[0]);
  });

  it('commits the active result with Enter, moving the single selection', () => {
    type('product');
    key('ArrowDown');
    const target = ids()[0];
    key('Enter');
    expect(dom.window.location.hash).toBe(`#/artifacts/${target}`);
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    expect(doc.querySelector('#detail h3.artifact')).not.toBeNull();
  });

  it('clears with Escape without discarding the selected artifact', () => {
    dom.window.location.hash = '#/artifacts/BC-Z';
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    type('product');
    expect(ids().length).toBeGreaterThan(0);
    key('Escape');
    expect(ids().length).toBe(0);
    expect(status()).toBe('');
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe('Zeta context');
  });

  it('orders identically for identical model content', () => {
    type('product');
    const first = ids();
    open();
    type('product');
    expect(ids()).toEqual(first);
  });

  it('finds body text wherever the renderer put it, and decodes escaped entities', () => {
    const varied = [
      artifact(
        'ACT-V',
        'actor',
        { 'actor-kind': 'human' },
        {
          body: [
            '## Purpose',
            '',
            'A paragraph with **bold** and `inlinecode` words.',
            '',
            '- a bullet containing bulletword',
            '',
            '```',
            'fenced fencedword here',
            '```',
            '',
            'And an escaped tag: <div class="x"> stays text.',
          ].join('\n'),
        },
      ),
    ];
    // The index strips the renderer's tags textually rather than parsing the DOM, so every one of
    // these has to remain findable — including content inside headings, lists and code fences.
    for (const needle of ['Purpose', 'bold', 'inlinecode', 'bulletword', 'fencedword']) {
      open(varied);
      type(needle);
      expect(ids(), `searching for ${needle}`).toContain('ACT-V');
    }
    // Escaped entities are decoded, so authored markup is searchable as the text the author wrote.
    open(varied);
    type('<div class="x">');
    expect(ids()).toContain('ACT-V');
  });

  it('does not glue adjacent words together when stripping tags', () => {
    const adjacent = [
      artifact(
        'ACT-G',
        'actor',
        { 'actor-kind': 'human' },
        {
          body: '## Purpose\n\nOne **two** three and `four` five.',
        },
      ),
    ];
    open(adjacent);
    // "One two three" must still read as separate words after the <strong> around "two" is removed.
    type('one two three');
    expect(ids()).toContain('ACT-G');
    type('four five');
    expect(ids()).toContain('ACT-G');
  });

  it('exposes the results as a listbox described by the status line', () => {
    const input = doc.getElementById('q-body') as HTMLInputElement;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-controls')).toBe('q-body-results');
    expect(input.getAttribute('aria-describedby')).toBe('q-body-status');
    expect(doc.getElementById('q-body-results')?.getAttribute('role')).toBe('listbox');
    expect(doc.getElementById('q-body-status')?.getAttribute('aria-live')).toBe('polite');
  });
});
