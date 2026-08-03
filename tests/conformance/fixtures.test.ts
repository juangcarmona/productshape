import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import {
  listFilesRecursive,
  loadRegistry,
  repoRoot,
  validateMarkdownDocument,
} from '../helpers.js';

const validDir = join(repoRoot, 'tests', 'fixtures', 'valid');
const invalidDir = join(repoRoot, 'tests', 'fixtures', 'invalid');

describe('valid fixtures', () => {
  it('every valid Markdown fixture validates without diagnostics', async () => {
    const files = await listFilesRecursive(validDir, '.md');
    expect(files.length).toBeGreaterThanOrEqual(10);
    for (const file of files) {
      const result = await validateMarkdownDocument(file);
      expect.soft(result.diagnostics, result.file).toEqual([]);
    }
  });

  it.each([
    ['delivery-slice.yaml', 'delivery-slice'],
    ['product-handoff.yaml', 'product-handoff'],
    ['product-coverage.yaml', 'product-coverage'],
  ])('%s validates against the %s schema', async (fileName, kind) => {
    const registry = await loadRegistry();
    const data = parse(await readFile(join(validDir, fileName), 'utf8')) as unknown;
    expect(registry.validate(kind, data, fileName)).toEqual([]);
  });
});

describe('invalid fixtures', () => {
  it.each([
    ['invalid-yaml.md', 'PRODUCT001'],
    ['invalid-prefix.md', 'PRODUCT004'],
    ['missing-required-field.md', 'PRODUCT002'],
    ['unknown-property.md', 'PRODUCT002'],
    ['unknown-type.md', 'PRODUCT003'],
    ['wrong-lifecycle.md', 'PRODUCT002'],
    ['missing-section.md', 'PRODUCT009'],
    ['provenance-unknown-subfield.md', 'PRODUCT002'],
    ['provenance-missing-confidence.md', 'PRODUCT002'],
    ['duplicate-verification-scenario-id.md', 'PRODUCT005'],
  ])('%s produces %s', async (fileName, expectedCode) => {
    const result = await validateMarkdownDocument(join(invalidDir, fileName));
    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain(expectedCode);
    expect(result.diagnostics.every((d) => d.severity === 'error')).toBe(true);
  });

  it('partial coverage without scope fails the delivery-slice schema', async () => {
    const registry = await loadRegistry();
    const data = parse(
      await readFile(join(invalidDir, 'partial-without-scope.yaml'), 'utf8'),
    ) as unknown;
    const diagnostics = registry.validate('delivery-slice', data, 'partial-without-scope.yaml');
    expect(diagnostics.map((d) => d.code)).toContain('PRODUCT002');
  });
});
