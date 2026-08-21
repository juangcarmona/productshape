import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  classifyConsumerDocument,
  classifyConsumerDocuments,
  extractScopeDeclaration,
  type ConsumerDocument,
} from '@prodshape/core';
import { enumerateOpenSpecDocuments, openSpecProvider } from '@prodshape/integration-openspec';

/**
 * Tests for provider-aware citation verification: the OpenSpec provider enumerates the expected
 * current consumer-document population (never classifying anything), and framework-neutral core
 * classification assigns each enumerated document exactly one effective scope state —
 * `bound`, `exempt` or `unclassified`.
 *
 * These tests create temporary OpenSpec workspace structures on disk and verify that
 * `enumerateOpenSpecDocuments` correctly discovers current vs archived changes and falls back to
 * filesystem scanning when the OpenSpec CLI is unavailable, and that `classifyConsumerDocuments`
 * applies the scope model over the enumeration.
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
    expect(result).toEqual({ raw: 'none', value: 'none', source: 'doc.md' });
  });

  it('detects pdac-scope: cited in YAML frontmatter', () => {
    const content = `---\npdac-scope: cited\n---\n\n# Body\n`;
    const result = extractScopeDeclaration(content, 'doc.md');
    expect(result).toEqual({ raw: 'cited', value: 'cited', source: 'doc.md' });
  });

  it('detects pdac-scope: none as an HTML comment', () => {
    const content = `# Some doc\n\n<!-- pdac-scope: none -->\n\nText.`;
    const result = extractScopeDeclaration(content, 'doc.md');
    expect(result).toEqual({ raw: 'none', value: 'none', source: 'doc.md' });
  });

  it('detects pdac-scope: cited as an HTML comment', () => {
    const content = `# Some doc\n\n<!-- pdac-scope: cited -->\n\nText.`;
    const result = extractScopeDeclaration(content, 'doc.md');
    expect(result).toEqual({ raw: 'cited', value: 'cited', source: 'doc.md' });
  });

  it('reports an unrecognized pdac-scope value as an invalid declaration', () => {
    const content = `---\npdac-scope: maybe\n---\n\n# Body\n`;
    expect(extractScopeDeclaration(content, 'doc.md')).toEqual({
      raw: 'maybe',
      value: null,
      source: 'doc.md',
    });
  });

  it('does not match pdac-scope in prose (not frontmatter or comment)', () => {
    const content = `# Doc\n\nThe text pdac-scope: none is just prose.\n`;
    expect(extractScopeDeclaration(content, 'doc.md')).toBeNull();
  });
});

describe('classifyConsumerDocument', () => {
  const doc: ConsumerDocument = {
    path: 'openspec/changes/x/proposal.md',
    absolutePath: '/abs/openspec/changes/x/proposal.md',
    change: 'x',
    archived: false,
    artifactKind: 'proposal',
  };
  const citation = {
    id: 'FR-X',
    digest: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
    source: doc.path,
    line: 3,
    form: 'inline' as const,
  };

  it('binds a document that carries a citation without any declaration', () => {
    const result = classifyConsumerDocument(doc, null, [citation]);
    expect(result.state).toBe('bound');
    expect(result.diagnostics).toEqual([]);
  });

  it('binds a document declared cited, and fails it when it carries no citations', () => {
    const declaration = { raw: 'cited', value: 'cited' as const, source: doc.path };
    const withCitations = classifyConsumerDocument(doc, declaration, [citation]);
    expect(withCitations.state).toBe('bound');
    expect(withCitations.diagnostics).toEqual([]);

    const empty = classifyConsumerDocument(doc, declaration, []);
    expect(empty.state).toBe('bound');
    expect(empty.diagnostics).toEqual([
      expect.objectContaining({ severity: 'error', code: 'PRODUCT065', file: doc.path }),
    ]);
  });

  it('exempts a document declared none, and passes it without diagnostics', () => {
    const declaration = { raw: 'none', value: 'none' as const, source: doc.path };
    const result = classifyConsumerDocument(doc, declaration, []);
    expect(result.state).toBe('exempt');
    expect(result.diagnostics).toEqual([]);
  });

  it('fails an exemption contradicted by citations in the same document', () => {
    const declaration = { raw: 'none', value: 'none' as const, source: doc.path };
    const result = classifyConsumerDocument(doc, declaration, [citation]);
    expect(result.state).toBe('exempt');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ severity: 'error', code: 'PRODUCT066', file: doc.path }),
    ]);
  });

  it('leaves a document with neither declaration nor citations unclassified, and fails it', () => {
    const result = classifyConsumerDocument(doc, null, []);
    expect(result.state).toBe('unclassified');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ severity: 'error', code: 'PRODUCT064', file: doc.path }),
    ]);
  });

  it('fails an invalid declaration value and classifies nothing from it', () => {
    const declaration = { raw: 'maybe', value: null, source: doc.path };
    const result = classifyConsumerDocument(doc, declaration, []);
    expect(result.state).toBe('unclassified');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ severity: 'error', code: 'PRODUCT066', file: doc.path }),
    ]);
  });
});

describe('enumerateOpenSpecDocuments + classifyConsumerDocuments', () => {
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
    // proposal.md: has a citation (bound)
    await writeFile(
      join(changeXDir, 'proposal.md'),
      `## Why\n\nAdd feature X.\n\n{pdac:cite id="FR-X" digest="sha256:0000000000000000000000000000000000000000000000000000000000000000"}\n`,
      'utf8',
    );
    // design.md: declares pdac-scope: none (exempt)
    await writeFile(
      join(changeXDir, 'design.md'),
      `---\npdac-scope: none\n---\n\n## Design\n\nNo citations needed.\n`,
      'utf8',
    );
    // tasks.md: no scope, no citations (unclassified)
    await writeFile(
      join(changeXDir, 'tasks.md'),
      `## Tasks\n\n- [ ] Task 1\n- [ ] Task 2\n`,
      'utf8',
    );
    // specs/foo/spec.md: has a citation (bound)
    await mkdir(join(changeXDir, 'specs', 'foo'), { recursive: true });
    await writeFile(
      join(changeXDir, 'specs', 'foo', 'spec.md'),
      `## Requirement\n\nFoo shall bar.\n\n{pdac:cite id="FR-Y" digest="sha256:1111111111111111111111111111111111111111111111111111111111111111"}\n`,
      'utf8',
    );

    // --- Current change: add-feature-y (all exempt) ---
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
    // A spec with no citations and no scope (unclassified)
    await mkdir(join(specsDir, 'baz'), { recursive: true });
    await writeFile(join(specsDir, 'baz', 'spec.md'), `## Requirement\n\nBaz shall qux.\n`, 'utf8');
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('discovers current changes and specs, excluding archived by default', async () => {
    const enumeration = await enumerateOpenSpecDocuments(tempDir);

    // Documents from add-feature-x: proposal, design, tasks, specs/foo/spec.md
    // Documents from add-feature-y: proposal, tasks
    // Documents from specs/: bar/spec.md, baz/spec.md
    // Archived old-feature is excluded by default.
    const paths = enumeration.documents.map((d) => d.path).sort();
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

  it('classifies documents as bound, exempt, or unclassified', async () => {
    const enumeration = await enumerateOpenSpecDocuments(tempDir);
    const classified = await classifyConsumerDocuments(enumeration.documents, tempDir);

    const byState = (state: string) =>
      classified
        .filter((c) => c.state === state)
        .map((c) => c.document.path)
        .sort();

    // bound: add-feature-x/proposal.md, add-feature-x/specs/foo/spec.md, specs/bar/spec.md
    const bound = byState('bound');
    expect(bound).toContain('openspec/changes/add-feature-x/proposal.md');
    expect(bound).toContain('openspec/changes/add-feature-x/specs/foo/spec.md');
    expect(bound).toContain('openspec/specs/bar/spec.md');

    // exempt: add-feature-x/design.md, add-feature-y/proposal.md, add-feature-y/tasks.md
    const exempt = byState('exempt');
    expect(exempt).toContain('openspec/changes/add-feature-x/design.md');
    expect(exempt).toContain('openspec/changes/add-feature-y/proposal.md');
    expect(exempt).toContain('openspec/changes/add-feature-y/tasks.md');

    // unclassified: add-feature-x/tasks.md, specs/baz/spec.md — each carries PRODUCT064.
    const unclassified = byState('unclassified');
    expect(unclassified).toContain('openspec/changes/add-feature-x/tasks.md');
    expect(unclassified).toContain('openspec/specs/baz/spec.md');
    for (const c of classified.filter((c) => c.state === 'unclassified')) {
      expect(c.diagnostics).toEqual([expect.objectContaining({ code: 'PRODUCT064' })]);
    }
  });

  it('includes archived changes when includeArchived is true', async () => {
    const enumeration = await enumerateOpenSpecDocuments(tempDir, { includeArchived: true });

    const paths = enumeration.documents.map((d) => d.path);
    expect(paths.some((p) => p.includes('archive/old-feature'))).toBe(true);

    // Archived documents should have archived: true.
    const archivedDocs = enumeration.documents.filter((d) => d.archived);
    expect(archivedDocs.length).toBeGreaterThan(0);
    expect(archivedDocs.every((d) => d.change === 'old-feature')).toBe(true);
  });

  it('limits to a single change when change is specified', async () => {
    const enumeration = await enumerateOpenSpecDocuments(tempDir, { change: 'add-feature-x' });

    const changes = new Set(enumeration.documents.map((d) => d.change));
    // Should only contain add-feature-x (and undefined for specs/).
    expect(changes.has('add-feature-x')).toBe(true);
    expect(changes.has('add-feature-y')).toBe(false);

    // Specs are still included (they are not change-scoped).
    const paths = enumeration.documents.map((d) => d.path);
    expect(paths.some((p) => p.includes('specs/bar'))).toBe(true);
  });

  it('returns includeArchived flag reflecting the option', async () => {
    const defaultEnumeration = await enumerateOpenSpecDocuments(tempDir);
    expect(defaultEnumeration.includeArchived).toBe(false);

    const archivedEnumeration = await enumerateOpenSpecDocuments(tempDir, {
      includeArchived: true,
    });
    expect(archivedEnumeration.includeArchived).toBe(true);
  });

  it('reports the repository-relative openspec root', async () => {
    const enumeration = await enumerateOpenSpecDocuments(tempDir);
    expect(enumeration.root).toBe('openspec');
  });

  it('handles a workspace with no changes gracefully', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'pdac-openspec-empty-'));
    try {
      await mkdir(join(emptyDir, 'openspec', 'specs'), { recursive: true });
      const enumeration = await enumerateOpenSpecDocuments(emptyDir);
      expect(enumeration.documents).toEqual([]);
      expect(await classifyConsumerDocuments(enumeration.documents, emptyDir)).toEqual([]);
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });

  it('enumerates a specs-only workspace (no openspec/changes/ at all) without invoking the CLI', async () => {
    // Regression: a workspace with specs but no changes directory has zero changes by
    // construction. Older OpenSpec CLIs (1.3.x) reject `list` outright in such a workspace, and
    // consulting the CLI at all used to surface PRODUCT069 wherever it was missing or failing —
    // failing the gate for a population that needs no discovery.
    const specsOnlyDir = await mkdtemp(join(tmpdir(), 'pdac-openspec-specsonly-'));
    try {
      await mkdir(join(specsOnlyDir, 'openspec', 'specs', 'checkout'), { recursive: true });
      await writeFile(
        join(specsOnlyDir, 'openspec', 'specs', 'checkout', 'spec.md'),
        `## Requirement\n\nText.\n`,
        'utf8',
      );
      const enumeration = await enumerateOpenSpecDocuments(specsOnlyDir);
      expect(enumeration.diagnostics).toEqual([]);
      expect(enumeration.documents.map((d) => d.path)).toEqual(['openspec/specs/checkout/spec.md']);
    } finally {
      await rm(specsOnlyDir, { recursive: true, force: true });
    }
  });

  it('marks documents with the correct artifactKind', async () => {
    const enumeration = await enumerateOpenSpecDocuments(tempDir);
    const byPath = new Map(enumeration.documents.map((d) => [d.path, d]));

    expect(byPath.get('openspec/changes/add-feature-x/proposal.md')?.artifactKind).toBe('proposal');
    expect(byPath.get('openspec/changes/add-feature-x/design.md')?.artifactKind).toBe('design');
    expect(byPath.get('openspec/changes/add-feature-x/tasks.md')?.artifactKind).toBe('tasks');
    expect(byPath.get('openspec/changes/add-feature-x/specs/foo/spec.md')?.artifactKind).toBe(
      'specs',
    );
    expect(byPath.get('openspec/specs/bar/spec.md')?.artifactKind).toBe('spec');
  });

  it('implements the reusable provider contract', async () => {
    expect(openSpecProvider.name).toBe('openspec');
    expect(await openSpecProvider.detectWorkspace(tempDir)).toBe(true);

    const noWorkspace = await mkdtemp(join(tmpdir(), 'pdac-openspec-nows-'));
    try {
      expect(await openSpecProvider.detectWorkspace(noWorkspace)).toBe(false);
    } finally {
      await rm(noWorkspace, { recursive: true, force: true });
    }

    const enumeration = await openSpecProvider.enumerateDocuments(tempDir);
    expect(enumeration.documents.length).toBeGreaterThan(0);
  });
});
