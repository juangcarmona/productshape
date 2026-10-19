import { describe, expect, it } from 'vitest';
import { parseArtifactDocument } from './parse.js';

describe('parseArtifactDocument', () => {
  it('parses frontmatter and body without loss', () => {
    const result = parseArtifactDocument(
      '---\nid: ACT-X-001\ntype: actor\n---\n\n## Purpose\n\nBody text.\n',
      'actors/act-x-001.md',
    );
    expect(result.diagnostics).toHaveLength(0);
    expect(result.artifact?.frontmatter).toMatchObject({ id: 'ACT-X-001', type: 'actor' });
    expect(result.artifact?.body).toContain('## Purpose');
  });

  it('reports invalid YAML as PRODUCT001 instead of throwing', () => {
    const result = parseArtifactDocument(
      '---\nid: ACT-X-001\n  broken: [\n---\nBody\n',
      'broken.md',
    );
    expect(result.artifact).toBeUndefined();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ severity: 'error', code: 'PRODUCT001', file: 'broken.md' }),
    ]);
  });

  it('reports missing frontmatter as PRODUCT001', () => {
    const result = parseArtifactDocument('# Just a heading\n', 'plain.md');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT001', file: 'plain.md' }),
    ]);
  });
});
