import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listFilesRecursive, repoRoot, validateMarkdownDocument } from '../helpers.js';

const templatesDir = join(repoRoot, 'templates');

describe('templates conform to their schemas', () => {
  it('every Markdown template validates', async () => {
    const files = await listFilesRecursive(templatesDir, '.md');
    expect(files).toHaveLength(10);
    for (const file of files) {
      const result = await validateMarkdownDocument(file);
      expect.soft(result.diagnostics, result.file).toEqual([]);
    }
  });
});
