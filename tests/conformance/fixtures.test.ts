import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  listFilesRecursive,
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
});
