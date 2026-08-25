import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { classifyConsumerDocuments } from '@prodshape/core';
import {
  enumerateSpecKitDocuments,
  isSpecKitWorkspace,
  specKitProvider,
} from '@prodshape/integration-speckit';

/**
 * Tests for the Spec Kit provider: enumeration of feature directories under `specs/` by
 * filesystem convention (Spec Kit has no enumeration CLI and no archive lifecycle), and its
 * composition with framework-neutral core scope classification.
 */

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'prodshape-speckit-pop-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

async function feature(name: string, files: Record<string, string>): Promise<void> {
  const dir = join(workDir, 'specs', name);
  await mkdir(dir, { recursive: true });
  for (const [file, content] of Object.entries(files)) {
    await writeFile(join(dir, file), content, 'utf8');
  }
}

describe('workspace detection', () => {
  it('detects a workspace by the .specify marker, features or not', async () => {
    expect(await isSpecKitWorkspace(workDir)).toBe(false);
    await mkdir(join(workDir, '.specify', 'memory'), { recursive: true });
    expect(await isSpecKitWorkspace(workDir)).toBe(true);
    expect(await specKitProvider.detectWorkspace(workDir)).toBe(true);
  });
});

describe('enumerateSpecKitDocuments', () => {
  it('enumerates spec.md, plan.md and tasks.md per feature directory, sorted, all current', async () => {
    await feature('002-later', { 'spec.md': '# Spec\n', 'plan.md': '# Plan\n' });
    await feature('001-first', {
      'spec.md': '# Spec\n',
      'plan.md': '# Plan\n',
      'tasks.md': '# Tasks\n',
      'research.md': '# Research is not part of the gated population\n',
    });

    const enumeration = await enumerateSpecKitDocuments(workDir);

    expect(enumeration.root).toBe('specs');
    expect(enumeration.diagnostics).toEqual([]);
    expect(enumeration.documents.map((d) => d.path)).toEqual([
      'specs/001-first/spec.md',
      'specs/001-first/plan.md',
      'specs/001-first/tasks.md',
      'specs/002-later/spec.md',
      'specs/002-later/plan.md',
    ]);
    expect(enumeration.documents.every((d) => !d.archived)).toBe(true);
    expect(enumeration.documents.map((d) => d.change)).toEqual([
      '001-first',
      '001-first',
      '001-first',
      '002-later',
      '002-later',
    ]);
    expect(enumeration.documents.map((d) => d.artifactKind)).toEqual([
      'spec',
      'plan',
      'tasks',
      'spec',
      'plan',
    ]);
  });

  it('enumerates zero documents for a workspace without specs/ (initialized, no features yet)', async () => {
    await mkdir(join(workDir, '.specify'), { recursive: true });
    const enumeration = await enumerateSpecKitDocuments(workDir);
    expect(enumeration.documents).toEqual([]);
    expect(enumeration.diagnostics).toEqual([]);
  });

  it('limits enumeration to one feature with the change option', async () => {
    await feature('001-first', { 'spec.md': '# Spec\n' });
    await feature('002-later', { 'spec.md': '# Spec\n' });

    const enumeration = await enumerateSpecKitDocuments(workDir, { change: '002-later' });
    expect(enumeration.documents.map((d) => d.path)).toEqual(['specs/002-later/spec.md']);

    const none = await enumerateSpecKitDocuments(workDir, { change: 'missing' });
    expect(none.documents).toEqual([]);
  });

  it('composes with core classification: bound, exempt and unclassified per document', async () => {
    await feature('001-first', {
      'spec.md': `<!-- pdac-scope: cited -->\n\n# Spec\n\n{pdac:cite id="FR-X" digest="sha256:1111111111111111111111111111111111111111111111111111111111111111"}\n`,
      'plan.md': `---\npdac-scope: none\npdac-scope-reason: plan carries no product semantics\n---\n# Plan\n`,
      'tasks.md': '# Tasks with no declaration\n',
    });

    const enumeration = await enumerateSpecKitDocuments(workDir);
    const classified = await classifyConsumerDocuments(enumeration.documents, workDir);

    expect(classified.map((c) => [c.document.artifactKind, c.state])).toEqual([
      ['spec', 'bound'],
      ['plan', 'exempt'],
      ['tasks', 'unclassified'],
    ]);
    const unclassified = classified.find((c) => c.state === 'unclassified');
    expect(unclassified?.diagnostics.map((d) => d.code)).toContain('PRODUCT064');
  });
});
