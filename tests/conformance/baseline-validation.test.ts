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

async function validateFixtureModel(name: string, group = 'invalid-models'): Promise<Diagnostic[]> {
  const registry = await SchemaRegistry.loadBundled();
  const fixtureRoot = join(repoRoot, 'tests', 'fixtures', group, name);
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

// A model that is schema-valid but carries advisory warnings is not an invalid model, so it
// lives outside invalid-models/ — that directory reads as an inventory of hard errors.
describe('warning-level models', () => {
  it('flags only the low-confidence draft (PRODUCT111), not the well-evidenced one', async () => {
    const diagnostics = await validateFixtureModel('low-confidence-draft', 'warning-models');
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(diagnostics.filter((d) => d.code === 'PRODUCT111').map((d) => d.artifact)).toEqual([
      'ACT-RECOVERED-001',
    ]);
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
    // Zero warnings: the CHG-BRAND-001 terms (TERM-METHODOLOGY,
    // TERM-REFERENCE-IMPLEMENTATION) are referenced from UC-INIT-001.
    const warnings = diagnostics.filter((d) => d.severity === 'warning');
    expect(warnings).toEqual([]);
    expect(graph.nodes).toHaveLength(63);
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
