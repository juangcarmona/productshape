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
} from '@prodshape/core';
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
  it('validates with zero errors under the repository configuration', async () => {
    const registry = await SchemaRegistry.loadBundled();
    const model = await loadModel(join(repoRoot, 'docs', 'product', 'model'), repoRoot, registry);
    const graph = compileGraph(model.artifacts);
    const config = defaultConfig();
    const diagnostics = [
      ...model.diagnostics,
      ...validateModel(model.artifacts, graph, { config }),
    ];
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    // The only warnings are the two accepted PRODUCT106 advisories for the brand terms
    // (TERM-METHODOLOGY, TERM-REFERENCE-IMPLEMENTATION) added by CHG-BRAND-001; they are
    // not yet referenced by any use case. See docs/product/changes/completed/chg-brand-001.
    const warnings = diagnostics.filter((d) => d.severity === 'warning');
    expect(warnings.map((d) => d.code)).toEqual(['PRODUCT106', 'PRODUCT106']);
    expect(graph.nodes).toHaveLength(59);
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
