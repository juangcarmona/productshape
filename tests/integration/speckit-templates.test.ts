import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { extractScopeDeclaration, parseCitations } from '@prodshape/core';
import {
  addSpecKitIntegration,
  checkSpecKitIntegration,
  MANAGED_TEMPLATES,
  mergeTemplateBlock,
  removeSpecKitIntegration,
  removeTemplateBlock,
  updateSpecKitIntegration,
} from '@prodshape/integration-speckit';

/**
 * The generation-time half of the Spec Kit integration: managed PDaC blocks merged into the
 * workspace's own templates. Spec Kit copies the resolved template into every generated
 * document, so these blocks are what put the citation requirement in front of the generating
 * agent; the tests pin the merge mechanics (idempotent, user content preserved, removable) and
 * the safety property that an unfilled block can never classify or cite a document by accident.
 */

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'prodshape-speckit-tpl-'));
  await mkdir(join(workDir, '.specify', 'memory'), { recursive: true });
  await mkdir(join(workDir, '.specify', 'templates'), { recursive: true });
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

const USER_TEMPLATE = '# Feature Specification: [FEATURE]\n\n## User Scenarios\n\n[...]\n';

async function scaffoldTemplates(): Promise<void> {
  for (const managed of MANAGED_TEMPLATES) {
    await writeFile(join(workDir, ...managed.relative.split('/')), USER_TEMPLATE, 'utf8');
  }
}

async function parsedRecords(absolutePath: string, repoRoot: string) {
  return (await parseCitations(absolutePath, repoRoot)).records;
}

describe('template block merge mechanics', () => {
  it('appends the block preserving user content, idempotently, and strips it back out', () => {
    const managed = MANAGED_TEMPLATES[0]!;
    const merged = mergeTemplateBlock(USER_TEMPLATE, managed.block);
    expect(merged.changed).toBe(true);
    expect(merged.content).toContain(USER_TEMPLATE.trimEnd());
    expect(merged.content).toContain('Product Grounding (PDaC)');

    const again = mergeTemplateBlock(merged.content, managed.block);
    expect(again.changed).toBe(false);
    expect(again.content).toBe(merged.content);

    const stripped = removeTemplateBlock(merged.content);
    expect(stripped.changed).toBe(true);
    expect(stripped.content).not.toContain('pdac:template');
    expect(stripped.content).toContain('## User Scenarios');
  });

  it('replaces an outdated block in place without touching user content', () => {
    const managed = MANAGED_TEMPLATES[0]!;
    const outdated = mergeTemplateBlock(USER_TEMPLATE, managed.block).content.replace(
      'Product Grounding (PDaC)',
      'Old Section Name',
    );
    const remerged = mergeTemplateBlock(outdated, managed.block);
    expect(remerged.changed).toBe(true);
    expect(remerged.content).toContain('Product Grounding (PDaC)');
    expect(remerged.content).not.toContain('Old Section Name');
    expect(remerged.content).toContain('## User Scenarios');
  });
});

describe('block safety: an unfilled block never classifies or cites', () => {
  it('parses to zero citations, no scope declaration and no drift marker', async () => {
    for (const managed of MANAGED_TEMPLATES) {
      const document = mergeTemplateBlock(USER_TEMPLATE, managed.block).content;
      const path = join(workDir, 'probe.md');
      await writeFile(path, document, 'utf8');

      expect(await parsedRecords(path, workDir), managed.relative).toEqual([]);
      expect(extractScopeDeclaration(document, 'probe.md'), managed.relative).toBeNull();
      expect(
        document.split('\n').some((l) => /^\s*<!--\s*pdac-drift\b/.test(l)),
        managed.relative,
      ).toBe(false);
    }
  });
});

describe('integration lifecycle over templates', () => {
  it('add merges every present template, check reports health, remove restores', async () => {
    await scaffoldTemplates();

    const added = await addSpecKitIntegration(workDir);
    for (const managed of MANAGED_TEMPLATES) {
      expect(added.written).toContain(managed.relative);
      const content = await readFile(join(workDir, ...managed.relative.split('/')), 'utf8');
      expect(content).toContain('## User Scenarios');
      expect(content).toContain(managed.block);
    }
    expect(added.meta.templatePaths).toEqual(MANAGED_TEMPLATES.map((m) => m.relative));

    const healthy = await checkSpecKitIntegration(workDir);
    expect(healthy.ok).toBe(true);

    const removed = await removeSpecKitIntegration(workDir);
    for (const managed of MANAGED_TEMPLATES) {
      expect(removed.removed).toContain(managed.relative);
      const content = await readFile(join(workDir, ...managed.relative.split('/')), 'utf8');
      expect(content).not.toContain('pdac:template');
      expect(content).toContain('## User Scenarios');
    }
  });

  it('detects a template regenerated by Spec Kit and re-merges on update', async () => {
    await scaffoldTemplates();
    await addSpecKitIntegration(workDir);

    // `specify init --force` (or a Spec Kit upgrade) rewrites templates, wiping the block.
    const spec = MANAGED_TEMPLATES[0]!;
    const specPath = join(workDir, ...spec.relative.split('/'));
    await writeFile(specPath, USER_TEMPLATE, 'utf8');

    const drifted = await checkSpecKitIntegration(workDir);
    expect(drifted.ok).toBe(false);
    expect(drifted.checks.find((c) => c.name === `template: ${spec.relative}`)?.ok).toBe(false);

    await updateSpecKitIntegration(workDir);
    expect(await readFile(specPath, 'utf8')).toContain(spec.block);
    expect((await checkSpecKitIntegration(workDir)).ok).toBe(true);
  });

  it('treats a workspace without templates as not applicable, never unhealthy', async () => {
    const added = await addSpecKitIntegration(workDir);
    expect(added.meta.templatePaths).toEqual([]);
    const health = await checkSpecKitIntegration(workDir);
    expect(health.ok).toBe(true);
    expect(
      health.checks
        .filter((c) => c.name.startsWith('template:'))
        .every((c) => c.ok && c.detail.includes('not applicable')),
    ).toBe(true);
  });
});
