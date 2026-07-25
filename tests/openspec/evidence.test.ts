import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkSliceEvidence, findChangeHandoffDirs } from '@prodshape/adapter-openspec';
import { SchemaRegistry } from '@prodshape/core';
import { repoRoot } from '../helpers.js';

let root: string;
let registry: SchemaRegistry;

const fixtureHandoff = join(repoRoot, 'tests', 'fixtures', 'valid', 'product-handoff.yaml');

async function seedChangeDir(relDir: string, coverage?: string) {
  const dir = join(root, ...relDir.split('/'));
  await mkdir(dir, { recursive: true });
  await cp(fixtureHandoff, join(dir, 'product-handoff.yaml'));
  if (coverage !== undefined) {
    await writeFile(join(dir, 'product-coverage.yaml'), coverage, 'utf8');
  }
}

const passingCoverage = [
  'schema: product-definition-as-code/coverage/v1alpha1',
  'handoff: HOF-FIXTURE-001',
  'requirements:',
  '  FR-FIXTURE-002:',
  '    status: covered',
  '    specification:',
  '      - specs/demo/spec.md',
  '    verification:',
  '      - tests/demo.test.md',
  '',
].join('\n');

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'product-definition-evidence-'));
  registry = await SchemaRegistry.loadBundled();
  // One failing candidate (no coverage file) in the active workspace and one
  // passing candidate in the archive, both for CHG-FIXTURE-001/SLI-FIXTURE-001.
  await seedChangeDir('openspec/changes/impl-first');
  await seedChangeDir('openspec/changes/archive/2026-01-01-impl-final', passingCoverage);
  await mkdir(
    join(root, 'openspec', 'changes', 'archive', '2026-01-01-impl-final', 'specs', 'demo'),
    {
      recursive: true,
    },
  );
  await writeFile(
    join(
      root,
      'openspec',
      'changes',
      'archive',
      '2026-01-01-impl-final',
      'specs',
      'demo',
      'spec.md',
    ),
    '# spec\n',
    'utf8',
  );
  await mkdir(join(root, 'openspec', 'changes', 'archive', '2026-01-01-impl-final', 'tests'), {
    recursive: true,
  });
  await writeFile(
    join(root, 'openspec', 'changes', 'archive', '2026-01-01-impl-final', 'tests', 'demo.test.md'),
    '# verified\n',
    'utf8',
  );
  // Noise the discovery must skip: unrelated change, unparseable handoff.
  await mkdir(join(root, 'openspec', 'changes', 'unrelated'), { recursive: true });
  await writeFile(
    join(root, 'openspec', 'changes', 'unrelated', 'product-handoff.yaml'),
    'source:\n  product-change: CHG-OTHER-001\n  delivery-slice: SLI-OTHER-001\n',
    'utf8',
  );
  await mkdir(join(root, 'openspec', 'changes', 'broken'), { recursive: true });
  await writeFile(
    join(root, 'openspec', 'changes', 'broken', 'product-handoff.yaml'),
    ': not yaml [',
    'utf8',
  );
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('findChangeHandoffDirs', () => {
  it('finds matches in the active workspace and the archive, skipping noise', async () => {
    const dirs = await findChangeHandoffDirs(root, 'CHG-FIXTURE-001');
    expect(dirs.map((d) => d.relative)).toEqual([
      'openspec/changes/impl-first',
      'openspec/changes/archive/2026-01-01-impl-final',
    ]);
  });

  it('returns nothing for an unknown change', async () => {
    expect(await findChangeHandoffDirs(root, 'CHG-NOWHERE-001')).toEqual([]);
  });
});

describe('checkSliceEvidence', () => {
  it('reports found: false when no handoff references the slice', async () => {
    const evidence = await checkSliceEvidence(root, 'CHG-FIXTURE-001', 'SLI-NOWHERE-001', registry);
    expect(evidence.found).toBe(false);
    expect(evidence.diagnostics).toEqual([]);
  });

  it('accepts the first error-free candidate even when an earlier one fails', async () => {
    const evidence = await checkSliceEvidence(root, 'CHG-FIXTURE-001', 'SLI-FIXTURE-001', registry);
    expect(evidence.found).toBe(true);
    expect(evidence.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(evidence.covered).toEqual(['FR-FIXTURE-002']);
  });

  it('surfaces every candidate diagnostic when all candidates fail', async () => {
    await rm(
      join(
        root,
        'openspec',
        'changes',
        'archive',
        '2026-01-01-impl-final',
        'product-coverage.yaml',
      ),
    );
    const evidence = await checkSliceEvidence(root, 'CHG-FIXTURE-001', 'SLI-FIXTURE-001', registry);
    expect(evidence.found).toBe(true);
    expect(evidence.covered).toEqual([]);
    expect(evidence.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    // Restore the passing candidate for any later test.
    await writeFile(
      join(
        root,
        'openspec',
        'changes',
        'archive',
        '2026-01-01-impl-final',
        'product-coverage.yaml',
      ),
      passingCoverage,
      'utf8',
    );
  });
});
