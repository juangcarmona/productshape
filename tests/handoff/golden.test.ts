import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  generateHandoff,
  loadChange,
  loadModel,
  parseWorkItemRef,
  SchemaRegistry,
  validateChange,
  defaultConfig,
} from '@product-definition-as-code/core';
import {
  changeDoc,
  createLifecycleRepo,
  functionalRequirementDoc,
  git,
  sliceDoc,
  useCaseDoc,
  write,
} from '../changes/lifecycle-fixture.js';

let root: string;

const changeDir = 'docs/product/changes/active/chg-annotate-001';

beforeAll(async () => {
  root = await createLifecycleRepo();
  const baseRevision = await git(root, 'rev-parse', 'HEAD');
  await write(
    root,
    `${changeDir}/change.md`,
    changeDoc({
      id: 'CHG-ANNOTATE-001',
      status: 'approved',
      baseRevision,
      add: ['UC-ANNOTATE-001', 'FR-ANNOTATE-001'],
    }),
  );
  await write(
    root,
    `${changeDir}/proposed/use-cases/uc-annotate-001.md`,
    useCaseDoc('UC-ANNOTATE-001'),
  );
  await write(
    root,
    `${changeDir}/proposed/requirements/functional/fr-annotate-001.md`,
    functionalRequirementDoc('FR-ANNOTATE-001', ['UC-ANNOTATE-001']),
  );
  await write(
    root,
    `${changeDir}/slices/sli-annotate-001.yaml`,
    sliceDoc({
      id: 'SLI-ANNOTATE-001',
      change: 'CHG-ANNOTATE-001',
      status: 'approved',
      requirement: 'FR-ANNOTATE-001',
      affects: ['UC-ANNOTATE-001'],
    }),
  );
}, 30_000);

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

function normalizeRevision(content: string): string {
  return content.replaceAll(/\b[0-9a-f]{40}\b/g, '<REVISION>');
}

describe('golden handoff outputs', () => {
  it('handoff and context are stable up to the source revision', async () => {
    const registry = await SchemaRegistry.loadBundled();
    const model = await loadModel(join(root, 'docs', 'product', 'model'), root, registry);
    const change = await loadChange(join(root, ...changeDir.split('/')), root, registry);
    const validation = validateChange(change, model.artifacts, [change], defaultConfig());
    expect(validation.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const slice = change.slices[0];
    expect(slice).toBeDefined();
    const result = await generateHandoff({
      repoRoot: root,
      graph: validation.overlayGraph,
      overlayArtifacts: validation.overlayArtifacts,
      change,
      slice: slice!,
      workItem: parseWorkItemRef('github:owner/repository#123', 'Annotate short links'),
      outDir: join(root, 'work', 'golden'),
      generatedAt: '2026-01-01T10:00:00.000Z',
    });
    expect('handoff' in result).toBe(true);
    if (!('handoff' in result)) return;

    const handoffYaml = normalizeRevision(await readFile(result.handoffPath, 'utf8'));
    const contextMd = normalizeRevision(await readFile(result.contextPath, 'utf8'));
    await expect(handoffYaml).toMatchFileSnapshot('__snapshots__/annotate-product-handoff.yaml');
    await expect(contextMd).toMatchFileSnapshot('__snapshots__/annotate-product-context.md');
  });
});
