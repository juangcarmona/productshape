import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SchemaRegistry,
  compileGraph,
  defaultConfig,
  loadModel,
  validateModel,
  type Diagnostic,
} from '@product-definition-as-code/core';
import { listFilesRecursive, repoRoot, schemasDir } from '../helpers.js';

async function validateFixtureModel(name: string): Promise<Diagnostic[]> {
  const registry = await SchemaRegistry.loadBundled();
  const fixtureRoot = join(repoRoot, 'tests', 'fixtures', 'invalid-models', name);
  const model = await loadModel(join(fixtureRoot, 'model'), fixtureRoot, registry);
  const graph = compileGraph(model.artifacts);
  return [
    ...model.diagnostics,
    ...validateModel(model.artifacts, graph, { config: defaultConfig() }),
  ];
}

describe('reference-level invalid models', () => {
  it.each([
    ['duplicate-id', 'PRODUCT005'],
    ['missing-target', 'PRODUCT006'],
    ['disallowed-target', 'PRODUCT007'],
    ['active-to-retired', 'PRODUCT008'],
  ])('%s produces %s', async (name, expectedCode) => {
    const diagnostics = await validateFixtureModel(name);
    expect(diagnostics.map((d) => d.code)).toContain(expectedCode);
  });
});

describe('self-hosted model through the full pipeline', () => {
  it('validates with zero errors and zero warnings under the repository configuration', async () => {
    const registry = await SchemaRegistry.loadBundled();
    const model = await loadModel(join(repoRoot, 'docs', 'product', 'model'), repoRoot, registry);
    const graph = compileGraph(model.artifacts);
    const config = defaultConfig();
    const diagnostics = [
      ...model.diagnostics,
      ...validateModel(model.artifacts, graph, { config }),
    ];
    expect(diagnostics).toEqual([]);
    expect(graph.nodes).toHaveLength(56);
    expect(graph.edges.length).toBeGreaterThan(60);
  });
});

describe('bundled schemas', () => {
  it('are byte-identical to the canonical schemas directory', async () => {
    const canonical = await listFilesRecursive(schemasDir, '.schema.json');
    expect(canonical.length).toBe(14);
    for (const file of canonical) {
      const name = file.split(/[\\/]/).pop() as string;
      const bundled = join(repoRoot, 'packages', 'core', 'schemas', name);
      expect(await readFile(bundled, 'utf8'), name).toBe(await readFile(file, 'utf8'));
    }
  });
});
