import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SchemaRegistry,
  buildGraphJson,
  buildMermaid,
  buildTraceabilityJson,
  compileGraph,
  loadModel,
  stableJson,
} from '@prodshape/core';
import { repoRoot } from '../helpers.js';

async function minimalGraph() {
  const registry = await SchemaRegistry.loadBundled();
  const exampleRoot = join(repoRoot, 'examples', 'minimal');
  const model = await loadModel(join(exampleRoot, 'product', 'model'), exampleRoot, registry);
  expect(model.diagnostics).toEqual([]);
  return compileGraph(model.artifacts);
}

describe('golden graph outputs (examples/minimal)', () => {
  it('product-graph.json is stable', async () => {
    const graph = await minimalGraph();
    await expect(stableJson(buildGraphJson(graph))).toMatchFileSnapshot(
      '__snapshots__/minimal-product-graph.json',
    );
  });

  it('mermaid output is stable', async () => {
    const graph = await minimalGraph();
    await expect(buildMermaid(graph)).toMatchFileSnapshot('__snapshots__/minimal-graph.mmd');
  });

  it('traceability.json is stable', async () => {
    const graph = await minimalGraph();
    await expect(stableJson(buildTraceabilityJson(graph))).toMatchFileSnapshot(
      '__snapshots__/minimal-traceability.json',
    );
  });
});
