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

function styleOf(html: string): string {
  return html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'));
}

/** The custom properties one appearance declares, by name. */
function tokens(css: string, appearance: 'light' | 'dark'): Record<string, string> {
  const block =
    appearance === 'light'
      ? /:root \{([^}]*)\}/.exec(css)?.[1]
      : /:root\[data-appearance='dark'\] \{([^}]*)\}/.exec(css)?.[1];
  const out: Record<string, string> = {};
  for (const m of (block ?? '').matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim();
  // Typography and layout tokens do not vary by appearance.
  for (const shared of ['sans', 'mono', 'master-w', 'topo-w']) delete out[shared];
  return out;
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

  it('declares a light and a dark appearance, following the environment unless the address chooses', () => {
    const html = build();
    const css = styleOf(html);
    expect(css).toContain('color-scheme: light');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(":root:not([data-appearance='light'])");
    expect(css).toContain(":root[data-appearance='dark']");
    expect(css).toContain('color-scheme: dark');
    // Exactly one appearance control, with the three choices.
    const opening = openingDocument(html);
    expect([...opening.matchAll(/aria-label="Appearance"/g)].length).toBe(1);
    const choices = [...opening.matchAll(/data-appearance-set="([a-z]+)"/g)].map((m) => m[1]);
    expect(choices).toEqual(['light', 'dark', 'auto']);
  });

  it('gives every colour token a value in both appearances', () => {
    const css = styleOf(build());
    const light = tokens(css, 'light');
    const dark = tokens(css, 'dark');
    expect(Object.keys(light).length).toBeGreaterThan(20);
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
    // No literal colour outside the token blocks: every rule refers to the tokens.
    const outside = css
      .replace(/:root[^{]*\{[^}]*\}/g, '')
      .replace(/@media \(prefers-color-scheme: dark\) \{[^]*?\}\s*\}/, '');
    expect(outside.match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([]);
  });

  it('respects a reduced-motion preference', () => {
    expect(build()).toContain('@media (prefers-reduced-motion: reduce)');
  });

  /* A malformed block does not fail loudly: the browser folds it into the next rule's selector
     and drops both, which is how the topology frame and its focus ring once vanished unnoticed. */
  it('has a stylesheet in which every block is a well-formed rule', () => {
    const html = build();
    const css = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'));
    const problems: string[] = [];
    let depth = 0;
    let prelude = '';
    for (const ch of css) {
      if (ch === '{') {
        const selector = prelude.trim();
        if (!selector || selector.includes(';') || selector.endsWith(',')) problems.push(selector);
        depth += 1;
        prelude = '';
      } else if (ch === '}') {
        if (depth === 0) problems.push(`unbalanced close after: ${prelude.trim()}`);
        depth = Math.max(0, depth - 1);
        prelude = '';
      } else if (ch === ';') {
        prelude = '';
      } else {
        prelude += ch;
      }
    }
    expect(depth).toBe(0);
    expect(problems).toEqual([]);
    const sheet = new JSDOM(html).window.document.styleSheets[0]!;
    const selectors = [...sheet.cssRules].map((r) => (r as CSSStyleRule).selectorText);
    for (const wanted of [
      ':focus-visible',
      '.canvas line.edge',
      'button.tg',
      '.members-pop',
      "#artifact-list a[aria-current='true']",
    ]) {
      expect(selectors).toContain(wanted);
    }
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
  it('states identity, revision and totals without exposing the whole product model', () => {
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
    expect(opening).toContain('class="skip"');
    const levels = [...opening.matchAll(/<h([1-6])[ >]/g)].map((m) => Number(m[1]));
    expect(levels[0]).toBe(1);
    let previous = levels[0] ?? 1;
    for (const level of levels) {
      expect(level - previous).toBeLessThanOrEqual(1);
      previous = level;
    }
  });

  it('marks the active view with aria-current and names every control', () => {
    const opening = openingDocument(build());
    expect(opening).toContain('data-view="overview" aria-current="page"');
    expect(opening).toContain('for="q-body"');
    expect(opening).toContain('id="q-body"');
    // Every button whose visible content is an icon carries a name stating what it does.
    const buttons = [...opening.matchAll(/<button\b[^>]*>(.*?)<\/button>/g)];
    expect(buttons.length).toBeGreaterThan(0);
    for (const [whole, inner] of buttons) {
      const visibleText = (inner ?? '').replace(/<[^>]*>/g, '').trim();
      if (!visibleText) expect(whole, whole).toMatch(/aria-label="[^"]+"/);
    }
  });

  it('meets WCAG 2.1 AA contrast for every text-and-background pair, in both appearances', () => {
    const css = styleOf(build());
    const luminance = (hex: string): number => {
      const parts = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const linear = parts.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
    };
    const ratio = (a: string, b: string): number => {
      const [x, y] = [luminance(a), luminance(b)];
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    for (const appearance of ['light', 'dark'] as const) {
      const t = tokens(css, appearance);
      const surfaces = ['bg', 'panel', 'raise', 'accent-soft'].map((s) => t[s]!);
      for (const name of ['ink', 'text', 'muted', 'accent']) {
        for (const behind of surfaces) {
          expect(
            ratio(t[name]!, behind),
            `${appearance} --${name} on ${behind}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(
        ratio(t['accent-ink']!, t['accent']!),
        `${appearance} accent ink`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t['bg']!, t['ink']!), `${appearance} toast`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t['text']!, t['mark']!), `${appearance} highlight`).toBeGreaterThanOrEqual(4.5);
      // Every kind colour is used as text on every surface of its appearance.
      const kinds = Object.entries(t).filter(([name]) => name.startsWith('k-'));
      expect(kinds.length).toBe(10);
      for (const [name, hex] of kinds) {
        for (const behind of surfaces) {
          expect(ratio(hex, behind), `${appearance} ${name} on ${behind}`).toBeGreaterThanOrEqual(
            4.5,
          );
        }
      }
      // Status badges: each foreground on its own fill.
      for (const status of ['active', 'draft', 'deprecated', 'retired']) {
        expect(
          ratio(t[`st-${status}-fg`]!, t[`st-${status}-bg`]!),
          `${appearance} ${status}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('never carries kind or status by colour alone', () => {
    const data = embeddedData(build()) as unknown as { kindTokens: Record<string, string> };
    // Every kind has a text token, and status badges render their status as text.
    for (const token of Object.values(data.kindTokens)) expect(token).toMatch(/^[A-Z]{2,4}$/);
    // Kind tokens accompany every kind in the opening document, as text; the icon joins them at
    // start-up, and status text is rendered with the badge on demand (asserted in the DOM suite).
    expect(openingDocument(build())).toMatch(/class="token k-actor" data-kind="actor"[^>]*>ACT</);
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
    expect(doc.getElementById('view-graph')).toBeNull();
    expect(doc.getElementById('needs-script')).toBeNull();
  });

  it('renders the artifact list on demand, grouped by kind, with every artifact selectable', () => {
    navigate('#/artifacts');
    expect(visible('artifacts')).toBe(true);
    // One closed, counted group per kind; opening each reaches every artifact of the model.
    const heads = () => [...doc.querySelectorAll('#artifact-list .khead')] as HTMLButtonElement[];
    expect(heads().map((h) => h.getAttribute('data-group'))).toEqual([
      'actor',
      'journey',
      'use-case',
      'functional-requirement',
      'constraint',
    ]);
    expect(heads().every((h) => h.getAttribute('aria-expanded') === 'false')).toBe(true);
    for (const kind of ['actor', 'journey', 'use-case', 'functional-requirement', 'constraint']) {
      (
        doc.querySelector(`#artifact-list .khead[data-group="${kind}"]`) as HTMLButtonElement
      ).click();
    }
    const links = [...doc.querySelectorAll('#artifact-list a')].map((a) => a.getAttribute('href'));
    for (const id of ['ACT-A', 'UC-A', 'JRN-A', 'FR-A', 'CON-A']) {
      expect(links).toContain(`#/artifacts/${id}`);
    }
    expect(heads().every((h) => h.getAttribute('aria-expanded') === 'true')).toBe(true);
    expect(doc.getElementById('list-counts')?.getAttribute('title')).toBe('5 artifacts');
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
    const headings = [...(rels?.querySelectorAll('h5') ?? [])].map(
      (h) => h.firstChild?.textContent,
    );
    expect(headings).toEqual(['Declares (references)', 'Referenced by (derived)']);
    // Each direction states its total.
    const totals = [...(rels?.querySelectorAll('h5 .total') ?? [])].map((s) => s.textContent);
    expect(totals).toEqual(['1', '2']);
    // Relationship type and direction are carried by each group's label, which every entry sits
    // under — including the single-group case, which renders the label without a disclosure.
    const labels = [...(rels?.querySelectorAll('.glabel') ?? [])].map((l) => ({
      dir: l.querySelector('.dir')?.textContent,
      verb: l.querySelector('.verb')?.textContent,
      type: l.querySelector('.verb')?.getAttribute('title'),
    }));
    expect(labels).toContainEqual({ dir: '→', verb: 'primary actor', type: 'primary-actor' });
    expect(labels).toContainEqual({ dir: '←', verb: 'derived from', type: 'derived-from' });
    expect(labels).toContainEqual({ dir: '←', verb: 'steps · use case', type: 'steps[].use-case' });
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

  it('names the current view in the document title, so tabs and history stay distinguishable', () => {
    expect(doc.title).toBe('Product Snapshot');
    navigate('#/artifacts/UC-A');
    expect(doc.title).toBe('UC-A UC-A · Product Snapshot');
    navigate('#/artifacts');
    expect(doc.title).toBe('Artifacts · Product Snapshot');
    navigate('#/artifacts/UC-NOPE');
    expect(doc.title).toBe('UC-NOPE not found · Product Snapshot');
  });

  it('states the topology gestures on screen rather than leaving them to be discovered', () => {
    load('#/artifacts/UC-A');
    expect(doc.querySelector('#graph-host .ghint')?.textContent).toContain('Select a group');
    expect(doc.querySelector('#graph-host .ghint')?.textContent).toContain('Esc');
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
    navigate('#/');
    expect(doc.querySelector('nav.views a[aria-current="page"]')?.getAttribute('data-view')).toBe(
      'overview',
    );
  });

  it('builds a projection only when that view is opened', () => {
    expect(doc.querySelector('#graph-host svg')).toBeNull();
    navigate('#/graph/focus/UC-A');
    expect(doc.querySelector('#graph-host svg')).not.toBeNull();
  });

  it('filters the list by kind, status and text without losing the selection', () => {
    navigate('#/artifacts/UC-A');
    // Narrow from the search dialog's chips: the narrowing is shared with the list.
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    (
      doc.querySelector('#find-chips [data-narrow="k"][data-value="actor"]') as HTMLButtonElement
    ).click();
    (doc.getElementById('find-close') as HTMLButtonElement).click();
    const links = [...doc.querySelectorAll('#artifact-list a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['#/artifacts/ACT-A?k=actor']);
    expect(doc.getElementById('list-counts')?.textContent).toBe('1 of 5');
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe('UC-A');
    // The narrowing is named beside the list and removable in one step.
    const chip = doc.querySelector('#list-chips [data-clear="k"]') as HTMLButtonElement;
    expect(chip.textContent).toContain('Kind: Actors');
    chip.click();
    expect(doc.getElementById('list-chips')?.hidden).toBe(true);
    expect(doc.getElementById('list-counts')?.textContent).toBe('5');
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe('UC-A');
  });

  it('still narrows by a name-or-identifier filter carried by an older address', () => {
    load('#/artifacts?s=draft&f=UC');
    const chips = [...doc.querySelectorAll('#list-chips .chip')].map((c) => c.textContent);
    expect(chips).toEqual(['Status: draft', 'Name or ID: “UC”']);
    expect([...doc.querySelectorAll('#artifact-list a .aid')].map((a) => a.textContent)).toEqual([
      'UC-A',
    ]);
    (doc.querySelector('#list-chips [data-clear="all"]') as HTMLButtonElement).click();
    expect(doc.querySelectorAll('#list-chips .chip').length).toBe(0);
    expect(dom.window.location.hash).toBe('#/artifacts');
  });

  it('says so when a filter matches nothing', () => {
    navigate('#/artifacts?f=zzz-nothing');
    expect(doc.querySelector('#artifact-list .empty')?.textContent).toContain(
      'No artifact matches',
    );
  });

  it('searches content offline and reports when nothing matches', () => {
    navigate('#/artifacts');
    (doc.getElementById('find-open') as HTMLButtonElement).click();
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
  /** A label as its facts: direction glyph, raw relationship type, other-end kind. */
  const facts = (label: Element | null | undefined): string =>
    label
      ? `${label.querySelector('.dir')?.textContent} ${label.querySelector('.verb')?.getAttribute('title')} ${label.querySelector('.of')?.textContent}`
      : '';

  it('groups a direction by relationship type and artifact kind, with exact counts', () => {
    open('#/artifacts/ACT-H', busy);
    // ACT-H is referenced by 12 use cases via primary-actor: one group, above the threshold, so it
    // presents as a collapsed disclosure carrying the label and the count.
    const label = doc.querySelector('#detail .glabel');
    expect(facts(label)).toBe('← primary-actor Use Cases');
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
    expect(facts(solo)).toBe('→ primary-actor Actors');
    expect(solo?.querySelector('.gcount')?.textContent).toBe('1');
  });

  it('splits distinct relationship types into separate counted groups', () => {
    open('#/artifacts/UC-H00', busy);
    const labels = groups().map((g) => facts(g.querySelector('.glabel')));
    expect(labels).toContain('→ primary-actor Actors');
    expect(labels).toContain('→ governed-by Business Rules');
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
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    type('product');
    // While the dialog is open its query is part of the address.
    expect(dom.window.location.hash).toBe('#/artifacts?q=product');
    key('ArrowDown');
    const target = ids()[0];
    key('Enter');
    // Opening a result is a navigation to it; the query stays behind in the previous entry.
    expect(dom.window.location.hash).toBe(`#/artifacts/${target}`);
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    expect(doc.querySelector('#detail h3.artifact')).not.toBeNull();
    expect(doc.getElementById('find')?.hidden).toBe(true);
    // Returning to the entry that held the query resumes the search in progress.
    dom.window.location.hash = '#/artifacts?q=product';
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    expect(doc.getElementById('find')?.hidden).toBe(false);
    expect((doc.getElementById('q-body') as HTMLInputElement).value).toBe('product');
    expect(ids()).toContain(target);
  });

  it('clears with Escape without discarding the selected artifact', () => {
    dom.window.location.hash = '#/artifacts/BC-Z';
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    type('product');
    expect(ids().length).toBeGreaterThan(0);
    key('Escape');
    expect(doc.getElementById('find')?.hidden).toBe(true);
    expect(dom.window.location.hash).toBe('#/artifacts/BC-Z');
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe('Zeta context');
    // Reopening starts from an empty query.
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    expect(ids().length).toBe(0);
    expect(status()).toBe('');
  });

  it('opens from every view by control and shortcut, focused, and returns focus on dismissal', () => {
    const dialog = () => doc.getElementById('find') as HTMLElement;
    const press = (k: string, mods: KeyboardEventInit = {}): void => {
      doc.body.dispatchEvent(
        new dom.window.KeyboardEvent('keydown', { key: k, bubbles: true, ...mods }),
      );
    };
    for (const hash of ['#/', '#/artifacts', '#/artifacts/BC-Z']) {
      dom.window.location.hash = hash;
      dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
      const opener = doc.getElementById('find-open') as HTMLButtonElement;
      opener.focus();
      opener.click();
      expect(dialog().hidden, `control on ${hash}`).toBe(false);
      expect(doc.activeElement?.id).toBe('q-body');
      key('Escape');
      expect(dialog().hidden).toBe(true);
      expect(doc.activeElement).toBe(opener);
      press('/');
      expect(dialog().hidden, `/ on ${hash}`).toBe(false);
      key('Escape');
      press('k', { ctrlKey: true });
      expect(dialog().hidden, `Ctrl+K on ${hash}`).toBe(false);
      key('Escape');
    }
    // Opening search never changes the selection or the view.
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe('Zeta context');
    // The dialog states its shortcuts, and the header control states them to assistive technology.
    expect(doc.getElementById('find-open')?.getAttribute('aria-keyshortcuts')).toBe('/ Control+K');
    expect(doc.getElementById('keys')?.textContent).toContain('Search the product');
  });

  it('ranks within the narrowing applied where the query is typed', () => {
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    type('product');
    const all = ids();
    (
      doc.querySelector('#find-chips [data-narrow="k"][data-value="actor"]') as HTMLButtonElement
    ).click();
    const narrowed = ids();
    expect(narrowed).toEqual(all.filter((id) => id.startsWith('ACT-')));
    expect(dom.window.location.hash).toBe('#/artifacts?k=actor&q=product');
    // The same chip clears it again.
    (
      doc.querySelector('#find-chips [data-narrow="k"][data-value="actor"]') as HTMLButtonElement
    ).click();
    expect(ids()).toEqual(all);
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

describe('graph projections', () => {
  let dom: JSDOM;
  let doc: Document;

  /** Twelve use cases on one actor and rule: a hub with several group types in both directions. */
  const busy = [
    artifact('ACT-H', 'actor', { 'actor-kind': 'human' }, { body: '## Purpose\n\nA hub.' }),
    artifact('BR-H', 'business-rule', {}, { body: '## Rule\n\nA rule.' }),
    artifact(
      'TERM-H',
      'domain-term',
      { 'defined-in': 'BC-H' },
      { body: '## Definition\n\nA term.' },
    ),
    artifact('BC-H', 'bounded-context', {}, { body: '## Responsibility\n\nA context.' }),
    artifact('JRN-H', 'journey', { 'primary-actor': 'ACT-H', steps: [{ 'use-case': 'UC-H00' }] }),
    artifact('QR-H', 'quality-requirement', { 'applies-to': ['UC-H00'] }),
    artifact('CON-H', 'constraint', { 'applies-to': ['BC-H'] }),
    ...Array.from({ length: 12 }, (_, i) =>
      artifact(`UC-H${String(i).padStart(2, '0')}`, 'use-case', {
        'primary-actor': 'ACT-H',
        'governed-by': ['BR-H'],
        'uses-terms': ['TERM-H'],
        'bounded-context': 'BC-H',
      }),
    ),
    artifact('FR-H', 'functional-requirement', { 'derived-from': ['UC-H00'] }),
  ];

  /** BC-PRODUCT-DEFINITION's shape: five incoming groups of very different sizes, nothing declared. */
  const fiveGroups = [
    artifact('BC-X', 'bounded-context', {}, { body: '## Responsibility\n\nA hub context.' }),
    ...Array.from({ length: 12 }, (_, i) =>
      artifact(`UC-X${String(i).padStart(2, '0')}`, 'use-case', {
        'primary-actor': 'ACT-X',
        'bounded-context': 'BC-X',
      }),
    ),
    ...Array.from({ length: 5 }, (_, i) =>
      artifact(`BR-X${i}`, 'business-rule', { 'applies-to': ['BC-X'] }),
    ),
    ...Array.from({ length: 2 }, (_, i) =>
      artifact(`CON-X${i}`, 'constraint', { 'applies-to': ['BC-X'] }),
    ),
    artifact('QR-X0', 'quality-requirement', { 'applies-to': ['BC-X'] }),
    ...Array.from({ length: 7 }, (_, i) =>
      artifact(`TERM-X${i}`, 'domain-term', { 'defined-in': 'BC-X' }),
    ),
    artifact('ACT-X', 'actor', { 'actor-kind': 'human' }),
  ];

  /** Open at a given pane width: the test DOM has no layout, so the pane reports the width asked. */
  const open = (hash: string, artifacts = busy, width?: number): void => {
    dom = new JSDOM(build(artifacts), {
      url: `https://snapshot.invalid/snapshot.html${hash}`,
      runScripts: 'dangerously',
      beforeParse(window) {
        if (width === undefined) return;
        Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
          configurable: true,
          get(this: HTMLElement) {
            return this.id === 'graph-host' ? width : 0;
          },
        });
      },
    });
    doc = dom.window.document;
  };
  const chips = (): HTMLButtonElement[] =>
    [...doc.querySelectorAll('#graph-host button.tg')] as HTMLButtonElement[];
  const box = (n: Element): { x: number; y: number; w: number; h: number } => {
    const s = (n as HTMLElement).style;
    return {
      x: parseFloat(s.left),
      y: parseFloat(s.top),
      w: parseFloat(s.width) || 232,
      h: parseFloat(s.height) || 60,
    };
  };
  const anchor = (): Element => doc.querySelector('#graph-host .anode')!;
  const click = (n: Element): void => {
    n.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  };

  it('surrounds the anchor with relationship groups, not artifacts, each stating type, kind and count', () => {
    open('#/artifacts/UC-H00');
    // UC-H00 declares 4 groups (primary-actor, governed-by, uses-terms, bounded-context) and is
    // referenced by 3 (steps, applies-to, derived-from).
    expect(chips().length).toBe(7);
    for (const chip of chips()) {
      expect(chip.getAttribute('aria-label')).toMatch(
        /^(Declares|Referenced by) \d+ .+ through [a-z[\].-]+$/,
      );
      expect(Number(chip.querySelector('.gcount')?.textContent)).toBeGreaterThan(0);
      expect(chip.querySelector('.verb')?.textContent).not.toBe('');
      expect(chip.querySelector('.token[data-kind]')).not.toBeNull();
    }
  });

  it('keeps the projection bounded by relationship types, not by degree', () => {
    open('#/artifacts/BC-X', fiveGroups);
    // 27 relationships, 5 groups: one chip per group, however many members each holds.
    expect(chips().length).toBe(5);
    const counts = chips().map((c) => Number(c.querySelector('.gcount')?.textContent));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(27);
  });

  it('places declared groups above the anchor and referencing groups below, so direction is positional', () => {
    open('#/artifacts/UC-H00');
    const a = box(anchor());
    for (const chip of chips()) {
      const b = box(chip);
      if (chip.getAttribute('aria-label')!.startsWith('Declares'))
        expect(b.y + b.h).toBeLessThan(a.y);
      else expect(b.y).toBeGreaterThan(a.y + a.h);
    }
    // Every group is joined to the anchor by a directed line of its own.
    const lines = [...doc.querySelectorAll('#graph-host .canvas > svg line.edge')];
    expect(lines.length).toBe(7);
    for (const line of lines) expect(line.getAttribute('marker-end')).toBe('url(#topo-arrow)');
  });

  it('draws straight lines from one anchor port each, with every arrow following the relationship', () => {
    for (const [hash, artifacts, width] of [
      ['#/artifacts/BC-X', fiveGroups, 420],
      ['#/artifacts/BC-X', fiveGroups, 900],
      ['#/artifacts/UC-H00', busy, 900],
      ['#/artifacts/ACT-H', busy, 260],
    ] as const) {
      open(hash, [...artifacts], width);
      const a = box(anchor());
      const groups = chips().map((c) => ({ key: c.getAttribute('data-key'), ...box(c) }));
      const lines = [...doc.querySelectorAll('#graph-host .canvas > svg line.edge')].map((l) => ({
        out: l.classList.contains('out'),
        key: l.getAttribute('data-key'),
        port: Number(l.getAttribute('data-port')),
        x1: Number(l.getAttribute('x1')),
        y1: Number(l.getAttribute('y1')),
        x2: Number(l.getAttribute('x2')),
        y2: Number(l.getAttribute('y2')),
        arrow: l.getAttribute('marker-end'),
      }));
      expect(lines.length).toBe(groups.length);
      for (const side of [true, false]) {
        const own = lines.filter((l) => l.out === side).sort((p, q) => p.port - q.port);
        // One port each, spread along the anchor's edge.
        expect(new Set(own.map((l) => l.port)).size, `${hash} at ${width}`).toBe(own.length);
        for (const l of own) {
          expect(l.port).toBeGreaterThanOrEqual(a.x);
          expect(l.port).toBeLessThanOrEqual(a.x + a.w);
        }
        // Ports run in the order of the groups they reach, so no two lines cross.
        const far = own.map((l) => (l.out ? l.x2 : l.x1));
        expect(far, `${hash} at ${width}`).toEqual([...far].sort((p, q) => p - q));
      }
      for (const l of lines) {
        const g = groups.find((x) => x.key === l.key)!;
        expect(l.arrow).toBe('url(#topo-arrow)');
        if (l.out) {
          // Declared: from the anchor's top edge into the group's bottom edge.
          expect([l.x1, l.y1]).toEqual([l.port, a.y - 1]);
          expect(l.y2).toBe(g.y + g.h + 1);
          expect(l.x2).toBeGreaterThanOrEqual(g.x);
          expect(l.x2).toBeLessThanOrEqual(g.x + g.w);
        } else {
          // Referenced by: from the group's top edge into the anchor's bottom edge.
          expect([l.x2, l.y2]).toEqual([l.port, a.y + a.h + 1]);
          expect(l.y1).toBe(g.y - 1);
          expect(l.x1).toBeGreaterThanOrEqual(g.x);
          expect(l.x1).toBeLessThanOrEqual(g.x + g.w);
        }
      }
    }
  });

  it('never overlaps two groups or leaves the pane, at narrow and wide panes', () => {
    for (const width of [260, 420, 560, 900]) {
      for (const [hash, model] of [
        ['#/artifacts/UC-H00', busy],
        ['#/artifacts/BC-X', fiveGroups],
        ['#/artifacts/ACT-H', busy],
      ] as const) {
        open(hash, [...model], width);
        const boxes = [anchor(), ...chips()].map(box);
        for (const b of boxes) {
          expect(b.x, `${hash} at ${width}`).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w, `${hash} at ${width}`).toBeLessThanOrEqual(Math.max(width, b.w + 28));
        }
        for (let i = 0; i < boxes.length; i += 1) {
          for (let j = i + 1; j < boxes.length; j += 1) {
            const p = boxes[i]!;
            const q = boxes[j]!;
            const apart =
              p.x + p.w <= q.x || q.x + q.w <= p.x || p.y + p.h <= q.y || q.y + q.h <= p.y;
            expect(apart, `${hash} at ${width}: boxes ${i} and ${j} overlap`).toBe(true);
          }
        }
        // The canvas grows to hold its rows; the pane scrolls rather than squeezing them.
        const canvas = doc.querySelector('#graph-host .canvas') as HTMLElement;
        const bottom = Math.max(...boxes.map((b) => b.y + b.h));
        expect(parseFloat(canvas.style.height)).toBeGreaterThan(bottom);
      }
    }
  });

  it('reveals members only on deliberate action, one group at a time, as a structured list', () => {
    open('#/artifacts/BC-X', fiveGroups);
    expect(doc.querySelector('#graph-host .members-pop')).toBeNull();
    const before = dom.window.history.length;
    const uc = chips().find((c) => c.getAttribute('aria-label')!.includes('Use Cases'))!;
    click(uc);
    let list = doc.querySelector('#graph-host .members-pop');
    expect(list?.getAttribute('aria-label')).toBe('bounded context · Use Cases, 12 members');
    expect(list?.querySelectorAll('li a[data-member]').length).toBe(12);
    expect(
      chips()
        .find((c) => c.getAttribute('aria-label')!.includes('Use Cases'))
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
    // Opening another closes the first: at most one member list.
    click(chips().find((c) => c.getAttribute('aria-label')!.includes('Domain Terms'))!);
    list = doc.querySelector('#graph-host .members-pop');
    expect(doc.querySelectorAll('#graph-host .members-pop').length).toBe(1);
    expect(list?.querySelectorAll('li').length).toBe(7);
    // Disclosure is addressed in place, never pushed onto history.
    expect(dom.window.location.hash).toMatch(/^#\/artifacts\/BC-X\?x=\d+$/);
    expect(dom.window.history.length).toBe(before);
    // Escape closes it.
    doc.body.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(doc.querySelector('#graph-host .members-pop')).toBeNull();
    expect(dom.window.location.hash).toBe('#/artifacts/BC-X');
  });

  it('lists exactly the members the compiled graph records, each a link that refocuses', () => {
    const graph = compileGraph(fiveGroups);
    open('#/artifacts/BC-X?x=0', fiveGroups);
    const opened = chips()[0]!;
    const members = [...doc.querySelectorAll('#graph-host .members-pop a[data-member]')].map((a) =>
      a.getAttribute('data-member'),
    );
    expect(members.length).toBe(Number(opened.querySelector('.gcount')?.textContent));
    for (const id of members) {
      expect(graph.edges.some((e) => e.to === 'BC-X' && e.from === id)).toBe(true);
    }
    // A member link names its artifact without the disclosure: refocusing resets it.
    const href = doc.querySelector('#graph-host .members-pop a')?.getAttribute('href') ?? '';
    expect(href).toMatch(/^#\/artifacts\/[A-Z]+-X\d+$/);
  });

  it('corresponds with the Reader: each group highlights its counterpart, both ways', () => {
    open('#/artifacts/UC-H00');
    const chip = chips()[0]!;
    const key = chip.getAttribute('data-key')!;
    chip.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true }));
    const counterpart = [...doc.querySelectorAll('#detail [data-key]')].find(
      (n) => n.getAttribute('data-key') === key,
    );
    expect(counterpart?.classList.contains('hl')).toBe(true);
    doc.getElementById('graph-host')!.dispatchEvent(new dom.window.MouseEvent('mouseleave'));
    expect(counterpart?.classList.contains('hl')).toBe(false);
    counterpart!.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true }));
    expect(chip.classList.contains('hl')).toBe(true);
    // Focus does what pointing does, so the correspondence is not pointer-only.
    doc.getElementById('detail')!.dispatchEvent(new dom.window.MouseEvent('mouseleave'));
    chips()[1]!.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
    expect(chips()[1]!.classList.contains('hl')).toBe(true);
  });

  it('opening a group opens its Reader counterpart when that one starts collapsed', () => {
    open('#/artifacts/ACT-H');
    const reader = doc.querySelector(
      '#detail details.relgroup:not([open])',
    ) as HTMLDetailsElement | null;
    expect(reader).not.toBeNull();
    const key = reader!.getAttribute('data-key');
    const chip = chips().find((c) => c.getAttribute('data-key') === key)!;
    click(chip);
    const again = [...doc.querySelectorAll('#detail details.relgroup')].find(
      (d) => d.getAttribute('data-key') === key,
    ) as HTMLDetailsElement;
    expect(again.open).toBe(true);
    expect(again.querySelectorAll('ul.members li').length).toBe(12);
  });

  it('is keyboard-operable and exposes expanded state as state', () => {
    open('#/artifacts/UC-H00');
    for (const chip of chips()) {
      expect(chip.tagName).toBe('BUTTON');
      expect(chip.getAttribute('aria-expanded')).toBe('false');
    }
    const first = chips()[0]!;
    first.focus();
    click(first);
    expect(chips()[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(doc.activeElement).toBe(chips()[0]);
  });

  it('adjusts the Reader and projection widths by keyboard, storing nothing', () => {
    open('#/artifacts/UC-H00');
    const split = doc.getElementById('split')!;
    expect(split.getAttribute('role')).toBe('separator');
    split.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    const wider = Number(split.getAttribute('aria-valuenow'));
    split.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    split.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(Number(split.getAttribute('aria-valuenow'))).toBeLessThan(wider);
    expect((doc.querySelector('.md') as HTMLElement).style.getPropertyValue('--topo-w')).toMatch(
      /px$/,
    );
    expect(dom.window.localStorage.length).toBe(0);
    expect(dom.window.location.hash).toBe('#/artifacts/UC-H00');
  });

  it('is identical for the same model, focus, open group and width', () => {
    open('#/artifacts/BC-X?x=2', fiveGroups, 480);
    const first = doc.getElementById('graph-host')!.innerHTML;
    open('#/artifacts/BC-X?x=2', fiveGroups, 480);
    expect(doc.getElementById('graph-host')!.innerHTML).toBe(first);
  });

  it('says so plainly for an artifact with no relationships', () => {
    open('#/artifacts/CON-A', model);
    expect(doc.querySelector('#graph-host p.note')?.textContent).toContain(
      'declares no relationships',
    );
  });

  it('never draws a group or relationship absent from the compiled graph', () => {
    const graph = compileGraph(busy);
    for (const id of ['UC-H00', 'ACT-H', 'BC-H']) {
      open(`#/artifacts/${id}`);
      const drawn = chips().reduce(
        (sum, c) => sum + Number(c.querySelector('.gcount')?.textContent),
        0,
      );
      expect(drawn).toBe(graph.edges.filter((e) => e.from === id || e.to === id).length);
    }
  });
});

describe('the overview and the catalog (SLI-EXPLORER-001)', () => {
  let dom: JSDOM;
  let doc: Document;

  const model = [
    artifact('BC-Z', 'bounded-context', {}, { body: '## Responsibility\n\nZone.' }),
    artifact('BC-Y', 'bounded-context', {}, { body: '## Responsibility\n\nYard.' }),
    artifact('ACT-A', 'actor', { 'actor-kind': 'human' }),
    ...Array.from({ length: 4 }, (_, i) =>
      artifact(`UC-Z${i}`, 'use-case', { 'primary-actor': 'ACT-A', 'bounded-context': 'BC-Z' }),
    ),
    ...Array.from({ length: 3 }, (_, i) =>
      artifact(`UC-Y${i}`, 'use-case', { 'primary-actor': 'ACT-A', 'bounded-context': 'BC-Y' }),
    ),
    artifact('JRN-Z', 'journey', {
      'primary-actor': 'ACT-A',
      steps: [{ 'use-case': 'UC-Z2' }, { 'use-case': 'UC-Z0' }],
    }),
    artifact('FR-D', 'functional-requirement', {
      'derived-from': ['UC-Z0'],
      verification: [{ scenario: 'holds' }],
    }),
  ];

  const open = (hash: string, artifacts = model): void => {
    dom = new JSDOM(build(artifacts), {
      url: `https://snapshot.invalid/snapshot.html${hash}`,
      runScripts: 'dangerously',
    });
    doc = dom.window.document;
  };
  const listedIds = (): string[] =>
    [...doc.querySelectorAll('#artifact-list a')].map(
      (a) => (a.getAttribute('href') ?? '').replace(/^#\/artifacts\//, '').split('?')[0] ?? '',
    );
  const chipTexts = (): string[] =>
    [...doc.querySelectorAll('#list-chips .chip')].map((c) => c.textContent ?? '');
  const narrow = (key: string, value: string): void => {
    (
      doc.querySelector(
        `#find-chips [data-narrow="${key}"][data-value="${value}"]`,
      ) as HTMLButtonElement
    ).click();
  };

  it('offers a family entry point per kind from the overview, opening the catalog narrowed', () => {
    open('');
    const links = [...doc.querySelectorAll('.kinds a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('#/artifacts?k=use-case');
    expect(links).toContain('#/artifacts?k=bounded-context');
    dom.window.location.hash = '#/artifacts?k=use-case';
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    expect(new Set(listedIds())).toEqual(
      new Set(['UC-Z0', 'UC-Z1', 'UC-Z2', 'UC-Z3', 'UC-Y0', 'UC-Y1', 'UC-Y2']),
    );
    expect(chipTexts()).toEqual(['Kind: Use Cases']);
  });

  it('keeps global search one gesture from the first screen', () => {
    open('');
    const control = doc.getElementById('ov-find') as HTMLButtonElement;
    expect(control).not.toBeNull();
    control.click();
    expect(doc.getElementById('find')?.hidden).toBe(false);
    expect(doc.activeElement?.id).toBe('q-body');
    const q = doc.getElementById('q-body') as HTMLInputElement;
    q.value = 'UC-Z0';
    q.dispatchEvent(new dom.window.Event('input'));
    expect(dom.window.location.hash).toBe('#/?q=UC-Z0');
    expect(doc.querySelectorAll('#q-body-results li[data-id]').length).toBeGreaterThan(0);
    // The overview stays the view underneath.
    expect(doc.getElementById('view-overview')?.hidden).toBe(false);
  });

  it('re-addresses every narrowing change in place, without growing history', () => {
    open('#/artifacts');
    const before = dom.window.history.length;
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    narrow('k', 'use-case');
    narrow('c', 'BC-Z');
    expect(dom.window.location.hash).toBe('#/artifacts?k=use-case&c=BC-Z');
    expect(dom.window.history.length).toBe(before);
    expect(new Set(listedIds())).toEqual(new Set(['UC-Z0', 'UC-Z1', 'UC-Z2', 'UC-Z3']));
  });

  it('reproduces a query-and-filter state from its address in a fresh window', () => {
    open('#/artifacts?k=use-case&c=BC-Y&s=active');
    expect(new Set(listedIds())).toEqual(new Set(['UC-Y0', 'UC-Y1', 'UC-Y2']));
    expect(chipTexts()).toEqual(['Kind: Use Cases', 'Status: active', 'Context: BC-Y']);
  });

  it('preserves the discovery across opening a result and returning', () => {
    open('#/artifacts?k=use-case&c=BC-Z');
    const link = [...doc.querySelectorAll('#artifact-list a')].find((a) =>
      (a.getAttribute('href') ?? '').includes('UC-Z1'),
    );
    expect(link?.getAttribute('href')).toBe('#/artifacts/UC-Z1?k=use-case&c=BC-Z');
    dom.window.location.hash = link?.getAttribute('href') ?? '';
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toContain('UC-Z1');
    const back = doc.querySelector('.backlink a');
    expect(back?.getAttribute('href')).toBe('#/artifacts?k=use-case&c=BC-Z');
    dom.window.location.hash = back?.getAttribute('href') ?? '';
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    expect(new Set(listedIds())).toEqual(new Set(['UC-Z0', 'UC-Z1', 'UC-Z2', 'UC-Z3']));
  });

  it('offers the bounded-context narrowing only where the model declares one', () => {
    open('#/artifacts');
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    expect(doc.querySelector('#find-chips [data-narrow="c"]')).not.toBeNull();
    const without = [
      artifact('ACT-B', 'actor', { 'actor-kind': 'human' }),
      artifact('BR-B', 'business-rule', {}),
    ];
    open('#/artifacts', without);
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    expect(doc.querySelector('#find-chips [data-narrow="c"]')).toBeNull();
  });

  it('invents no filterable property beyond the canonical fields', () => {
    open('#/artifacts');
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    const keys = new Set(
      [...doc.querySelectorAll('#find-chips [data-narrow]')].map((c) =>
        c.getAttribute('data-narrow'),
      ),
    );
    for (const key of keys) expect(['k', 's', 'c']).toContain(key);
  });

  it('presents the aggregate as a kind-by-kind grid whose cells sum the aggregate rows', () => {
    const opening = openingDocument(build(model));
    const graph = compileGraph(model);
    const cells = [
      ...opening.matchAll(
        /<td><a href="#\/artifacts\?k=([a-z-]+)"[^>]*aria-label="(\d+) relationships? from ([^"]+) to ([^"]+)">\d+<\/a><\/td>/g,
      ),
    ];
    const total = cells.reduce((sum, m) => sum + Number(m[2]), 0);
    expect(total).toBe(graph.edges.length);
    // Every row kind in the grid opens the catalog on that kind.
    for (const m of cells) expect(opening).toContain(`<a href="#/artifacts?k=${m[1]}"`);
    // Still bounded: the grid lives in the opening document, the table beside it.
    expect(opening).toContain('id="h-grid"');
    expect(opening).toContain('id="h-aggregate"');
  });

  it('offers derived entry points that state what they count and claim no importance', () => {
    open('');
    const entry = doc.getElementById('ov-entry')!;
    const sections = [...entry.querySelectorAll('section')];
    const titles = sections.map((s) => s.querySelector('h4')?.textContent ?? '');
    expect(titles[0]).toContain('Journeys');
    expect(titles[0]).toContain('use cases in step order');
    // The journey's use cases, in the order its steps record them.
    const steps = [...sections[0]!.querySelectorAll('ol.steps a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(steps).toEqual(['#/artifacts/UC-Z2', '#/artifacts/UC-Z0']);
    // Contexts with the exact number of artifacts that reference them.
    const contexts = [...sections[1]!.querySelectorAll('li')].map((li) => [
      li.querySelector('a')?.getAttribute('href'),
      li.querySelector('.n')?.textContent,
    ]);
    expect(contexts).toEqual([
      ['#/artifacts/BC-Y', '3'],
      ['#/artifacts/BC-Z', '4'],
    ]);
    // The most-relationships list states its criterion and shows each count.
    const most = sections[2]!;
    expect(most.querySelector('h4')?.textContent).toContain('ordered by relationship count');
    const counts = [...most.querySelectorAll('li .n')].map((n) => Number(n.textContent));
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(counts[0]).toBe(8);
    for (const word of ['important', 'key', 'central', 'recommended', 'start here', 'priority']) {
      expect(entry.textContent?.toLowerCase()).not.toContain(word);
    }
  });
});

describe('the artifact reader (SLI-EXPLORER-002)', () => {
  let dom: JSDOM;
  let doc: Document;

  const model = [
    artifact('BC-Z', 'bounded-context', {}, { body: '## Responsibility\n\nZone.' }),
    artifact('ACT-A', 'actor', { 'actor-kind': 'human' }),
    ...Array.from({ length: 4 }, (_, i) =>
      artifact(`UC-Z${i}`, 'use-case', { 'primary-actor': 'ACT-A', 'bounded-context': 'BC-Z' }),
    ),
    artifact(
      'FR-D',
      'functional-requirement',
      {
        'derived-from': ['UC-Z0'],
        verification: [{ scenario: 'holds' }],
      },
      {
        body: '## Requirement\n\nServes UC-Z1 and ACT-A, cites `BC-Z`, but never XYZ-NOT-REAL or UC-Z1X.',
      },
    ),
  ];

  const open = (hash: string): void => {
    dom = new JSDOM(build(model), {
      url: `https://snapshot.invalid/snapshot.html${hash}`,
      runScripts: 'dangerously',
    });
    doc = dom.window.document;
  };

  it('keeps the discovery on every relationship link, so following an edge preserves context', () => {
    open('#/artifacts/UC-Z0?k=use-case&c=BC-Z');
    const rels = [...doc.querySelectorAll('#detail .rels a[href^="#/artifacts/"]')];
    expect(rels.length).toBeGreaterThan(0);
    for (const a of rels) {
      expect(a.getAttribute('href')).toContain('?k=use-case&c=BC-Z');
    }
  });

  it('names the discovery it returns to, visibly from the Reader', () => {
    open('#/artifacts/UC-Z0?k=use-case&f=Z');
    const back = doc.querySelector('.backlink a');
    expect(back?.getAttribute('href')).toBe('#/artifacts?k=use-case&f=Z');
    expect(back?.textContent).toContain('Results');
    expect(back?.textContent).toContain('Use Cases');
    expect(back?.textContent).toContain('filter “Z”');
    open('#/artifacts/UC-Z0');
    expect(doc.querySelector('.backlink a')?.textContent).toBe('← All artifacts');
  });

  it('shows every relationship group with its complete count, title and identifier per entry', () => {
    open('#/artifacts/UC-Z0');
    const counts = [...doc.querySelectorAll('#detail .rels .gcount')].map((n) => n.textContent);
    expect(counts.length).toBeGreaterThan(0);
    for (const c of counts) expect(Number(c)).toBeGreaterThan(0);
    const entry = doc.querySelector('#detail .rels ul.members li');
    expect(entry?.querySelector('a')?.textContent).not.toBe('');
    expect(entry?.querySelector('.aid')?.textContent).toMatch(/^[A-Z]+-/);
  });

  it('links every known identifier in the body and leaves the text exactly as authored', () => {
    open('#/artifacts/FR-D?k=functional-requirement');
    const body = doc.querySelector('#detail .body')!;
    const links = [...body.querySelectorAll('a.idlink')].map((a) => [
      a.textContent,
      a.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['UC-Z1', '#/artifacts/UC-Z1?k=functional-requirement'],
      ['ACT-A', '#/artifacts/ACT-A?k=functional-requirement'],
      ['BC-Z', '#/artifacts/BC-Z?k=functional-requirement'],
    ]);
    expect(body.textContent).toContain(
      'Serves UC-Z1 and ACT-A, cites BC-Z, but never XYZ-NOT-REAL or UC-Z1X.',
    );
    // An identifier inside code keeps its code element around the link.
    expect(body.querySelector('code a.idlink')?.textContent).toBe('BC-Z');
  });

  it('turns metadata identifiers into reference links carrying kind, title and identifier', () => {
    open('#/artifacts/UC-Z0');
    const refs = [...doc.querySelectorAll('#detail dl.meta a.ref')];
    expect(refs.map((r) => r.getAttribute('href'))).toEqual([
      '#/artifacts/ACT-A',
      '#/artifacts/BC-Z',
    ]);
    expect(refs[0]?.querySelector('.token')?.getAttribute('data-kind')).toBe('actor');
    expect(refs[0]?.querySelector('.rid')?.textContent).toBe('ACT-A');
    // A value that is not an identifier stays text.
    open('#/artifacts/ACT-A');
    const dd = doc.querySelector('#detail dl.meta dd');
    expect(dd?.textContent).toBe('human');
    expect(dd?.querySelector('a')).toBeNull();
  });

  it('steps through the current list and states the position within the kind', () => {
    open('#/artifacts/UC-Z1?k=use-case');
    expect(doc.querySelector('#detail .rbar .pos')?.textContent).toBe('2 of 4 Use Cases');
    (doc.querySelector('#detail [data-step="1"]') as HTMLButtonElement).click();
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    expect(dom.window.location.hash).toBe('#/artifacts/UC-Z2?k=use-case');
    doc.body.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'k', bubbles: true }));
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    expect(dom.window.location.hash).toBe('#/artifacts/UC-Z1?k=use-case');
    // At the ends of the list the step is offered but disabled, with nothing to go to.
    open('#/artifacts/UC-Z0?k=use-case');
    expect((doc.querySelector('#detail [data-step="-1"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('offers to copy the identifier and the address of the current view', async () => {
    open('#/artifacts/UC-Z0');
    const copied: string[] = [];
    Object.defineProperty(dom.window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (text: string) => (copied.push(text), Promise.resolve()) },
    });
    (doc.querySelector('#detail [data-copy="id"]') as HTMLButtonElement).click();
    (doc.querySelector('#detail [data-copy="link"]') as HTMLButtonElement).click();
    await Promise.resolve();
    expect(copied).toEqual(['UC-Z0', 'https://snapshot.invalid/snapshot.html#/artifacts/UC-Z0']);
    expect(doc.getElementById('toast')?.textContent).toContain('UC-Z0');
  });
});

describe('the focused topology (SLI-EXPLORER-003)', () => {
  let dom: JSDOM;
  let doc: Document;

  const model = [
    artifact('ACT-H', 'actor', { 'actor-kind': 'human' }),
    artifact('BR-H', 'business-rule', {}),
    ...Array.from({ length: 30 }, (_, i) =>
      artifact(`UC-H${String(i).padStart(2, '0')}`, 'use-case', {
        'primary-actor': 'ACT-H',
        'governed-by': ['BR-H'],
      }),
    ),
    artifact('FR-H', 'functional-requirement', {
      'derived-from': ['UC-H00'],
      verification: [{ scenario: 'holds' }],
    }),
    artifact('BC-T', 'bounded-context', {}),
    artifact('ACT-T', 'actor', { 'actor-kind': 'human' }),
    artifact('TERM-T', 'domain-term', { 'defined-in': 'BC-T' }),
    ...Array.from({ length: 8 }, (_, i) =>
      artifact(`UC-T${i}`, 'use-case', { 'primary-actor': 'ACT-T', 'uses-terms': ['TERM-T'] }),
    ),
  ];

  const open = (hash: string): void => {
    dom = new JSDOM(build(model), {
      url: `https://snapshot.invalid/snapshot.html${hash}`,
      runScripts: 'dangerously',
    });
    doc = dom.window.document;
  };
  const group = (type: string): Element => {
    const found = [...doc.querySelectorAll('#graph-host button.tg')].find((n) =>
      (n.getAttribute('aria-label') ?? '').includes(type),
    );
    if (!found) throw new Error(`no group for ${type}`);
    return found;
  };
  const click = (n: Element): void => {
    n.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  };

  it('is one of exactly two projections: nothing banded, nothing whole-graph, aggregate intact', () => {
    const html = build(model);
    expect(html).not.toMatch(/bandname|gmodes|layersummary|Layered/);
    expect(html).toContain('id="h-aggregate"');
    open('#/graph/focus/ACT-H');
    expect(doc.querySelectorAll('#graph-host .canvas').length).toBe(1);
    // Bounded: groups are typed, not one node per artifact.
    expect(doc.querySelectorAll('#graph-host button.tg').length).toBeLessThan(5);
  });

  it('resolves the withdrawn standalone routes in place, into the integrated view', () => {
    open('#/graph');
    expect(dom.window.location.hash).toBe('#/artifacts');
    open('#/graph/layers');
    expect(dom.window.location.hash).toBe('#/artifacts');
    open('#/graph/focus/ACT-H');
    expect(dom.window.location.hash).toBe('#/artifacts/ACT-H');
    expect(doc.getElementById('view-artifacts')?.hidden).toBe(false);
    expect(doc.querySelectorAll('#graph-host button.tg').length).toBeGreaterThan(0);
  });

  it('carries disclosure in the address, replacing history, and restores it from a fresh window', () => {
    open('#/artifacts/ACT-H');
    const before = dom.window.history.length;
    click(group('primary-actor'));
    expect(dom.window.location.hash).toMatch(/#\/artifacts\/ACT-H\?x=/);
    expect(dom.window.history.length).toBe(before);
    const address = dom.window.location.hash;
    open(address);
    expect(group('primary-actor').getAttribute('aria-expanded')).toBe('true');
    // An address from an earlier snapshot naming several open groups opens its first.
    open('#/artifacts/ACT-H?x=0.1');
    expect(doc.querySelectorAll('#graph-host button.tg[aria-expanded="true"]').length).toBe(1);
  });

  it('toggling a group changes no selection; refocusing on a member is a navigation that resets disclosure', () => {
    open('#/artifacts/UC-H00');
    click(group('primary-actor'));
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe('UC-H00');
    const member = doc.querySelector('#graph-host .members-pop a[data-member]');
    expect(member).not.toBeNull();
    const href = member?.getAttribute('href') ?? '';
    expect(href).toBe('#/artifacts/' + member?.getAttribute('data-member'));
    expect(href).not.toContain('x=');
    dom.window.location.hash = href;
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe(
      member?.getAttribute('data-member'),
    );
    expect(doc.querySelector('#graph-host .members-pop')).toBeNull();
  });

  it('presents even a very dense group as a structured list of selectable entries', () => {
    open('#/artifacts/ACT-H?x=0');
    const dense = group('primary-actor');
    expect(dense.getAttribute('aria-label')).toContain('30');
    const panel = doc.querySelector('#graph-host .members-pop');
    expect(panel?.getAttribute('aria-label')).toBe('primary actor · Use Cases, 30 members');
    expect(panel?.querySelectorAll('li a').length).toBe(30);
    expect(panel?.querySelector('a')?.getAttribute('href')).toContain('#/artifacts/');
  });

  it('draws the projection beside the Reader, anchored on the page selection', () => {
    open('#/artifacts/UC-H00?k=use-case');
    // Three regions of one instrument: master, detail and the focused topology, all live at once.
    expect(doc.querySelector('#artifact-list a[aria-current="true"]')).not.toBeNull();
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toContain('UC-H00');
    expect(doc.querySelectorAll('#graph-host button.tg').length).toBeGreaterThan(0);
    expect(doc.querySelector('#graph-host .canvas')?.getAttribute('aria-label')).toContain(
      'UC-H00',
    );
  });

  it('says plainly why the projection is empty when nothing is selected yet', () => {
    open('#/artifacts');
    const note = doc.querySelector('#graph-host p.note');
    expect(note?.textContent).toContain('Nothing is selected yet');
  });

  it('shows every group of a small neighbourhood, counted, and no member until asked', () => {
    open('#/artifacts/TERM-T');
    const labels = [...doc.querySelectorAll('#graph-host button.tg')].map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(labels).toEqual([
      'Declares 1 Bounded Contexts through defined-in',
      'Referenced by 8 Use Cases through uses-terms',
    ]);
    expect(doc.querySelector('#graph-host .members-pop')).toBeNull();
  });

  it('keeps every traversal available without the visual', () => {
    open('#/artifacts/UC-H00');
    const readerLinks = [...doc.querySelectorAll('#detail .rels a[href^="#/artifacts/"]')];
    expect(readerLinks.length).toBeGreaterThan(0);
    // The dense group itself stays readable as text: the actor's 30 edges are a counted group.
    open('#/artifacts/ACT-H');
    const counts = [...doc.querySelectorAll('#detail .rels .gcount')].map((n) =>
      Number(n.textContent),
    );
    expect(counts).toContain(30);
  });
});

describe('the redesigned shell (CHG-SNAPSHOT-005)', () => {
  let dom: JSDOM;
  let doc: Document;

  const open = (hash: string, artifacts = model): void => {
    dom = new JSDOM(build(artifacts), {
      url: `https://snapshot.invalid/snapshot.html${hash}`,
      runScripts: 'dangerously',
    });
    doc = dom.window.document;
  };
  const press = (key: string, init: KeyboardEventInit = {}): void => {
    doc.body.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key, bubbles: true, ...init }),
    );
  };

  it('follows the environment by default and holds a chosen appearance in the address only', () => {
    open('#/artifacts/UC-A');
    const root = doc.documentElement;
    expect(root.hasAttribute('data-appearance')).toBe(false);
    const auto = doc.querySelector('[data-appearance-set="auto"]')!;
    expect(auto.getAttribute('aria-pressed')).toBe('true');
    const before = dom.window.history.length;
    (doc.querySelector('[data-appearance-set="dark"]') as HTMLButtonElement).click();
    expect(root.getAttribute('data-appearance')).toBe('dark');
    expect(dom.window.location.hash).toBe('#/artifacts/UC-A?a=dark');
    expect(dom.window.history.length).toBe(before);
    expect(doc.querySelector('[data-appearance-set="dark"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
    // A fresh window on that address renders dark; nothing was stored anywhere else.
    open('#/artifacts/UC-A?a=dark');
    expect(doc.documentElement.getAttribute('data-appearance')).toBe('dark');
    expect(dom.window.localStorage.length).toBe(0);
    expect(doc.cookie).toBe('');
    (doc.querySelector('[data-appearance-set="auto"]') as HTMLButtonElement).click();
    expect(doc.documentElement.hasAttribute('data-appearance')).toBe(false);
    expect(dom.window.location.hash).toBe('#/artifacts/UC-A');
  });

  it('keeps presentation choices across navigation, including links in the generated markup', () => {
    open('#/artifacts/UC-A?a=light&m=rail');
    // A relationship link carries the discovery only; following it keeps the presentation.
    const link = doc.querySelector('#detail .rels a[href^="#/artifacts/"]') as HTMLAnchorElement;
    link.dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }),
    );
    expect(link.getAttribute('href')).toMatch(/\?a=light&m=rail$/);
    // So does a static link from the overview's markup.
    const family = doc.querySelector('.kinds a') as HTMLAnchorElement;
    family.dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }),
    );
    expect(family.getAttribute('href')).toBe('#/artifacts?k=actor&a=light&m=rail');
    // And an invalid value is ignored rather than trusted.
    open('#/artifacts?a=purple&m=wide');
    expect(doc.documentElement.hasAttribute('data-appearance')).toBe(false);
    expect(doc.body.getAttribute('data-master')).toBe('open');
  });

  it('collapses the master area to a kind rail and restores it, by control and by shortcut', () => {
    open('#/artifacts/UC-A');
    const toggle = doc.getElementById('master-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toContain('Collapse');
    toggle.click();
    expect(doc.body.getAttribute('data-master')).toBe('rail');
    expect(dom.window.location.hash).toBe('#/artifacts/UC-A?m=rail');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    // The rail marks the selected artifact's kind, by more than colour.
    const current = doc.querySelector('#kind-rail button[aria-current="true"]');
    expect(current?.getAttribute('data-rail')).toBe('use-case');
    expect(current?.textContent).toBe('UC');
    press('b', { ctrlKey: true });
    expect(doc.body.getAttribute('data-master')).toBe('open');
    press('b', { ctrlKey: true });
    expect(doc.body.getAttribute('data-master')).toBe('rail');
    // A kind on the rail restores the area with that kind's group open.
    (doc.querySelector('#kind-rail [data-rail="actor"]') as HTMLButtonElement).click();
    expect(doc.body.getAttribute('data-master')).toBe('open');
    expect(
      doc.querySelector('#artifact-list .khead[data-group="actor"]')?.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('opens the group holding the selection, marks it by more than colour, and moves the marker', () => {
    open('#/artifacts/UC-A');
    const head = (kind: string) =>
      doc.querySelector(`#artifact-list .khead[data-group="${kind}"]`)!;
    expect(head('use-case').getAttribute('aria-expanded')).toBe('true');
    expect(head('use-case').classList.contains('has-current')).toBe(true);
    expect(head('use-case').querySelector('.here')?.textContent).toContain(
      'holds the selected artifact',
    );
    expect(head('actor').getAttribute('aria-expanded')).toBe('false');
    // Following a relationship into a closed kind opens that kind and moves the marker there.
    dom.window.location.hash = '#/artifacts/ACT-A';
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    expect(head('actor').getAttribute('aria-expanded')).toBe('true');
    expect(head('actor').classList.contains('has-current')).toBe(true);
    expect(head('use-case').classList.contains('has-current')).toBe(false);
    expect(doc.querySelector('#artifact-list a[aria-current="true"]')?.getAttribute('href')).toBe(
      '#/artifacts/ACT-A',
    );
    // Closing a group the reader does not need changes nothing else.
    (head('use-case') as HTMLButtonElement).click();
    expect(head('use-case').getAttribute('aria-expanded')).toBe('false');
    expect(doc.querySelector('#detail h3.artifact')?.textContent).toBe('ACT-A');
  });

  it('decorates every kind token with its icon, beside the text and never instead of it', () => {
    open('#/artifacts/UC-A');
    const tokens = [...doc.querySelectorAll('.token[data-kind]')];
    expect(tokens.length).toBeGreaterThan(5);
    for (const token of tokens) {
      const use = token.querySelector('svg.ic use');
      expect(use?.getAttribute('href')).toBe(`#i-${token.getAttribute('data-kind')}`);
      expect(token.textContent).toMatch(/^[A-Z]{2,4}$/);
    }
    // Each icon is defined once, in the file.
    for (const kind of ['actor', 'use-case', 'journey', 'functional-requirement', 'constraint']) {
      expect(doc.querySelectorAll(`symbol#i-${kind}`).length).toBe(1);
    }
  });

  it('states every shortcut on the page, each backed by a visible control', () => {
    open('#/artifacts/UC-A');
    const keys = doc.getElementById('keys')!;
    expect(keys.hidden).toBe(true);
    press('?');
    expect(keys.hidden).toBe(false);
    expect(doc.activeElement?.id).toBe('keys-close');
    const listed = keys.querySelector('dl')?.textContent ?? '';
    for (const words of [
      'Search the product',
      'Collapse or expand the artifact list',
      'Next or previous artifact',
    ]) {
      expect(listed).toContain(words);
    }
    keys.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(keys.hidden).toBe(true);
    // The controls the shortcuts accelerate exist on the page.
    for (const id of ['find-open', 'master-toggle', 'keys-open'])
      expect(doc.getElementById(id)).not.toBeNull();
    expect(doc.querySelector('#detail [data-step="1"]')).not.toBeNull();
    // No shortcut fires while the reader is typing.
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    const q = doc.getElementById('q-body') as HTMLInputElement;
    q.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(keys.hidden).toBe(true);
  });

  it('traps focus inside the search dialog', () => {
    open('#/artifacts');
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    const find = doc.getElementById('find')!;
    const close = doc.getElementById('find-close') as HTMLButtonElement;
    const chipsInside = [...find.querySelectorAll('button')];
    const last = chipsInside[chipsInside.length - 1] as HTMLButtonElement;
    last.focus();
    find.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(doc.activeElement?.id).toBe('q-body');
    find.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(doc.activeElement).toBe(last);
    expect(close).not.toBeNull();
  });
});
