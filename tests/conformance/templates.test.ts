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

const templatesDir = join(repoRoot, 'templates');

describe('templates conform to their schemas', () => {
  it('every Markdown template validates (product-context.md is generated output, exempt)', async () => {
    const files = (await listFilesRecursive(templatesDir, '.md')).filter(
      (f) => !f.endsWith('product-context.md'),
    );
    expect(files).toHaveLength(10);
    for (const file of files) {
      const result = await validateMarkdownDocument(file);
      expect.soft(result.diagnostics, result.file).toEqual([]);
    }
  });

  it.each([
    ['delivery-slice.yaml', 'delivery-slice'],
    ['product-handoff.yaml', 'product-handoff'],
  ])('%s validates against the %s schema', async (fileName, kind) => {
    const registry = await loadRegistry();
    const data = parse(await readFile(join(templatesDir, fileName), 'utf8')) as unknown;
    expect(registry.validate(kind, data, fileName)).toEqual([]);
  });
});
