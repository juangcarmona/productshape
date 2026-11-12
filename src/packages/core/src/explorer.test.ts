import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { compileGraph } from './graph.js';
import { putInQuestionBy } from './impact.js';
import { buildExplorerHtml } from './explorer.js';
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
  return buildExplorerHtml(compileGraph(artifacts), artifacts, 'abc123');
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
  const open = '<script id="explorer-data" type="application/json">';
  const start = html.indexOf(open) + open.length;
  const json = html.slice(start, html.indexOf('</script>', start));
  return JSON.parse(json);
}

describe('buildExplorerHtml — generation contract', () => {
  it('is byte-identical across builds, LF-only, and ends with a newline', () => {
    expect(build()).toBe(build());
    expect(build().endsWith('\n')).toBe(true);
    expect(build()).not.toContain('\r');
  });

  it('stamps the source revision, monospaced, in the header', () => {
    expect(build()).toContain('revision <span class="rev">abc123</span>');
    expect(buildExplorerHtml(compileGraph(model), model, undefined)).toContain(
      'revision unavailable',
    );
  });

  it('is self-contained: one inert data block, one application block, no external resources', () => {
    const html = build();
    expect((html.match(/<script/g) ?? []).length).toBe(2);
    expect(html).toContain('<script id="explorer-data" type="application/json">');
    expect(html).not.toContain('src=');
    expect(html).not.toContain('<link');
    expect(html).not.toContain('@import');
    expect(html).not.toContain('<form');
    // External links are navigation only; no external resource is fetched when the page opens.
    expect(html).not.toMatch(/(?:src|poster|data)="https?:/);
    expect(html).not.toMatch(/url\(\s*['"]?https?:/);
    // The absolute URLs are the SVG namespace and the optional ProductShape navigation link.
    const urls = [...html.matchAll(/https?:\/\/[^\s'"<)]+/g)].map((m) => m[0]);
    expect([...new Set(urls)].sort()).toEqual(
      ['http://www.w3.org/2000/svg', 'https://juangcarmona.github.io/productshape/'].sort(),
    );
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
      'svg.edges path',
      '.mchip',
      '.fbox',
      '.mcard',
      "#artifact-list a[aria-current='true']",
    ]) {
      expect(selectors).toContain(wanted);
    }
  });
});

describe('buildExplorerHtml — the opening document is bounded', () => {
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

describe('buildExplorerHtml — orientation view', () => {
  it('states identity, revision and totals without exposing the whole product model', () => {
    const html = build();
    const opening = openingDocument(html);
    expect(opening).toMatch(/<h1\b[^>]*>Product Explorer<\/h1>/);
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

describe('buildExplorerHtml — embedded data completeness', () => {
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
    const open = '<script id="explorer-data" type="application/json">';
    const start = html.indexOf(open) + open.length;
    const raw = html.slice(start, html.indexOf('</script>', start));
    expect(raw).not.toContain('<');
    expect(raw).toContain('\\u003c');
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe('buildExplorerHtml — hostile authored content', () => {
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

describe('buildExplorerHtml — accessibility of the opening document', () => {
  it('exposes landmarks and a heading outline with no skipped levels', () => {
    const opening = openingDocument(build());
    expect(opening).toContain('<header class="site">');
    expect(opening).toContain('<nav class="views" id="site-views" aria-label="Explorer views">');
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
      url: `https://explorer.invalid/explorer.html${hash}`,
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
    expect(doc.title).toBe('Product Explorer');
    navigate('#/artifacts/UC-A');
    expect(doc.title).toBe('UC-A UC-A · Product Explorer');
    navigate('#/artifacts');
    expect(doc.title).toBe('Artifacts · Product Explorer');
    navigate('#/artifacts/UC-NOPE');
    expect(doc.title).toBe('UC-NOPE not found · Product Explorer');
  });

  it('states the map gestures on screen rather than leaving them to be discovered', () => {
    load('#/');
    expect(doc.getElementById('maphint-overview')?.textContent).toContain('Drag to pan');
    expect(doc.getElementById('maphint-focus')?.textContent).toContain('Enter');
    expect(doc.getElementById('maphint-columns')?.textContent).toContain('Esc');
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

  it('draws each map only when its view is opened', () => {
    expect(doc.querySelector('#map-overview .mchip')).not.toBeNull();
    expect(doc.querySelector('#map-focus .plane')).toBeNull();
    expect(doc.querySelector('#map-columns .plane')).toBeNull();
    navigate('#/focus/UC-A');
    expect(doc.querySelector('#map-focus .plane')).not.toBeNull();
    expect(doc.querySelector('#map-columns .plane')).toBeNull();
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

  it('opens the views menu on request and closes it once the reader moves', () => {
    const toggle = doc.getElementById('menu-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-controls')).toBe('site-views');
    expect(doc.getElementById('site-views')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    expect(doc.body.getAttribute('data-menu')).toBe('open');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    navigate('#/artifacts');
    expect(doc.body.hasAttribute('data-menu')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(doc.body.hasAttribute('data-menu')).toBe(false);
    toggle.click();
    (doc.getElementById('find-open') as HTMLButtonElement).click();
    expect(doc.body.hasAttribute('data-menu')).toBe(false);
  });

  it('puts the menu button right after search, so focus order follows the phone header', () => {
    const header = [...doc.querySelectorAll('header.site > button')].map((b) => b.id);
    expect(header.indexOf('menu-toggle')).toBe(header.indexOf('find-open') + 1);
  });

  const loadPhone = (hash = ''): void => {
    dom.window.close();
    dom = new JSDOM(build(model), {
      url: `https://explorer.invalid/explorer.html${hash}`,
      runScripts: 'dangerously',
      beforeParse(window) {
        Object.defineProperty(window, 'matchMedia', {
          value: (query: string) => ({ matches: query.includes('max-width'), media: query }),
        });
      },
    });
    doc = dom.window.document;
  };

  it('opens on the artifact catalog on a phone when the address names nothing', () => {
    loadPhone();
    expect(dom.window.location.hash).toBe('#/artifacts');
    expect(visible('artifacts')).toBe(true);
    expect(visible('overview')).toBe(false);
  });

  it('honours an address on a phone, including the Overview', () => {
    loadPhone('#/');
    expect(visible('overview')).toBe(true);
    loadPhone('#/artifacts/UC-A');
    expect(doc.body.getAttribute('data-pane')).toBe('detail');
  });

  it('stacks the Focus view on a phone: focus on top, one line per neighbour, no background', () => {
    loadPhone('#/focus/UC-A');
    const plane = doc.querySelector('#map-focus .plane') as HTMLElement;
    const top = (node: Element) => parseFloat((node as HTMLElement).style.top);
    const left = (node: Element) => parseFloat((node as HTMLElement).style.left);
    const centre = plane.querySelector('.fbox.centre') as HTMLElement;
    const boxes = [...plane.querySelectorAll('.fbox:not(.centre)')];
    const heads = [...plane.querySelectorAll('.fgroup')];
    expect(boxes.length).toBeGreaterThan(0);
    for (const node of [...boxes, ...heads]) {
      expect(top(node)).toBeGreaterThan(top(centre));
      expect(left(node)).toBe(left(centre));
    }
    const groupTops = heads.map(top);
    expect([...groupTops].sort((a, b) => a - b)).toEqual(groupTops);
    expect(plane.querySelectorAll('.dot').length).toBe(0);
    // Every drawn neighbour has exactly one line; UC-A has no collapsed group here.
    expect(plane.querySelectorAll('svg.edges path').length).toBe(boxes.length);
  });

  it('keeps every identifier in the accessible name where a phone shows only the title', () => {
    navigate('#/focus/UC-A');
    for (const box of doc.querySelectorAll('#map-focus .fbox:not(.centre)')) {
      expect(box.getAttribute('aria-label')).toContain(box.getAttribute('data-id') as string);
    }
    navigate('#/artifacts/UC-A');
    const refs = [...doc.querySelectorAll('#detail a.ref')];
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(ref.getAttribute('aria-label')).toContain('ACT-A');
  });

  it('keeps the wide Focus view, with its background, off a phone', () => {
    navigate('#/focus/UC-A');
    expect(doc.querySelectorAll('#map-focus .dot').length).toBeGreaterThan(0);
  });

  it('stacks the Overview regions in one column on a phone, at most two chips wide', () => {
    loadPhone('#/');
    const tiles = [...doc.querySelectorAll('#map-overview .tile')] as HTMLElement[];
    expect(tiles.length).toBeGreaterThan(1);
    for (const tile of tiles) expect(parseFloat(tile.style.left)).toBe(0);
    const tops = tiles.map((tile) => parseFloat(tile.style.top));
    expect(new Set(tops).size).toBe(tiles.length);
    const chipLefts = new Set(
      [...doc.querySelectorAll('#map-overview .mchip')].map((c) => (c as HTMLElement).style.left),
    );
    expect(chipLefts.size).toBeLessThanOrEqual(2);
  });

  const touch = (type: string, x: number, y: number): void => {
    const host = doc.getElementById('detail') as HTMLElement;
    const ev = new dom.window.Event(type, { bubbles: true });
    const point = [{ clientX: x, clientY: y }];
    Object.defineProperty(ev, 'touches', { value: type === 'touchstart' ? point : [] });
    Object.defineProperty(ev, 'changedTouches', { value: point });
    host.dispatchEvent(ev);
  };

  it('steps through the list on a horizontal swipe on a phone, and not on a vertical one', () => {
    loadPhone('#/artifacts/UC-A');
    const start = dom.window.location.hash;
    touch('touchstart', 300, 400);
    touch('touchend', 290, 200);
    expect(dom.window.location.hash).toBe(start);
    touch('touchstart', 300, 400);
    touch('touchend', 120, 410);
    expect(dom.window.location.hash).not.toBe(start);
    expect(dom.window.location.hash.startsWith('#/artifacts/')).toBe(true);
  });

  it('steps back on a rightward swipe and ignores a second finger', () => {
    loadPhone('#/artifacts/UC-A');
    touch('touchstart', 100, 400);
    touch('touchend', 300, 405);
    const back = dom.window.location.hash;
    expect(back).not.toBe('#/artifacts/UC-A');
    const host = doc.getElementById('detail') as HTMLElement;
    const ev = new dom.window.Event('touchstart', { bubbles: true });
    Object.defineProperty(ev, 'touches', {
      value: [
        { clientX: 300, clientY: 400 },
        { clientX: 310, clientY: 400 },
      ],
    });
    host.dispatchEvent(ev);
    touch('touchend', 100, 400);
    expect(dom.window.location.hash).toBe(back);
  });

  it('does not step on a swipe off a phone', () => {
    navigate('#/artifacts/UC-A');
    const start = dom.window.location.hash;
    touch('touchstart', 300, 400);
    touch('touchend', 120, 410);
    expect(dom.window.location.hash).toBe(start);
  });

  it('folds the map summary to its title and back', () => {
    navigate('#/focus/UC-A');
    const card = doc.getElementById('mcard') as HTMLElement;
    expect(card.hidden).toBe(false);
    const fold = card.querySelector('.cardfold') as HTMLButtonElement;
    expect(fold.getAttribute('aria-expanded')).toBe('true');
    fold.click();
    expect(card.hasAttribute('data-folded')).toBe(true);
    expect(fold.getAttribute('aria-expanded')).toBe('false');
    fold.click();
    expect(card.hasAttribute('data-folded')).toBe(false);
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
      url: `https://explorer.invalid/explorer.html${hash}`,
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
        title: 'Product Explorer',
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
      url: 'https://explorer.invalid/explorer.html#/artifacts',
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
      url: `https://explorer.invalid/explorer.html${hash}`,
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
      url: `https://explorer.invalid/explorer.html${hash}`,
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
    expect(copied).toEqual(['UC-Z0', 'https://explorer.invalid/explorer.html#/artifacts/UC-Z0']);
    expect(doc.getElementById('toast')?.textContent).toContain('UC-Z0');
  });
});

/**
 * The three map views of CHG-SNAPSHOT-V2 — the Overview map, the Focus view and the Columns view —
 * and the business lens, driven in a real DOM. The test DOM has no layout, so positions are read
 * from the inline styles the application writes, which is exactly what the browser lays out.
 */
describe('the map views (CHG-SNAPSHOT-V2)', () => {
  let dom: JSDOM;
  let doc: Document;

  /** A small product with every kind the Columns order names, and both context relationships. */
  const product = [
    artifact('ACT-U', 'actor', { 'actor-kind': 'human' }, { body: '## Purpose\n\nA user.' }),
    artifact('ACT-V', 'actor', { 'actor-kind': 'human' }, { body: '## Purpose\n\nA helper.' }),
    artifact('JRN-U', 'journey', { 'primary-actor': 'ACT-U', steps: [{ 'use-case': 'UC-ORDER' }] }),
    artifact(
      'UC-ORDER',
      'use-case',
      {
        title: 'Place an order',
        'primary-actor': 'ACT-U',
        'supporting-actors': ['ACT-V'],
        'bounded-context': 'BC-SALES',
        'governed-by': ['BR-PAY'],
        'uses-terms': ['TERM-ORDER'],
      },
      {
        title: 'Place an order',
        body: '## Goal\n\nThe customer gets what they chose.\n\n## Trigger\n\nThe customer confirms the basket.\n\n## Main Flow\n\n1. Pay.',
      },
    ),
    artifact('UC-RETURN', 'use-case', { 'primary-actor': 'ACT-U', 'bounded-context': 'BC-SALES' }),
    // No bounded context recorded: drawn in a group of its own rather than dropped.
    artifact('UC-LOOSE', 'use-case', { 'primary-actor': 'ACT-U' }),
    artifact(
      'BC-SALES',
      'bounded-context',
      {},
      { title: 'Sales', body: '## Responsibility\n\nSelling.' },
    ),
    artifact('BC-STOCK', 'bounded-context', {}, { title: 'Stock' }),
    artifact(
      'BR-PAY',
      'business-rule',
      { title: 'Payment comes first', 'applies-to': ['BC-SALES'] },
      {
        title: 'Payment comes first',
        body: '## Rule\n\nNo order ships before it is paid.\n\n## Rationale\n\nCash.',
      },
    ),
    artifact(
      'TERM-ORDER',
      'domain-term',
      { title: 'Order', 'defined-in': 'BC-SALES' },
      { title: 'Order' },
    ),
    artifact('TERM-SKU', 'domain-term', { 'defined-in': 'BC-STOCK' }),
    artifact(
      'FR-CHECKOUT',
      'functional-requirement',
      { title: 'Check out in one step', 'derived-from': ['UC-ORDER'] },
      { title: 'Check out in one step' },
    ),
    artifact(
      'QR-FAST',
      'quality-requirement',
      { title: 'Respond within a second', 'applies-to': ['UC-ORDER'] },
      { title: 'Respond within a second' },
    ),
    artifact(
      'CON-EU',
      'constraint',
      { title: 'Store data in the EU', 'applies-to': ['UC-ORDER'] },
      { title: 'Store data in the EU' },
    ),
    artifact(
      'SB-UNPAID',
      'structured-behaviour',
      {
        title: 'An unpaid order is held',
        illustrates: ['BR-PAY'],
        given: ['An order that is not paid'],
        when: 'Shipping is requested',
        then: ['The order is held', 'The customer is told why'],
      },
      { title: 'An unpaid order is held' },
    ),
  ];

  const open = (hash: string, artifacts = product, patch?: (w: Window) => void): void => {
    dom = new JSDOM(build(artifacts), {
      url: `https://explorer.invalid/explorer.html${hash}`,
      runScripts: 'dangerously',
      beforeParse(window) {
        if (patch) patch(window as unknown as Window);
      },
    });
    doc = dom.window.document;
  };
  const navigate = (hash: string): void => {
    dom.window.location.hash = hash;
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
  };
  const drawn = (map: string, cls: string): HTMLElement[] =>
    [...doc.querySelectorAll(`#map-${map} .${cls}`)] as HTMLElement[];
  const item = (map: string, id: string): HTMLElement =>
    doc.querySelector(`#map-${map} [data-id="${id}"]`) as HTMLElement;
  const fire = (node: Element, type: string, init: Record<string, unknown> = {}): void => {
    const Ctor =
      type === 'wheel'
        ? dom.window.WheelEvent
        : type === 'keydown'
          ? dom.window.KeyboardEvent
          : type === 'focusin' || type === 'focusout'
            ? dom.window.FocusEvent
            : dom.window.MouseEvent;
    node.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, ...init }));
  };
  const lit = (map: string): string[] =>
    [...doc.querySelectorAll(`#map-${map} [data-id].lit`)]
      .map((n) => n.getAttribute('data-id')!)
      .sort();
  const x = (n: HTMLElement): number => parseFloat(n.style.left);
  const neighbours = (id: string): string[] => {
    const graph = compileGraph(product);
    const out = new Set<string>();
    for (const e of graph.edges) {
      if (e.from === id) out.add(e.to);
      if (e.to === id) out.add(e.from);
    }
    out.delete(id);
    return [...out].sort();
  };

  describe('the Overview map', () => {
    it('is drawn from the data at open: one tile per kind present, every artifact a chip', () => {
      expect(openingDocument(build(product))).not.toContain('class="mchip');
      open('');
      const tiles = drawn('overview', 'tile');
      expect(tiles.map((t) => t.className.replace('tile k-', ''))).toEqual([
        'actor',
        'journey',
        'use-case',
        'bounded-context',
        'business-rule',
        'domain-term',
        'functional-requirement',
        'quality-requirement',
        'constraint',
        'structured-behaviour',
      ]);
      const chips = drawn('overview', 'mchip')
        .map((c) => c.getAttribute('data-id'))
        .sort();
      expect(chips).toEqual(product.map((a) => a.id).sort());
      // Each tile heads its kind with the token, the name and the exact count.
      const ucTile = tiles[2]!;
      expect(ucTile.querySelector('.token')?.textContent).toBe('UC');
      expect(ucTile.textContent).toContain('Use Cases');
      expect(ucTile.querySelector('.n')?.textContent).toBe('3');
    });

    it('draws no relationship line until the reader attends to an artifact', () => {
      open('');
      expect(doc.querySelectorAll('#map-overview svg.edges path').length).toBe(0);
    });

    it('groups use cases and terms by their one bounded context, and degrades without one', () => {
      open('');
      const labels = drawn('overview', 'ctx').map((n) => n.textContent);
      expect(labels).toEqual(['Sales', 'No single context', 'Sales', 'Stock']);
      // The use case without a context is drawn under its own label, after the grouped ones.
      const loose = item('overview', 'UC-LOOSE');
      const order = item('overview', 'UC-ORDER');
      expect(parseFloat(loose.style.top)).toBeGreaterThan(parseFloat(order.style.top));
    });

    it('lights an artifact and its direct neighbours on hover, with exactly its lines, changing nothing else', () => {
      open('#/');
      const before = dom.window.location.hash;
      fire(item('overview', 'UC-ORDER'), 'mouseover');
      expect(lit('overview')).toEqual(['UC-ORDER', ...neighbours('UC-ORDER')].sort());
      expect(doc.getElementById('map-overview')?.hasAttribute('data-attending')).toBe(true);
      const graph = compileGraph(product);
      const touching = graph.edges.filter((e) => e.from === 'UC-ORDER' || e.to === 'UC-ORDER');
      expect(doc.querySelectorAll('#map-overview svg.edges path.lit').length).toBe(touching.length);
      expect(dom.window.location.hash).toBe(before);
      // The card names what is attended to, without taking the pointer.
      const card = doc.getElementById('mcard')!;
      expect(card.hidden).toBe(false);
      expect(card.hasAttribute('data-passive')).toBe(true);
      expect(card.textContent).toContain('UC-ORDER');
      fire(doc.getElementById('map-overview')!, 'mouseleave');
      expect(lit('overview')).toEqual([]);
      expect(card.hidden).toBe(true);
    });

    it('lights the same neighbourhood on keyboard focus, with one tab stop and arrow-key movement', () => {
      open('#/');
      const tabbable = doc.querySelectorAll('#map-overview [data-id][tabindex="0"]');
      expect(tabbable.length).toBe(1);
      const start = tabbable[0] as HTMLElement;
      start.focus();
      expect(lit('overview')).toContain(start.getAttribute('data-id'));
      fire(start, 'keydown', { key: 'ArrowRight' });
      const moved = doc.activeElement as HTMLElement;
      expect(moved).not.toBe(start);
      expect(moved.getAttribute('data-id')).toBeTruthy();
      expect(x(moved)).toBeGreaterThan(x(start));
      expect(moved.getAttribute('tabindex')).toBe('0');
      expect(start.getAttribute('tabindex')).toBe('-1');
      expect(lit('overview')).toContain(moved.getAttribute('data-id'));
    });

    it('opens the Focus view on click and on Enter', () => {
      open('#/');
      fire(item('overview', 'BR-PAY'), 'click');
      expect(dom.window.location.hash).toBe('#/focus/BR-PAY');
      open('#/');
      fire(item('overview', 'UC-ORDER'), 'keydown', { key: 'Enter' });
      expect(dom.window.location.hash).toBe('#/focus/UC-ORDER');
    });

    it('marks the selection it carries and lights its neighbourhood', () => {
      open('#/overview/UC-ORDER');
      expect(item('overview', 'UC-ORDER').getAttribute('aria-current')).toBe('true');
      expect(item('overview', 'UC-ORDER').classList.contains('sel')).toBe(true);
      expect(lit('overview')).toEqual(['UC-ORDER', ...neighbours('UC-ORDER')].sort());
    });

    it('pans and zooms by visible controls and keys, never touching the address', () => {
      open('#/');
      const plane = doc.querySelector('#map-overview .plane') as HTMLElement;
      const scale = (): number => Number(/scale\(([\d.]+)\)/.exec(plane.style.transform)?.[1]);
      const before = scale();
      const hash = dom.window.location.hash;
      fire(doc.querySelector('[data-zoom="in"][data-map="overview"]')!, 'click');
      expect(scale()).toBeGreaterThan(before);
      fire(doc.querySelector('[data-zoom="fit"][data-map="overview"]')!, 'click');
      expect(scale()).toBeCloseTo(before, 3);
      fire(doc.body, 'keydown', { key: '-' });
      expect(scale()).toBeLessThan(before);
      fire(doc.body, 'keydown', { key: '0' });
      expect(scale()).toBeCloseTo(before, 3);
      const view = doc.getElementById('map-overview')!;
      const shift = (): string => plane.style.transform;
      const was = shift();
      fire(view, 'keydown', { key: 'ArrowLeft' });
      expect(shift()).not.toBe(was);
      fire(view, 'wheel', { deltaY: -200, clientX: 100, clientY: 100 });
      expect(scale()).toBeGreaterThan(before);
      expect(dom.window.location.hash).toBe(hash);
    });
  });

  describe('the Focus view', () => {
    it('centres the focus with its neighbours grouped by kind, earlier kinds on one side and later on the other', () => {
      open('#/focus/UC-ORDER');
      const centre = doc.querySelector('#map-focus .fbox.centre') as HTMLElement;
      expect(centre.getAttribute('data-id')).toBe('UC-ORDER');
      const boxes = drawn('focus', 'fbox').filter((b) => !b.classList.contains('centre'));
      expect(boxes.map((b) => b.getAttribute('data-id')).sort()).toEqual(neighbours('UC-ORDER'));
      for (const b of boxes) {
        const kind = b.className.match(/k-([a-z-]+)/)![1];
        const before = ['actor', 'journey'].includes(kind!);
        if (before) expect(x(b)).toBeLessThan(x(centre));
        else expect(x(b)).toBeGreaterThan(x(centre));
      }
      const heads = drawn('focus', 'fgroup').map((h) => [
        h.getAttribute('data-group'),
        h.querySelector('.n')?.textContent,
      ]);
      expect(heads).toEqual([
        ['actor', '2'],
        ['journey', '1'],
        ['bounded-context', '1'],
        ['business-rule', '1'],
        ['domain-term', '1'],
        ['functional-requirement', '1'],
        ['quality-requirement', '1'],
        ['constraint', '1'],
      ]);
    });

    it('names each neighbour, its relationships with their direction, and its other neighbours', () => {
      open('#/focus/UC-ORDER');
      const rule = item('focus', 'BR-PAY');
      expect(rule.querySelector('.bid')?.textContent).toBe('BR-PAY');
      expect(rule.querySelector('.bt')?.textContent).toBe('Payment comes first');
      // Declared by the focus (governed-by) and declared towards a context it shares: both directions as text.
      expect(rule.querySelector('.rel')?.textContent).toBe('governed-by →');
      expect(item('focus', 'FR-CHECKOUT').querySelector('.rel')?.textContent).toBe(
        '← derived-from',
      );
      // BR-PAY also touches BC-SALES and SB-UNPAID.
      expect(rule.querySelector('.more')?.textContent).toBe('+2');
      // One line per neighbour, and nothing the graph lacks.
      expect(doc.querySelectorAll('#map-focus svg.edges path').length).toBe(
        neighbours('UC-ORDER').length,
      );
    });

    it('keeps the rest of the model as a faded, selectable background', () => {
      open('#/focus/UC-ORDER');
      const dots = drawn('focus', 'dot')
        .map((d) => d.getAttribute('data-id'))
        .sort();
      const expected = product
        .map((a) => a.id as string)
        .filter((id) => id !== 'UC-ORDER' && !neighbours('UC-ORDER').includes(id))
        .sort();
      expect(dots).toEqual(expected);
      fire(item('focus', 'TERM-SKU'), 'click');
      expect(dom.window.location.hash).toBe('#/focus/TERM-SKU');
    });

    it('starts a dense group collapsed with its count, and carries disclosure in the address in place', () => {
      const hub = [
        artifact('ACT-H', 'actor', { 'actor-kind': 'human' }),
        ...Array.from({ length: 13 }, (_, i) =>
          artifact(`UC-H${String(i).padStart(2, '0')}`, 'use-case', { 'primary-actor': 'ACT-H' }),
        ),
      ];
      open('#/focus/ACT-H', hub);
      const head = doc.querySelector('#map-focus [data-group="use-case"]') as HTMLElement;
      expect(head.getAttribute('aria-expanded')).toBe('false');
      expect(head.querySelector('.n')?.textContent).toBe('13');
      expect(drawn('focus', 'fbox').length).toBe(1);
      // Every member is still joined to the focus, through the heading.
      expect(doc.querySelectorAll('#map-focus svg.edges path').length).toBe(13);
      const history = dom.window.history.length;
      fire(head, 'click');
      expect(dom.window.location.hash).toBe('#/focus/ACT-H?x=use-case');
      expect(dom.window.history.length).toBe(history);
      expect(drawn('focus', 'fbox').length).toBe(14);
      // The same address in a fresh window shows the same disclosure.
      open('#/focus/ACT-H?x=use-case', hub);
      expect(
        doc.querySelector('#map-focus [data-group="use-case"]')?.getAttribute('aria-expanded'),
      ).toBe('true');
    });

    it('refocuses instead of accumulating, keeps a breadcrumb, and resets disclosure', () => {
      open('#/focus/UC-ORDER?x=actor');
      fire(item('focus', 'BR-PAY'), 'click');
      expect(dom.window.location.hash).toBe('#/focus/BR-PAY');
      navigate('#/focus/BR-PAY');
      expect(doc.querySelector('#map-focus .fbox.centre')?.getAttribute('data-id')).toBe('BR-PAY');
      expect(doc.querySelectorAll('#map-focus .fbox.centre').length).toBe(1);
      const trail = [...doc.querySelectorAll('#focus-trail li')].map((li) => li.textContent);
      expect(trail).toEqual(['Overview', 'UC-ORDER', 'BR-PAY']);
      expect(doc.querySelector('#focus-trail a[href="#/focus/UC-ORDER"]')).not.toBeNull();
      expect(doc.querySelector('#focus-trail [aria-current="page"]')?.textContent).toBe('BR-PAY');
    });

    it('is one step from the Reader both ways, and Enter on the centre reads it', () => {
      open('#/artifacts/UC-ORDER');
      const toFocus = doc.querySelector('#detail a[data-focus]') as HTMLAnchorElement;
      expect(toFocus.getAttribute('href')).toBe('#/focus/UC-ORDER');
      open('#/focus/UC-ORDER');
      fire(doc.querySelector('#map-focus .fbox.centre')!, 'keydown', { key: 'Enter' });
      expect(dom.window.location.hash).toBe('#/artifacts/UC-ORDER');
    });

    it('takes keyboard focus on the centre when the focus moves, and keeps the shortcut f', () => {
      open('#/artifacts/BR-PAY');
      fire(doc.body, 'keydown', { key: 'f' });
      expect(dom.window.location.hash).toBe('#/focus/BR-PAY');
      navigate('#/focus/BR-PAY');
      expect(doc.activeElement?.getAttribute('data-id')).toBe('BR-PAY');
    });

    it('resolves an earlier page’s focused-projection route into the Focus view, in place', () => {
      open('#/graph/focus/UC-ORDER');
      expect(dom.window.location.hash).toBe('#/focus/UC-ORDER');
      expect(dom.window.history.length).toBe(1);
      expect(doc.getElementById('view-focus')?.hidden).toBe(false);
    });

    it('always has a focus: the selection, or the first artifact in the Columns order', () => {
      open('#/focus');
      expect(dom.window.location.hash).toBe('#/focus/ACT-U');
      open('#/artifacts/TERM-SKU');
      const tab = doc.querySelector('nav.views a[data-view="focus"]')!;
      expect(tab.getAttribute('href')).toBe('#/focus/TERM-SKU');
    });

    it('keeps every traversal it draws available without the visual, in the Reader', () => {
      open('#/focus/UC-ORDER');
      const drawnNeighbours = drawn('focus', 'fbox')
        .filter((b) => !b.classList.contains('centre'))
        .map((b) => b.getAttribute('data-id'))
        .sort();
      open('#/artifacts/UC-ORDER');
      const readerLinks = new Set(
        [...doc.querySelectorAll('#detail .rels a[href^="#/artifacts/"]')].map(
          (a) => (a.getAttribute('href') ?? '').replace('#/artifacts/', '').split('?')[0],
        ),
      );
      for (const id of drawnNeighbours) expect(readerLinks.has(id!), id!).toBe(true);
      expect(readerLinks.size).toBe(drawnNeighbours.length);
    });

    it('sends an unknown focus to the explicit not-found state', () => {
      open('#/focus/UC-NOPE');
      expect(doc.getElementById('detail')?.textContent).toContain('UC-NOPE');
    });
  });

  describe('the Columns view', () => {
    it('draws one column per kind present, in the stated order, and every relationship once', () => {
      open('#/columns');
      const heads = drawn('columns', 'colhead');
      expect(heads.map((h) => h.className.replace('colhead k-', ''))).toEqual([
        'actor',
        'journey',
        'use-case',
        'bounded-context',
        'business-rule',
        'domain-term',
        'functional-requirement',
        'quality-requirement',
        'constraint',
        'structured-behaviour',
      ]);
      for (let i = 1; i < heads.length; i += 1)
        expect(x(heads[i]!)).toBeGreaterThan(x(heads[i - 1]!));
      const boxes = drawn('columns', 'cbox')
        .map((b) => b.getAttribute('data-id'))
        .sort();
      expect(boxes).toEqual(product.map((a) => a.id).sort());
      expect(doc.querySelectorAll('#map-columns svg.edges path').length).toBe(
        compileGraph(product).edges.length,
      );
      expect(drawn('columns', 'ctx').map((n) => n.textContent)).toEqual([
        'Sales',
        'No single context',
        'Sales',
        'Stock',
      ]);
    });

    it('leaves out the kinds the model lacks', () => {
      open('#/columns', [product[0]!, product[2]!]);
      expect(drawn('columns', 'colhead').map((h) => h.className.replace('colhead k-', ''))).toEqual(
        ['actor', 'journey'],
      );
    });

    it('selects on click or Enter, keeps the neighbourhood lit, and clears by click, Esc or a second click', () => {
      open('#/columns');
      fire(item('columns', 'BR-PAY'), 'click');
      expect(dom.window.location.hash).toBe('#/columns/BR-PAY');
      navigate('#/columns/BR-PAY');
      expect(lit('columns')).toEqual(['BR-PAY', ...neighbours('BR-PAY')].sort());
      const litPaths = doc.querySelectorAll('#map-columns svg.edges path.lit').length;
      expect(litPaths).toBe(
        compileGraph(product).edges.filter((e) => e.from === 'BR-PAY' || e.to === 'BR-PAY').length,
      );
      expect(item('columns', 'BR-PAY').getAttribute('aria-current')).toBe('true');
      const card = doc.getElementById('mcard')!;
      expect(card.hidden).toBe(false);
      expect(card.hasAttribute('data-passive')).toBe(false);
      expect(card.querySelector('a[href="#/focus/BR-PAY"]')).not.toBeNull();
      fire(item('columns', 'BR-PAY'), 'click');
      expect(dom.window.location.hash).toBe('#/columns');
      navigate('#/columns/UC-ORDER');
      fire(doc.body, 'keydown', { key: 'Escape' });
      expect(dom.window.location.hash).toBe('#/columns');
      open('#/columns');
      fire(item('columns', 'QR-FAST'), 'keydown', { key: 'Enter' });
      expect(dom.window.location.hash).toBe('#/columns/QR-FAST');
    });

    it('focuses on double-click', () => {
      open('#/columns');
      fire(item('columns', 'CON-EU'), 'dblclick');
      expect(dom.window.location.hash).toBe('#/focus/CON-EU');
    });
  });

  describe('determinism and appearance', () => {
    it('lays every map out identically on every open, with no clock and no unseeded randomness', () => {
      const planes = (): string[] => {
        const out: string[] = [];
        for (const route of ['#/', '#/focus/UC-ORDER', '#/columns']) {
          navigate(route);
          out.push(
            doc.querySelector(`#map-${route.split('/')[1] || 'overview'} .plane`)!.innerHTML,
          );
        }
        return out;
      };
      open('#/');
      const first = planes();
      open('#/', product, (w) => {
        (w as unknown as { Math: Math }).Math.random = () => {
          throw new Error('unseeded randomness');
        };
        (w as unknown as { Date: { now: () => number } }).Date.now = () => {
          throw new Error('clock');
        };
      });
      expect(planes()).toEqual(first);
    });

    it('carries the chosen appearance on every map route, and tunes the highlight per appearance', () => {
      open('#/focus/UC-ORDER?a=dark');
      expect(doc.documentElement.getAttribute('data-appearance')).toBe('dark');
      fire(item('focus', 'BR-PAY'), 'click');
      expect(dom.window.location.hash).toBe('#/focus/BR-PAY?a=dark');
      const css = styleOf(build(product));
      for (const appearance of ['light', 'dark'] as const) {
        const t = tokens(css, appearance);
        for (const name of ['glow-near', 'glow-far', 'glow-line', 'dim'])
          expect(t[name], `${appearance} ${name}`).toBeTruthy();
      }
      expect(tokens(css, 'light')['glow-near']).not.toBe(tokens(css, 'dark')['glow-near']);
      // The lit state is carried by more than colour: a heavier border and the dimming of the rest.
      expect(css).toMatch(/\.mchip\.lit \{ border-width: 2px 2px 2px 4px;/);
      expect(css).toMatch(
        /\.mapview\[data-attending\] \.mchip:not\(\.lit\)[^{]*\{ opacity: var\(--dim\); \}/,
      );
    });

    it('states every map shortcut, each backed by a visible control', () => {
      open('#/');
      const keys = doc.getElementById('keys')?.textContent ?? '';
      for (const phrase of ['Zoom the map', 'Focus view', 'business lens', 'nearest artifact']) {
        expect(keys).toContain(phrase);
      }
      for (const map of ['overview', 'focus', 'columns']) {
        expect(doc.querySelector(`#maphint-${map}`)?.textContent).toMatch(/Enter/);
        for (const zoom of ['in', 'out', 'fit']) {
          expect(
            doc
              .querySelector(`[data-zoom="${zoom}"][data-map="${map}"]`)
              ?.getAttribute('aria-label'),
          ).toBeTruthy();
        }
      }
      expect(doc.getElementById('lens-toggle')?.textContent).toContain('Business lens');
    });
  });

  describe('the business lens', () => {
    const cardText = (): string => doc.getElementById('mcard')?.textContent ?? '';

    it('is one control and one key, a presentation choice held in the address in place', () => {
      open('#/focus/UC-ORDER');
      const toggle = doc.getElementById('lens-toggle')!;
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
      const history = dom.window.history.length;
      fire(toggle, 'click');
      expect(dom.window.location.hash).toBe('#/focus/UC-ORDER?l=b');
      expect(dom.window.history.length).toBe(history);
      expect(toggle.getAttribute('aria-pressed')).toBe('true');
      fire(doc.body, 'keydown', { key: 'l' });
      expect(dom.window.location.hash).toBe('#/focus/UC-ORDER');
    });

    it('presents a use case as goal, trigger, users, rules, proof, demands and reach, in plain words', () => {
      open('#/focus/UC-ORDER?l=b');
      const text = cardText();
      for (const quoted of [
        'The customer gets what they chose.',
        'The customer confirms the basket.',
        'ACT-U',
        'ACT-V',
        'JRN-U',
        'No order ships before it is paid.',
        'An unpaid order is held',
        'An order that is not paid',
        'Shipping is requested',
        'The order is held; The customer is told why',
        'Check out in one step',
        'Respond within a second',
        'Store data in the EU',
      ]) {
        expect(text, quoted).toContain(quoted);
      }
      for (const verb of [
        'Used by',
        'Part of',
        'Must obey',
        'Proved by',
        'Must do',
        'Must also be',
        'A change here puts in question',
      ]) {
        expect(text).toContain(verb);
      }
      // Titles, never identifiers or relationship names — the artifacts above are titled by their IDs
      // in this fixture, so the check is on the use case itself and the vocabulary.
      expect(text).not.toContain('UC-ORDER');
      expect(text).not.toContain('BR-PAY');
      for (const technical of [
        'governed-by',
        'derived-from',
        'applies-to',
        'primary-actor',
        'illustrates',
        'bounded-context',
      ]) {
        expect(text).not.toContain(technical);
      }
      // Each named artifact is one step from becoming the focus.
      expect(doc.querySelector('#mcard a[href="#/focus/BR-PAY"]')).not.toBeNull();
      expect(doc.querySelector('#mcard a[href^="#/artifacts/UC-ORDER"]')).not.toBeNull();
    });

    it('states what a change would put in question, from the same rule prodshape impact applies', () => {
      open('#/focus/UC-ORDER?l=b');
      const graph = compileGraph(product);
      const questioned = [...new Set(putInQuestionBy(graph, 'UC-ORDER').map((e) => e.id))].sort();
      const reach = [...doc.querySelectorAll('#mcard .creach a')].map((a) =>
        (a.getAttribute('href') ?? '').replace('#/focus/', ''),
      );
      expect(reach.sort()).toEqual(questioned);
      expect(embeddedData(build(product)).artifacts.find((a) => a.id === 'UC-ORDER')).toMatchObject(
        { q: questioned },
      );
    });

    it('says so when a section has nothing, and shows nothing the Product Explorer does not carry', () => {
      open('#/focus/UC-RETURN?l=b');
      const text = cardText();
      expect(text).toContain('Not stated in the model.');
      expect(text).toContain('None recorded in the model.');
      for (const absent of ['product change', 'citation'])
        expect(text.toLowerCase()).not.toContain(absent);
    });

    it('labels the Focus view with plain verbs and titles, and restores it when turned off', () => {
      open('#/focus/UC-ORDER?l=b');
      const rule = item('focus', 'BR-PAY');
      expect(rule.querySelector('.rel')?.textContent).toBe('must obey');
      expect(rule.querySelector('.bid')).toBeNull();
      expect(item('focus', 'ACT-U').querySelector('.rel')?.textContent).toBe('used by');
      expect(item('focus', 'FR-CHECKOUT').querySelector('.rel')?.textContent).toBe('must do');
      fire(doc.getElementById('lens-toggle')!, 'click');
      expect(item('focus', 'BR-PAY').querySelector('.rel')?.textContent).toBe('governed-by →');
      expect(item('focus', 'BR-PAY').querySelector('.bid')?.textContent).toBe('BR-PAY');
      expect(cardText()).toContain('UC-ORDER');
    });

    it('presents other kinds by title, plain kind and first statement, and joins the Reader', () => {
      open('#/focus/BR-PAY?l=b');
      expect(cardText()).toContain('Business rule');
      expect(cardText()).toContain('No order ships before it is paid.');
      expect(cardText()).not.toContain('BR-PAY');
      open('#/artifacts/UC-ORDER?l=b');
      expect(doc.querySelector('#detail .lenscard')?.textContent).toContain(
        'The customer confirms the basket.',
      );
      open('#/artifacts/UC-ORDER');
      expect(doc.querySelector('#detail .lenscard')).toBeNull();
    });

    it('embeds a behaviour’s given, when and then as lines', () => {
      const sb = embeddedData(build(product)).artifacts.find(
        (a) => a.id === 'SB-UNPAID',
      ) as unknown as {
        gwt: { given: string[]; when: string[]; then: string[] };
      };
      expect(sb.gwt).toEqual({
        given: ['An order that is not paid'],
        when: ['Shipping is requested'],
        then: ['The order is held', 'The customer is told why'],
      });
    });

    it('never lets authored content in a quoted section become markup', () => {
      const nasty = product.map((a) =>
        a.id === 'UC-ORDER' ? { ...a, body: `## Goal\n\n${hostile}\n\n## Trigger\n\nNow.` } : a,
      );
      open('#/focus/UC-ORDER?l=b', nasty);
      const card = doc.getElementById('mcard')!;
      expect(card.querySelector('script, div[onload]')).toBeNull();
      expect(card.textContent).toContain('<script>alert(1)</script>');
    });
  });
});

describe('the redesigned shell (CHG-SNAPSHOT-005)', () => {
  let dom: JSDOM;
  let doc: Document;

  const open = (hash: string, artifacts = model): void => {
    dom = new JSDOM(build(artifacts), {
      url: `https://explorer.invalid/explorer.html${hash}`,
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
