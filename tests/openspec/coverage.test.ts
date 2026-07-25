import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkCoverage, locateOpenSpecChange } from '@prodshape/adapter-openspec';
import { SchemaRegistry } from '@prodshape/core';
import { repoRoot } from '../helpers.js';

let root: string;
let registry: SchemaRegistry;
const changeDir = () => join(root, 'openspec', 'changes', 'demo-change');
const labels = {
  handoff: 'openspec/changes/demo-change/product-handoff.yaml',
  coverage: 'openspec/changes/demo-change/product-coverage.yaml',
};

async function writeCoverage(content: string) {
  await writeFile(join(changeDir(), 'product-coverage.yaml'), content, 'utf8');
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'product-definition-coverage-'));
  registry = await SchemaRegistry.loadBundled();
  await mkdir(changeDir(), { recursive: true });
  // Reuse the valid handoff fixture (implements FR-FIXTURE-002).
  await cp(
    join(repoRoot, 'tests', 'fixtures', 'valid', 'product-handoff.yaml'),
    join(changeDir(), 'product-handoff.yaml'),
  );
  await mkdir(join(changeDir(), 'specs', 'demo'), { recursive: true });
  await writeFile(join(changeDir(), 'specs', 'demo', 'spec.md'), '# Demo spec\n', 'utf8');
  await mkdir(join(root, 'tests'), { recursive: true });
  await writeFile(join(root, 'tests', 'demo.test.ts'), '// evidence\n', 'utf8');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('locateOpenSpecChange', () => {
  it('finds an existing change and rejects unknown ones', async () => {
    expect('dir' in (await locateOpenSpecChange(root, 'demo-change'))).toBe(true);
    const missing = await locateOpenSpecChange(root, 'nope');
    expect('error' in missing && missing.error).toContain('nope');
  });
});

describe('checkCoverage', () => {
  it('fails with PRODUCT043 when the coverage file is missing', async () => {
    const result = await checkCoverage(root, changeDir(), registry, labels);
    expect(result.diagnostics.map((d) => d.code)).toContain('PRODUCT043');
    expect(result.uncovered).toEqual(['FR-FIXTURE-002']);
  });

  it('fails with PRODUCT043 when an implemented requirement is uncovered', async () => {
    await writeCoverage(
      [
        'schema: product-definition-as-code/coverage/v1alpha1',
        'handoff: HOF-FIXTURE-001',
        'requirements:',
        '  FR-FIXTURE-002:',
        '    status: uncovered',
        '',
      ].join('\n'),
    );
    const result = await checkCoverage(root, changeDir(), registry, labels);
    const product043 = result.diagnostics.filter((d) => d.code === 'PRODUCT043');
    expect(product043.some((d) => d.artifact === 'FR-FIXTURE-002')).toBe(true);
    expect(result.uncovered).toEqual(['FR-FIXTURE-002']);
  });

  it('fails when evidence paths do not exist (never inferred from names)', async () => {
    await writeCoverage(
      [
        'schema: product-definition-as-code/coverage/v1alpha1',
        'handoff: HOF-FIXTURE-001',
        'requirements:',
        '  FR-FIXTURE-002:',
        '    status: covered',
        '    specification:',
        '      - specs/demo/spec.md',
        '    verification:',
        '      - tests/does-not-exist.test.ts',
        '',
      ].join('\n'),
    );
    const result = await checkCoverage(root, changeDir(), registry, labels);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((d) => d.target === 'tests/does-not-exist.test.ts')).toBe(true);
  });

  it('fails when the coverage references a different handoff', async () => {
    await writeCoverage(
      [
        'schema: product-definition-as-code/coverage/v1alpha1',
        'handoff: HOF-OTHER-999',
        'requirements:',
        '  FR-FIXTURE-002:',
        '    status: covered',
        '    specification:',
        '      - specs/demo/spec.md',
        '    verification:',
        '      - tests/demo.test.ts',
        '',
      ].join('\n'),
    );
    const result = await checkCoverage(root, changeDir(), registry, labels);
    expect(result.diagnostics.some((d) => d.target === 'HOF-OTHER-999')).toBe(true);
  });

  it('passes with complete coverage and existing evidence', async () => {
    await writeCoverage(
      [
        'schema: product-definition-as-code/coverage/v1alpha1',
        'handoff: HOF-FIXTURE-001',
        'requirements:',
        '  FR-FIXTURE-002:',
        '    status: covered',
        '    specification:',
        '      - specs/demo/spec.md',
        '    verification:',
        '      - tests/demo.test.ts',
        '',
      ].join('\n'),
    );
    const result = await checkCoverage(root, changeDir(), registry, labels);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.covered).toEqual(['FR-FIXTURE-002']);
  });
});
