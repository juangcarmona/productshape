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
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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
import { writeSyntheticModel } from './lib/synthetic-model.mts';

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
  /**
   * The Product Landscape: render latency plus the SLI-SNAPSHOT-007 landscape integrity properties.
   * Simultaneous title legibility is deliberately not among them. Focused-state behaviour and
   * focus-transition latency are not verified here; SLI-SNAPSHOT-008 owns both.
   */
  landscapeMs: {
    samples: number;
    warmupDiscarded: number;
    p50: number;
    p95: number;
    max: number;
    budgetMs: number;
    withinBudget: boolean;
  };
  landscape: {
    nodes: number;
    artifacts: number;
    stablePlacement: boolean;
    individuallyReachable: boolean;
    selectable: string;
    withinCanvas: boolean;
    noOverlap: boolean;
    aggregatedAway: number;
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

const RUNS = 3;

/*
 * Landscape-render sampling. QR-SCALABILITY-001 states a 250 ms p95 budget for whole-landscape
 * rendering. The percentile estimator takes the sample at index floor(n * 0.95) of the sorted
 * retained samples, so n must be large enough that the index does not simply land on the slowest
 * sample: at 40 retained samples p95 is the 39th of 40 and is a distinct order statistic from the
 * maximum, whereas at 20 the two coincide. 3 discarded warm-up samples keep once-per-document costs
 * out of a per-view-change figure.
 */
const LANDSCAPE_SAMPLES = 40;
const LANDSCAPE_WARMUP = 3;
const LANDSCAPE_BUDGET_MS = 250;

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

  /*
   * The landscape: render latency, then the SLI-SNAPSHOT-007 integrity properties, measured not
   * eyeballed.
   *
   * Sampling protocol. QR-SCALABILITY-001 states the budget as a 95th percentile, so one sample
   * cannot answer it. The landscape is entered LANDSCAPE_SAMPLES times, each time from the artifact
   * list so that every sample builds the whole canvas from nothing rather than re-showing a host that
   * is already populated. The measured interval runs from dispatching the navigation to the landscape
   * being ready for interaction — every node placed and activatable — which is synchronous here, so
   * the interval closes when the dispatch returns. The first LANDSCAPE_WARMUP samples are discarded:
   * they carry first-call JIT and the lazily built artifact index, which a reader pays once per
   * document rather than once per view change. The percentile is taken over the retained samples and
   * the slowest retained sample is reported alongside it.
   */
  const landscapeTimings: number[] = [];
  for (let s = 0; s < LANDSCAPE_WARMUP + LANDSCAPE_SAMPLES; s += 1) {
    dom.window.location.hash = '#/artifacts';
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    dom.window.location.hash = '#/graph/layers';
    const lsStarted = performance.now();
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    const elapsed = performance.now() - lsStarted;
    if (s >= LANDSCAPE_WARMUP) landscapeTimings.push(elapsed);
  }

  const lsDoc = dom.window.document;
  const geometry = (): { id: string; x: number; y: number; w: number; h: number }[] =>
    [...lsDoc.querySelectorAll('#graph-host g.lsnode')].map((n) => {
      const r = n.querySelector('rect.nodebox');
      return {
        id: n.getAttribute('data-member') ?? '',
        x: Number(r?.getAttribute('x')),
        y: Number(r?.getAttribute('y')),
        w: Number(r?.getAttribute('width')),
        h: Number(r?.getAttribute('height')),
      };
    });

  const before = geometry();
  const lsSvg = lsDoc.querySelector('#graph-host svg.landscape');
  /* Panning and zooming must move the camera, never the artifacts. */
  for (const key of ['ArrowRight', 'ArrowDown', '-', '+']) {
    lsSvg?.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true }));
  }
  const after = geometry();
  const stablePlacement =
    before.length === after.length &&
    before.every((b, i) => {
      const a = after[i];
      return a !== undefined && a.id === b.id && a.x === b.x && a.y === b.y;
    });

  const compiledIds = new Set(graph.nodes.map((n) => n.id));
  const nodeIds = new Set(before.map((b) => b.id));
  const individuallyReachable =
    nodeIds.size === compiledIds.size && [...compiledIds].every((id) => nodeIds.has(id));
  const focusable = [...lsDoc.querySelectorAll('#graph-host g.lsnode[tabindex="0"]')].length;

  /* Every artifact activated in turn, not sampled: at this size exhaustive is cheap. */
  let selected = 0;
  for (const node of lsDoc.querySelectorAll('#graph-host g.lsnode')) {
    const id = node.getAttribute('data-member');
    node.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    if (dom.window.location.hash === `#/graph/focus/${id}`) selected += 1;
    dom.window.location.hash = '#/graph/layers';
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
  }
  const selectable = `${selected}/${before.length}`;

  const vb = (lsDoc.querySelector('#graph-host svg.landscape')?.getAttribute('viewBox') ?? '')
    .split(' ')
    .map(Number);
  const [vx = 0, vy = 0, vw = 0, vh = 0] = vb;
  const withinCanvas = before.every(
    (b) => b.x >= vx && b.y >= vy && b.x + b.w <= vx + vw && b.y + b.h <= vy + vh,
  );
  let noOverlap = true;
  for (let i = 0; i < before.length && noOverlap; i += 1) {
    for (let j = i + 1; j < before.length; j += 1) {
      const a = before[i];
      const b = before[j];
      if (a === undefined || b === undefined) continue;
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
        noOverlap = false;
        break;
      }
    }
  }

  dom.window.close();
  timings.sort((a, b) => a - b);
  focusTimings.sort((a, b) => a - b);
  searchTimings.sort((a, b) => a - b);
  landscapeTimings.sort((a, b) => a - b);
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
    landscapeMs: {
      samples: landscapeTimings.length,
      warmupDiscarded: LANDSCAPE_WARMUP,
      p50: atOf(landscapeTimings, 0.5),
      p95: atOf(landscapeTimings, 0.95),
      max: round(landscapeTimings.at(-1) ?? 0, 2),
      budgetMs: LANDSCAPE_BUDGET_MS,
      withinBudget: atOf(landscapeTimings, 0.95) <= LANDSCAPE_BUDGET_MS,
    },
    landscape: {
      nodes: before.length,
      artifacts: graph.nodes.length,
      stablePlacement,
      individuallyReachable: individuallyReachable && focusable === before.length,
      selectable,
      withinCanvas,
      noOverlap,
      aggregatedAway: graph.nodes.length - before.length,
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
  `${pad('model', 24)}${pad('artifacts', 11)}${pad('rels', 7)}${pad('file B', 12)}${pad('opening B', 12)}${pad('share', 8)}${pad('nodes/edges', 13)}${pad('gen ms', 14)}${pad('B/authored', 11)}${pad('select p95', 11)}${pad('search p95', 11)}${pad('focus p95', 11)}${pad('lscape p95', 11)}${pad('integrity', 12)}\n`,
);
for (const r of results) {
  process.stdout.write(
    `${pad(r.model, 24)}${pad(num(r.artifacts), 11)}${pad(num(r.relationships), 7)}${pad(num(r.fileBytes), 12)}${pad(num(r.openingMarkupBytes), 12)}${pad(`${Math.round(r.openingMarkupShare * 100)}%`, 8)}${pad(`${r.artifactLevelNodes}/${r.artifactLevelEdges}`, 13)}${pad(`${r.generationMs.min}-${r.generationMs.max}`, 14)}${pad(String(r.bytesPerAuthoredByte), 11)}${pad(String(r.selectionMs.p95), 11)}${pad(String(r.searchMs.p95), 11)}${pad(String(r.focusMs.p95), 11)}${pad(String(r.landscapeMs.p95) + ' ms', 11)}${pad(
      [
        r.landscape.stablePlacement ? 'stable' : 'MOVED',
        r.landscape.individuallyReachable ? 'reachable' : 'UNREACHABLE',
        r.landscape.selectable,
        r.landscape.withinCanvas ? 'in-canvas' : 'CLIPPED',
        r.landscape.noOverlap ? 'no-overlap' : 'OVERLAP',
      ].join(' '),
      12,
    )}\n`,
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
