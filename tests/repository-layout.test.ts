import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('source-oriented repository layout', () => {
  it('keeps maintained source under src and prevents old source roots', () => {
    for (const path of ['src/packages', 'src/public-site', 'src/scripts']) {
      expect(existsSync(join(root, path)), `${path} should exist`).toBe(true);
    }
    for (const path of ['packages', 'site', 'scripts']) {
      expect(existsSync(join(root, path)), `${path} should not return`).toBe(false);
    }
  });

  it('keeps the publication engine and diagram authoring boundaries explicit', () => {
    expect(existsSync(join(root, 'src/public-site/astro.config.mjs'))).toBe(true);
    expect(existsSync(join(root, 'src/public-site/src/pages/[...path].astro'))).toBe(true);
    expect(existsSync(join(root, 'src/public-site/diagrams/productshape-publication.md'))).toBe(
      true,
    );
    expect(existsSync(join(root, 'src/scripts/render-mermaid.mjs'))).toBe(true);
  });
});
