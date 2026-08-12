import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { discoverOpenSpecPopulation, extractScopeDeclaration } from '@prodshape/core';

/**
 * Tests for OpenSpec-aware citation verification: population discovery and scope declarations.
 *
 * These tests create temporary OpenSpec workspace structures on disk and verify that
 * `discoverOpenSpecPopulation` correctly discovers current vs archived changes, classifies
 * documents by scope declaration, and falls back to filesystem scanning when the OpenSpec CLI
 * is unavailable.
 *
 * The OpenSpec CLI may or may not be installed in the test environment, so the tests assert
 * against the filesystem-fallback path (which produces the same document set as the CLI path
 * for standard workspace layouts).
 */
describe('extractScopeDeclaration', () => {
  it('returns null when no declaration is present', () => {
    const content = '# Some doc\n\nNo scope here.';
    expect(extractScopeDeclaration(content, 'doc.md')).toBeNull();
  });

  it('detects pdac-scope: none in YAML frontmatter', () => {
    const content = `---\ntitle: Test\npdac-scope: none\n---\n\n# Body\n`;
    const result = extractScopeDeclaration(content, 'doc.md');
    expect(result).toEqual({ scope: 'none', source: 'doc.md' });
  });

  it('detects pdac-scope: cited in YAML frontmatter', () => {
    const content = `---\npdac-scope: cited\n---\n\n# Body\n`;
    const result = extractScopeDeclaration(content, 'doc.md');
    expect(result).toEqual({ scope: 'cited', source: 'doc.md' });
  });

  it('detects pdac-scope: none as an HTML comment', () => {
    const content = `# Some doc\n\n<!-- pdac-scope: none -->\n\nText.`;
    const result = extractScopeDeclaration(content, 'doc.md');
    expect(result).toEqual({ scope: 'none', source: 'doc.md' });
  });

  it('detects pdac-scope: cited as an HTML comment', () => {
    const content = `# Some doc\n\n<!-- pdac-scope: cited -->\n\nText.`;
    const result = extractScopeDeclaration(content, 'doc.md');
    expect(result).toEqual({ scope: 'cited', source: 'doc.md' });
  });

  it('returns null for an unrecognized pdac-scope value', () => {
    const content = `---\npdac-scope: maybe\n---\n\n# Body\n`;
    expect(extractScopeDeclaration(content, 'doc.md')).toBeNull();
  });

  it('does not match pdac-scope in prose (not frontmatter or comment)', () => {
    const content = `# Doc\n\nThe text pdac-scope: none is just prose.\n`;
    expect(extractScopeDeclaration(content, 'doc.md')).toBeNull();
  });
});

describe('discoverOpenSpecPopulation', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pdac-openspec-pop-'));
    const openspecDir = join(tempDir, 'openspec');
    const changesDir = join(openspecDir, 'changes');
    const archiveDir = join(changesDir, 'archive');
    const specsDir = join(openspecDir, 'specs');

    // --- Current change: add-feature-x ---
    const changeXDir = join(changesDir, 'add-feature-x');
    await mkdir(changeXDir, { recursive: true });
    // proposal.md: has a citation (cited)
    await writeFile(
      join(changeXDir, 'proposal.md'),
      `## Why\n\nAdd feature X.\n\n{pdac:cite id="FR-X" digest="sha256:0000000000000000000000000000000000000000000000000000000000000000"}\n`,
      'utf8',
    );
    // design.md: declares pdac-scope: none (excluded)
    await writeFile(
      join(changeXDir, 'design.md'),
      `---\npdac-scope: none\n---\n\n## Design\n\nNo citations needed.\n`,
      'utf8',
    );
    // tasks.md: no scope, no citations (undocumented)
    await writeFile(
      join(changeXDir, 'tasks.md'),
      `## Tasks\n\n- [ ] Task 1\n- [ ] Task 2\n`,
      'utf8',
    );
    // specs/foo/spec.md: has a citation (cited)
    await mkdir(join(changeXDir, 'specs', 'foo'), { recursive: true });
    await writeFile(
      join(changeXDir, 'specs', 'foo', 'spec.md'),
      `## Requirement\n\nFoo shall bar.\n\n{pdac:cite id="FR-Y" digest="sha256:1111111111111111111111111111111111111111111111111111111111111111"}\n`,
      'utf8',
    );

    // --- Current change: add-feature-y (all excluded) ---
    const changeYDir = join(changesDir, 'add-feature-y');
    await mkdir(changeYDir, { recursive: true });
    await writeFile(
      join(changeYDir, 'proposal.md'),
      `---\npdac-scope: none\n---\n\n## Why\n\nAdd feature Y.\n`,
      'utf8',
    );
    await writeFile(
      join(changeYDir, 'tasks.md'),
      `<!-- pdac-scope: none -->\n## Tasks\n\n- [ ] Task 1\n`,
      'utf8',
    );

    // --- Archived change: old-feature (should be excluded by default) ---
    const archivedDir = join(archiveDir, 'old-feature');
    await mkdir(archivedDir, { recursive: true });
    await writeFile(
      join(archivedDir, 'proposal.md'),
      `## Why\n\nOld feature.\n\n{pdac:cite id="FR-OLD" digest="sha256:2222222222222222222222222222222222222222222222222222222222222222"}\n`,
      'utf8',
    );
    await writeFile(join(archivedDir, 'tasks.md'), `## Tasks\n\n- [ ] Old task\n`, 'utf8');

    // --- Current specs (openspec/specs/) ---
    await mkdir(join(specsDir, 'bar'), { recursive: true });
    await writeFile(
      join(specsDir, 'bar', 'spec.md'),
      `## Requirement\n\nBar shall baz.\n\n{pdac:cite id="FR-Z" digest="sha256:3333333333333333333333333333333333333333333333333333333333333333"}\n`,
      'utf8',
    );
    // A spec with no citations and no scope (undocumented)
    await mkdir(join(specsDir, 'baz'), { recursive: true });
    await writeFile(join(specsDir, 'baz', 'spec.md'), `## Requirement\n\nBaz shall qux.\n`, 'utf8');
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('discovers current changes and specs, excluding archived by default', async () => {
    const population = await discoverOpenSpecPopulation(tempDir);

    // Documents from add-feature-x: proposal, design, tasks, specs/foo/spec.md
    // Documents from add-feature-y: proposal, tasks
    // Documents from specs/: bar/spec.md, baz/spec.md
    // Archived old-feature is excluded by default.
    const paths = population.documents.map((d) => d.path).sort();
    expect(paths).toContain('openspec/changes/add-feature-x/proposal.md');
    expect(paths).toContain('openspec/changes/add-feature-x/design.md');
    expect(paths).toContain('openspec/changes/add-feature-x/tasks.md');
    expect(paths).toContain('openspec/changes/add-feature-x/specs/foo/spec.md');
    expect(paths).toContain('openspec/changes/add-feature-y/proposal.md');
    expect(paths).toContain('openspec/changes/add-feature-y/tasks.md');
    expect(paths).toContain('openspec/specs/bar/spec.md');
    expect(paths).toContain('openspec/specs/baz/spec.md');

    // Archived is excluded.
    expect(paths.some((p) => p.includes('archive'))).toBe(false);
    expect(paths.some((p) => p.includes('old-feature'))).toBe(false);
  });

  it('classifies documents as cited, excluded, or undocumented', async () => {
    const population = await discoverOpenSpecPopulation(tempDir);

    // cited: add-feature-x/proposal.md, add-feature-x/specs/foo/spec.md, specs/bar/spec.md
    const citedPaths = population.cited.map((d) => d.path).sort();
    expect(citedPaths).toContain('openspec/changes/add-feature-x/proposal.md');
    expect(citedPaths).toContain('openspec/changes/add-feature-x/specs/foo/spec.md');
    expect(citedPaths).toContain('openspec/specs/bar/spec.md');

    // excluded: add-feature-x/design.md, add-feature-y/proposal.md, add-feature-y/tasks.md
    const excludedPaths = population.excluded.map((d) => d.path).sort();
    expect(excludedPaths).toContain('openspec/changes/add-feature-x/design.md');
    expect(excludedPaths).toContain('openspec/changes/add-feature-y/proposal.md');
    expect(excludedPaths).toContain('openspec/changes/add-feature-y/tasks.md');

    // undocumented: add-feature-x/tasks.md, specs/baz/spec.md
    const undocumentedPaths = population.undocumented.map((d) => d.path).sort();
    expect(undocumentedPaths).toContain('openspec/changes/add-feature-x/tasks.md');
    expect(undocumentedPaths).toContain('openspec/specs/baz/spec.md');
  });

  it('includes archived changes when includeArchived is true', async () => {
    const population = await discoverOpenSpecPopulation(tempDir, { includeArchived: true });

    const paths = population.documents.map((d) => d.path);
    expect(paths.some((p) => p.includes('archive/old-feature'))).toBe(true);

    // Archived documents should have archived: true.
    const archivedDocs = population.documents.filter((d) => d.archived);
    expect(archivedDocs.length).toBeGreaterThan(0);
    expect(archivedDocs.every((d) => d.change === 'old-feature')).toBe(true);
  });

  it('limits to a single change when change is specified', async () => {
    const population = await discoverOpenSpecPopulation(tempDir, { change: 'add-feature-x' });

    const changes = new Set(population.documents.map((d) => d.change));
    // Should only contain add-feature-x (and undefined for specs/).
    expect(changes.has('add-feature-x')).toBe(true);
    expect(changes.has('add-feature-y')).toBe(false);

    // Specs are still included (they are not change-scoped).
    const paths = population.documents.map((d) => d.path);
    expect(paths.some((p) => p.includes('specs/bar'))).toBe(true);
  });

  it('returns includeArchived flag reflecting the option', async () => {
    const defaultPop = await discoverOpenSpecPopulation(tempDir);
    expect(defaultPop.includeArchived).toBe(false);

    const archivedPop = await discoverOpenSpecPopulation(tempDir, { includeArchived: true });
    expect(archivedPop.includeArchived).toBe(true);
  });

  it('sets the root to the openspec directory', async () => {
    const population = await discoverOpenSpecPopulation(tempDir);
    expect(population.root).toBe(join(tempDir, 'openspec'));
  });

  it('handles a workspace with no changes gracefully', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'pdac-openspec-empty-'));
    try {
      await mkdir(join(emptyDir, 'openspec', 'specs'), { recursive: true });
      const population = await discoverOpenSpecPopulation(emptyDir);
      expect(population.documents).toEqual([]);
      expect(population.undocumented).toEqual([]);
      expect(population.cited).toEqual([]);
      expect(population.excluded).toEqual([]);
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });

  it('marks documents with the correct artifactKind', async () => {
    const population = await discoverOpenSpecPopulation(tempDir);
    const byPath = new Map(population.documents.map((d) => [d.path, d]));

    expect(byPath.get('openspec/changes/add-feature-x/proposal.md')?.artifactKind).toBe('proposal');
    expect(byPath.get('openspec/changes/add-feature-x/design.md')?.artifactKind).toBe('design');
    expect(byPath.get('openspec/changes/add-feature-x/tasks.md')?.artifactKind).toBe('tasks');
    expect(byPath.get('openspec/changes/add-feature-x/specs/foo/spec.md')?.artifactKind).toBe(
      'specs',
    );
    expect(byPath.get('openspec/specs/bar/spec.md')?.artifactKind).toBe('spec');
  });
});
