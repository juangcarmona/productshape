/**
 * Snapshot measurement harness (SLI-SNAPSHOT-003, QR-SCALABILITY-001).
 *
 * Establishes the reusable measurement procedure and the named reference environment for the
 * Product Snapshot Explorer, and records the figures QR-SCALABILITY-001 requires:
 *
 *   - opening-document composition: markup bytes rendered at open, artifact-level graph elements
 *   - generated file size, and size per authored byte
 *   - generation time, and time per artifact
 *
 * Representative models: the current product model plus synthetic models at a requested scale,
 * containing dense relationships, high-degree artifacts, isolated artifacts, and long titles and
 * bodies — the cases that are hardest at scale rather than the easy middle.
 *
 * In-browser interaction latency (artifact selection here; search in SLI-SNAPSHOT-005, focused
 * projections in SLI-SNAPSHOT-006) is measured by opening the generated file over `file://` on the
 * recorded reference environment; this script emits the machine-readable figures the browser pass
 * is recorded alongside.
 *
 * Run with: pnpm measure:snapshot [--scales 1,5,10] [--out <path>]
 */
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import os from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { JSDOM } from 'jsdom';
import {
  SchemaRegistry,
  buildSnapshotHtml,
  compileGraph,
  loadModel,
} from '../packages/core/src/index.js';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

interface Measurement {
  model: string;
  artifacts: number;
  relationships: number;
  maxDegree: number;
  isolated: number;
  authoredBytes: number;
  fileBytes: number;
  openingMarkupBytes: number;
  openingMarkupShare: number;
  artifactLevelNodes: number;
  artifactLevelEdges: number;
  bytesPerAuthoredByte: number;
  generationMs: { min: number; max: number };
  generationMsPerArtifact: number;
  /**
   * Artifact-selection latency: elapsed time from the address changing to the selected artifact's
   * detail being in the document, measured in jsdom. This exercises the real rendering path
   * (parse, build, insert) but not a browser's layout and paint, so it is a lower bound on what a
   * reader experiences and is recorded as such.
   */
  selectionMs: { hardest: string; samples: number; p50: number; p95: number; max: number };
  /**
   * Search latency: elapsed time from the query changing to results being displayed, for a query
   * matching one artifact, roughly a tenth of the model, and every artifact. Measured in jsdom, so
   * like the selection figure it excludes layout and paint.
   */
  searchMs: { queries: string[]; samples: number; p50: number; p95: number; max: number };
  /**
   * The first query a reader ever types, which additionally builds the plain-text body index. This
   * is the figure they actually feel; the warm figures above are every query after it.
   */
  firstSearchMs: number;
  /**
   * Focused-neighbourhood latency: elapsed time from the address naming a projection anchor to the
   * projection being in the document, for the highest-degree artifact and for an isolated one.
   */
  focusMs: { anchors: string[]; samples: number; p50: number; p95: number; max: number };
  /** The layered map for the whole model, and what it holds back at this scale. */
  layersMs: number;
  layersDrawn: {
    connectors: number;
    individualRelationships: number;
    hiddenArtifacts: number;
  };
}

/** Bytes of markup the browser parses into the document at open: <body> up to the inert data. */
function openingMarkupBytes(html: string): number {
  const bodyStart = html.indexOf('<body');
  const firstData = html.indexOf('<script id=', bodyStart);
  const end = firstData === -1 ? html.indexOf('</body>', bodyStart) : firstData;
  return Buffer.byteLength(html.slice(bodyStart, end), 'utf8');
}

/** Artifact-level graph elements present in the opening document (excludes inert data regions). */
function artifactLevelElements(html: string): { nodes: number; edges: number } {
  const bodyStart = html.indexOf('<body');
  const firstData = html.indexOf('<script id=', bodyStart);
  const opening = html.slice(bodyStart, firstData === -1 ? undefined : firstData);
  return {
    nodes: (opening.match(/<circle[^>]*\bdata-id=/g) ?? []).length,
    edges: (opening.match(/<line[^>]*\bdata-from=/g) ?? []).length,
  };
}

const longTitle =
  'Artifact with a deliberately long title that exercises truncation, wrapping and layout ' +
  'behaviour in list rendering and in the detail header at every viewport width';

function body(sections: number, id: string): string {
  return Array.from(
    { length: sections },
    (_, i) => `## Section ${i + 1}

Authored prose for ${id} describing it in enough detail to be representative of a real product
model body, with a reference to \`ACT-A-001\` and some *emphasis* and a list:

- first bullet with moderate length text
- second bullet with moderate length text
- third bullet with moderate length text
`,
  ).join('\n');
}

/**
 * Write a synthetic model at the given multiple of the reference shape. Dense by construction:
 * every use case cites the first 8 terms and 4 rules, so early terms and the first context become
 * high-degree hubs; half the constraints are isolated; one artifact carries a long title and body.
 */
async function writeSyntheticModel(root: string, scale: number): Promise<void> {
  const model = join(root, 'docs/product/model');
  for (const dir of [
    'actors',
    'journeys',
    'use-cases',
    'business-rules',
    'domain/terms',
    'domain/bounded-contexts',
    'requirements/functional',
    'requirements/quality',
    'requirements/constraints',
  ]) {
    await mkdir(join(model, dir), { recursive: true });
  }
  await mkdir(join(root, 'docs/product/changes'), { recursive: true });
  await mkdir(join(root, '.product'), { recursive: true });
  await writeFile(
    join(root, '.product/config.yaml'),
    `schema: product-definition-as-code/config/v1alpha1
product:
  root: docs/product
  model: docs/product/model
  changes: docs/product/changes
generated:
  root: .product/generated
  commit: false
validation:
  warnings-as-errors: false
  require-journey-for-use-case: false
  require-requirement-reachability: false
`,
    'utf8',
  );

  const pad = (i: number): string => String(i + 1).padStart(3, '0');
  const n = {
    bc: 2 * scale,
    act: 4 * scale,
    term: 10 * scale,
    br: 6 * scale,
    uc: 16 * scale,
    jrn: 4 * scale,
    fr: 21 * scale,
    qr: 4 * scale,
    con: 6 * scale,
  };
  const bcs = Array.from({ length: n.bc }, (_, i) => `BC-C-${pad(i)}`);
  const acts = Array.from({ length: n.act }, (_, i) => `ACT-A-${pad(i)}`);
  const terms = Array.from({ length: n.term }, (_, i) => `TERM-T-${pad(i)}`);
  const brs = Array.from({ length: n.br }, (_, i) => `BR-R-${pad(i)}`);
  const ucs = Array.from({ length: n.uc }, (_, i) => `UC-U-${pad(i)}`);
  const jrns = Array.from({ length: n.jrn }, (_, i) => `JRN-J-${pad(i)}`);

  const write = (dir: string, id: string, content: string): Promise<void> =>
    writeFile(join(model, dir, `${id.toLowerCase()}.md`), content, 'utf8');

  await Promise.all(
    bcs.map((id, i) =>
      write(
        'domain/bounded-contexts',
        id,
        `---\nid: ${id}\ntype: bounded-context\ntitle: Bounded context ${i + 1}\nstatus: active\n---\n\n## Responsibility\n${body(2, id)}\n## Language\n${body(1, id)}\n## Boundaries\n${body(1, id)}\n## External Relationships\n${body(1, id)}\n`,
      ),
    ),
  );
  await Promise.all(
    acts.map((id, i) =>
      write(
        'actors',
        id,
        `---\nid: ${id}\ntype: actor\ntitle: ${i === 0 ? longTitle : `Actor ${i + 1}`}\nstatus: active\nactor-kind: human\n---\n\n## Purpose\n${body(i === 0 ? 12 : 2, id)}\n## Goals\n${body(1, id)}\n## Responsibilities\n${body(1, id)}\n## Boundaries\n${body(1, id)}\n`,
      ),
    ),
  );
  await Promise.all(
    terms.map((id, i) =>
      write(
        'domain/terms',
        id,
        `---\nid: ${id}\ntype: domain-term\ntitle: Term ${i + 1}\nstatus: active\ndefined-in: ${bcs[i % bcs.length]}\n---\n\n## Definition\n${body(1, id)}\n## Distinguish From\n${body(1, id)}\n## Usage\n${body(1, id)}\n`,
      ),
    ),
  );
  await Promise.all(
    brs.map((id, i) =>
      write(
        'business-rules',
        id,
        `---\nid: ${id}\ntype: business-rule\ntitle: Rule ${i + 1}\nstatus: active\napplies-to:\n  - ${bcs[i % bcs.length]}\n---\n\n## Rule\n${body(1, id)}\n## Rationale\n${body(1, id)}\n## Examples\n${body(1, id)}\n## Exceptions\n${body(1, id)}\n`,
      ),
    ),
  );
  await Promise.all(
    ucs.map((id, i) => {
      const t = terms
        .slice(0, Math.min(terms.length, 8))
        .map((x) => `  - ${x}`)
        .join('\n');
      const r = brs
        .slice(0, Math.min(brs.length, 4))
        .map((x) => `  - ${x}`)
        .join('\n');
      return write(
        'use-cases',
        id,
        `---\nid: ${id}\ntype: use-case\ntitle: Use case ${i + 1}\nstatus: ${i % 7 === 0 ? 'draft' : 'active'}\nprimary-actor: ${acts[i % acts.length]}\nsupporting-actors:\n  - ${acts[(i + 1) % acts.length]}\nbounded-context: ${bcs[0]}\ngoverned-by:\n${r}\nuses-terms:\n${t}\n---\n\n## Goal\n${body(2, id)}\n## Trigger\n${body(1, id)}\n## Preconditions\n${body(1, id)}\n## Main Flow\n${body(3, id)}\n## Alternative Flows\n${body(2, id)}\n## Failure Conditions\n${body(1, id)}\n## Postconditions\n${body(1, id)}\n`,
      );
    }),
  );
  await Promise.all(
    jrns.map((id, i) => {
      const steps =
        ucs
          .slice(i * 3, i * 3 + 4)
          .map((x) => `  - use-case: ${x}`)
          .join('\n') || `  - use-case: ${ucs[0]}`;
      return write(
        'journeys',
        id,
        `---\nid: ${id}\ntype: journey\ntitle: Journey ${i + 1}\nstatus: active\nprimary-actor: ${acts[i % acts.length]}\nsteps:\n${steps}\n---\n\n## Intended Outcome\n${body(2, id)}\n## Entry Conditions\n${body(1, id)}\n## Journey Narrative\n${body(3, id)}\n## Variants and Branches\n${body(1, id)}\n## Completion Conditions\n${body(1, id)}\n`,
      );
    }),
  );
  await Promise.all(
    Array.from({ length: n.con }, (_, i) => {
      const id = `CON-K-${pad(i)}`;
      // Half the constraints are isolated: no applies-to, therefore degree zero.
      const applies = i % 2 === 0 ? `applies-to:\n  - ${bcs[i % bcs.length]}\n` : '';
      return write(
        'requirements/constraints',
        id,
        `---\nid: ${id}\ntype: constraint\ntitle: Constraint ${i + 1}\nstatus: active\n${applies}---\n\n## Constraint\n${body(1, id)}\n## Rationale\n${body(1, id)}\n## Consequences\n${body(1, id)}\n`,
      );
    }),
  );
  await Promise.all(
    Array.from({ length: n.fr }, (_, i) => {
      const id = `FR-F-${pad(i)}`;
      return write(
        'requirements/functional',
        id,
        `---\nid: ${id}\ntype: functional-requirement\ntitle: Functional requirement ${i + 1}\nstatus: active\nderived-from:\n  - ${ucs[i % ucs.length]}\n  - ${brs[i % brs.length]}\nverification:\n  - scenario: Scenario one for requirement ${i + 1}\n  - scenario: Scenario two for requirement ${i + 1}\n---\n\n## Requirement\n${body(2, id)}\n## Rationale\n${body(1, id)}\n## Acceptance Scenarios\n${body(2, id)}\n`,
      );
    }),
  );
  await Promise.all(
    Array.from({ length: n.qr }, (_, i) => {
      const id = `QR-Q-${pad(i)}`;
      return write(
        'requirements/quality',
        id,
        `---\nid: ${id}\ntype: quality-requirement\ntitle: Quality requirement ${i + 1}\nstatus: active\nquality-attribute: attribute-${i + 1}\napplies-to:\n  - ${ucs[i % ucs.length]}\n  - ${jrns[i % jrns.length]}\nverification:\n  - scenario: Scenario for quality ${i + 1}\n---\n\n## Requirement\n${body(1, id)}\n## Measurement\n${body(1, id)}\n## Verification\n${body(1, id)}\n`,
      );
    }),
  );
}

const RUNS = 3;

async function measure(label: string, modelRoot: string): Promise<Measurement> {
  const registry = await SchemaRegistry.loadBundled();
  const { artifacts } = await loadModel(join(modelRoot, 'docs/product/model'), modelRoot, registry);
  const graph = compileGraph(artifacts);

  const degree = new Map<string, number>(graph.nodes.map((n) => [n.id, 0]));
  for (const edge of graph.edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  const degrees = [...degree.values()];

  const authoredBytes = artifacts.reduce(
    (sum, a) => sum + Buffer.byteLength(a.body ?? '', 'utf8'),
    0,
  );

  const times: number[] = [];
  let html = '';
  for (let i = 0; i < RUNS; i += 1) {
    const started = performance.now();
    html = buildSnapshotHtml(graph, artifacts, 'a'.repeat(40));
    times.push(performance.now() - started);
  }

  const fileBytes = Buffer.byteLength(html, 'utf8');
  const opening = openingMarkupBytes(html);
  const elements = artifactLevelElements(html);
  const round = (n: number, d = 3): number => Number(n.toFixed(d));

  /* Selection latency on the hardest artifacts: the longest body and the most relationships. */
  const longest = [...artifacts].sort((a, b) => (b.body?.length ?? 0) - (a.body?.length ?? 0))[0];
  const busiest = [...degree.entries()].sort((a, b) => b[1] - a[1])[0];
  const hardest = [longest?.id, busiest?.[0]].filter((x): x is string => Boolean(x));

  const dom = new JSDOM(html, {
    url: 'https://snapshot.invalid/snapshot.html',
    runScripts: 'dangerously',
  });
  const timings: number[] = [];
  /* Warm-up rounds are discarded so the recorded figures are not first-call JIT artifacts. */
  const WARMUP = 5;
  for (let round2 = 0; round2 < 20 + WARMUP; round2 += 1) {
    for (const id of hardest) {
      dom.window.location.hash = `#/artifacts/${id}`;
      const started = performance.now();
      dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
      const elapsed = performance.now() - started;
      if (round2 >= WARMUP) timings.push(elapsed);
      dom.window.location.hash = '#/artifacts';
      dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    }
  }
  /* The first-ever query in a fresh document, including the lazy index build. */
  let firstSearchMs = 0;
  {
    const cold = new JSDOM(html, {
      url: 'https://snapshot.invalid/snapshot.html#/artifacts',
      runScripts: 'dangerously',
    });
    const coldField = cold.window.document.getElementById('q-body') as HTMLInputElement | null;
    if (coldField) {
      coldField.value = 'product';
      const started = performance.now();
      coldField.dispatchEvent(new cold.window.Event('input'));
      firstSearchMs = round(performance.now() - started, 2);
    }
    cold.window.close();
  }

  /* Search: one match, a tenth of the model, everything. */
  const oneOnly = artifacts[0]?.id ?? 'nothing';
  const searchQueries = [oneOnly, 'product', 'e'];
  const searchTimings: number[] = [];
  const field = dom.window.document.getElementById('q-body') as HTMLInputElement | null;
  if (field) {
    dom.window.location.hash = '#/artifacts';
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    for (let r = 0; r < 10 + 3; r += 1) {
      for (const query of searchQueries) {
        field.value = query;
        const started = performance.now();
        field.dispatchEvent(new dom.window.Event('input'));
        const elapsed = performance.now() - started;
        if (r >= 3) searchTimings.push(elapsed);
      }
    }
  }

  /* Focused neighbourhood on the hardest anchors: the busiest artifact and an isolated one. */
  const isolated = [...degree.entries()].find(([, d]) => d === 0)?.[0];
  const focusAnchors = [busiest?.[0], isolated].filter((x): x is string => Boolean(x));
  const focusTimings: number[] = [];
  for (let r = 0; r < 10 + 3; r += 1) {
    for (const anchor of focusAnchors) {
      dom.window.location.hash = '#/artifacts';
      dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
      dom.window.location.hash = `#/graph/focus/${anchor}`;
      const started = performance.now();
      dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
      const elapsed = performance.now() - started;
      if (r >= 3) focusTimings.push(elapsed);
    }
  }

  /* The layered map for the whole model, plus what it reports holding back. */
  dom.window.location.hash = '#/artifacts';
  dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
  dom.window.location.hash = '#/graph/layers';
  const layersStarted = performance.now();
  dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
  const layersMs = round(performance.now() - layersStarted, 2);
  const layersDoc = dom.window.document;
  const drawnEdges = layersDoc.querySelectorAll('#graph-host line.ledge').length;
  const summaryText = layersDoc.querySelector('p.layersummary')?.textContent ?? '';
  const hiddenMatch = /(\d+) of \d+ artifacts collapsed/.exec(summaryText);
  const individualMatch = /(\d+) of \d+ relationships drawn individually/.exec(summaryText);

  dom.window.close();
  timings.sort((a, b) => a - b);
  focusTimings.sort((a, b) => a - b);
  searchTimings.sort((a, b) => a - b);
  const atOf = (list: number[], q: number): number =>
    round(list[Math.min(list.length - 1, Math.floor(list.length * q))] ?? 0, 2);
  const at = (q: number): number =>
    round(timings[Math.min(timings.length - 1, Math.floor(timings.length * q))] ?? 0, 2);

  return {
    model: label,
    artifacts: graph.nodes.length,
    relationships: graph.edges.length,
    maxDegree: degrees.length > 0 ? Math.max(...degrees) : 0,
    isolated: degrees.filter((d) => d === 0).length,
    authoredBytes,
    fileBytes,
    openingMarkupBytes: opening,
    openingMarkupShare: round(opening / fileBytes),
    artifactLevelNodes: elements.nodes,
    artifactLevelEdges: elements.edges,
    bytesPerAuthoredByte: round(fileBytes / authoredBytes),
    generationMs: { min: round(Math.min(...times), 1), max: round(Math.max(...times), 1) },
    generationMsPerArtifact: round(Math.min(...times) / graph.nodes.length, 3),
    selectionMs: {
      hardest: hardest.join(', '),
      samples: timings.length,
      p50: at(0.5),
      p95: at(0.95),
      max: round(timings.at(-1) ?? 0, 2),
    },
    firstSearchMs,
    focusMs: {
      anchors: focusAnchors,
      samples: focusTimings.length,
      p50: atOf(focusTimings, 0.5),
      p95: atOf(focusTimings, 0.95),
      max: round(focusTimings.at(-1) ?? 0, 2),
    },
    layersMs,
    layersDrawn: {
      connectors: drawnEdges,
      individualRelationships: individualMatch ? Number(individualMatch[1]) : 0,
      hiddenArtifacts: hiddenMatch ? Number(hiddenMatch[1]) : 0,
    },
    searchMs: {
      queries: searchQueries,
      samples: searchTimings.length,
      p50: atOf(searchTimings, 0.5),
      p95: atOf(searchTimings, 0.95),
      max: round(searchTimings.at(-1) ?? 0, 2),
    },
  };
}

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const scales = (flag('--scales') ?? '1,5,10').split(',').map((s) => Number(s.trim()));

const environment = {
  platform: `${os.type()} ${os.release()}`,
  arch: os.arch(),
  cpu: os.cpus()[0]?.model ?? 'unknown',
  cpus: os.cpus().length,
  totalMemoryGiB: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
  node: process.version,
  note: 'Generation-side figures. In-browser interaction latency is recorded separately against this same environment plus the browser version used.',
};

const results: Measurement[] = [];

results.push(await measure('current-product-model', repoRoot));

for (const scale of scales) {
  if (scale === 1) continue;
  const dir = await mkdtemp(join(tmpdir(), `prodshape-synth-${scale}x-`));
  try {
    await writeSyntheticModel(dir, scale);
    results.push(await measure(`synthetic-${scale}x`, dir));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const report = { schema: 'prodshape/snapshot-measurement/v1', environment, results };
const out = flag('--out');
if (out !== undefined) {
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

const pad = (s: string, n: number): string => s.padEnd(n);
const num = (n: number): string => n.toLocaleString('en-US');
process.stdout.write(`Reference environment\n`);
for (const [k, v] of Object.entries(environment)) {
  if (k === 'note') continue;
  process.stdout.write(`  ${pad(k, 16)} ${String(v)}\n`);
}
process.stdout.write(`\n`);
process.stdout.write(
  `${pad('model', 24)}${pad('artifacts', 11)}${pad('rels', 7)}${pad('file B', 12)}${pad('opening B', 12)}${pad('share', 8)}${pad('nodes/edges', 13)}${pad('gen ms', 14)}${pad('B/authored', 11)}${pad('select p95', 11)}${pad('search p95', 11)}${pad('focus p95', 11)}${pad('layers ms', 11)}\n`,
);
for (const r of results) {
  process.stdout.write(
    `${pad(r.model, 24)}${pad(num(r.artifacts), 11)}${pad(num(r.relationships), 7)}${pad(num(r.fileBytes), 12)}${pad(num(r.openingMarkupBytes), 12)}${pad(`${Math.round(r.openingMarkupShare * 100)}%`, 8)}${pad(`${r.artifactLevelNodes}/${r.artifactLevelEdges}`, 13)}${pad(`${r.generationMs.min}-${r.generationMs.max}`, 14)}${pad(String(r.bytesPerAuthoredByte), 11)}${pad(String(r.selectionMs.p95), 11)}${pad(String(r.searchMs.p95), 11)}${pad(String(r.focusMs.p95), 11)}${pad(String(r.layersMs), 11)}\n`,
  );
}
const first = results[0];
const last = results.at(-1);
if (first && last && last !== first) {
  const artifactGrowth = last.artifacts / first.artifacts;
  const openingGrowth = last.openingMarkupBytes / first.openingMarkupBytes;
  process.stdout.write(
    `\nAcross ${artifactGrowth.toFixed(1)}x artifacts: opening document grows ${openingGrowth.toFixed(2)}x (target < 2.00x), ` +
      `max degree ${last.maxDegree}, isolated ${last.isolated}\n`,
  );
}
if (out !== undefined) process.stdout.write(`\nRecorded to ${out}\n`);
