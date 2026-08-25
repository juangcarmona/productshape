import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listFilesRecursive, repoRoot, validateMarkdownDocument } from '../helpers.js';

describe('examples', () => {
  it('every artifact in examples/minimal validates without diagnostics', async () => {
    const files = await listFilesRecursive(
      join(repoRoot, 'examples', 'minimal', 'product', 'model'),
      '.md',
    );
    expect(files).toHaveLength(9);
    for (const file of files) {
      const result = await validateMarkdownDocument(file);
      expect.soft(result.diagnostics, result.file).toEqual([]);
    }
  });

  it.each([
    ['actor-wrong-prefix.md', 'PRODUCT004'],
    ['bounded-context-owns-terms.md', 'PRODUCT002'],
  ])('examples/invalid/%s stays broken with %s', async (fileName, expectedCode) => {
    const result = await validateMarkdownDocument(join(repoRoot, 'examples', 'invalid', fileName));
    expect(result.diagnostics.map((d) => d.code)).toContain(expectedCode);
  });
});
