import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '..', '..');

/**
 * Recursively collect all Markdown files under a directory.
 */
async function collectMarkdown(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectMarkdown(full)));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Extract all relative Markdown links from a file's content.
 * Matches [text](relative-path) and [text](relative-path#anchor).
 */
function extractLinks(content: string): { path: string; anchor?: string }[] {
  const links: { path: string; anchor?: string }[] = [];
  const pattern = /\[([^\]]*)\]\(([^)]+)\)/g;
  for (const match of content.matchAll(pattern)) {
    const target = match[2];
    // Skip absolute URLs, mailto, and hash-only links.
    if (
      target.startsWith('http://') ||
      target.startsWith('https://') ||
      target.startsWith('mailto:') ||
      target.startsWith('#')
    ) {
      continue;
    }
    const [path, anchor] = target.split('#');
    links.push({ path, anchor: anchor || undefined });
  }
  return links;
}

describe('Markdown link resolution', () => {
  it('every relative link under docs/product/model/ resolves to an existing file', async () => {
    const modelDir = join(repoRoot, 'docs', 'product', 'model');
    const files = await collectMarkdown(modelDir);
    expect(files.length).toBeGreaterThan(0);

    const broken: string[] = [];
    for (const file of files) {
      const content = await readFile(file, 'utf8');
      const links = extractLinks(content);
      for (const link of links) {
        if (!link.path) continue;
        const target = resolve(dirname(file), link.path);
        try {
          await stat(target);
        } catch {
          broken.push(`${relative(repoRoot, file)}: ${link.path}`);
        }
      }
    }
    expect(broken, `Broken links:\n${broken.join('\n')}`).toEqual([]);
  });
});
