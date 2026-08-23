import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addSpecKitIntegration,
  checkSpecKitIntegration,
  isSpecKitIntegrationInstalled,
  PDAC_SPECKIT_GUIDANCE,
  removeSpecKitIntegration,
  updateSpecKitIntegration,
} from '@prodshape/integration-speckit';

/**
 * Lifecycle tests for the Spec Kit integration: add, check, update, remove. The integration's
 * write surface is exactly three files — the managed guidance memory file, the CI example and
 * the ProductShape metadata — and it never creates the workspace or touches native Spec Kit
 * files (constitution, templates, scripts, feature directories).
 */

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'prodshape-speckit-install-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

async function scaffoldWorkspace(): Promise<void> {
  await mkdir(join(workDir, '.specify', 'memory'), { recursive: true });
  await writeFile(
    join(workDir, '.specify', 'memory', 'constitution.md'),
    '# Constitution\n\nUser-owned principles.\n',
    'utf8',
  );
}

describe('addSpecKitIntegration', () => {
  it('refuses to install without a Spec Kit workspace', async () => {
    await expect(addSpecKitIntegration(workDir)).rejects.toThrow(/specify init/);
  });

  it('writes the guidance file, the CI example and the metadata, and is idempotent', async () => {
    await scaffoldWorkspace();

    const first = await addSpecKitIntegration(workDir, { warningsAsErrors: false });
    expect(first.written).toEqual([
      '.specify/memory/pdac.md',
      '.product/integrations/speckit.ci.yml',
      '.product/integrations/speckit.json',
    ]);
    expect(await isSpecKitIntegrationInstalled(workDir)).toBe(true);
    expect(await readFile(join(workDir, '.specify', 'memory', 'pdac.md'), 'utf8')).toBe(
      PDAC_SPECKIT_GUIDANCE,
    );

    const second = await addSpecKitIntegration(workDir, { warningsAsErrors: false });
    expect(second.written).toEqual([]);
    expect(second.changes).toEqual([]);
  });

  it('never touches the constitution', async () => {
    await scaffoldWorkspace();
    const before = await readFile(join(workDir, '.specify', 'memory', 'constitution.md'), 'utf8');
    await addSpecKitIntegration(workDir);
    const after = await readFile(join(workDir, '.specify', 'memory', 'constitution.md'), 'utf8');
    expect(after).toBe(before);
  });

  it('reports changes without writing under dry-run', async () => {
    await scaffoldWorkspace();
    const result = await addSpecKitIntegration(workDir, { dryRun: true });
    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.written).toEqual([]);
    expect(await isSpecKitIntegrationInstalled(workDir)).toBe(false);
  });

  it('states the stale-citation policy verbatim in the CI example', async () => {
    await scaffoldWorkspace();
    await addSpecKitIntegration(workDir, { warningsAsErrors: true });
    const ci = await readFile(join(workDir, '.product', 'integrations', 'speckit.ci.yml'), 'utf8');
    expect(ci).toContain('stale citations BLOCK this gate');
    expect(ci).toContain('citations verify --provider speckit');
  });
});

describe('updateSpecKitIntegration and checkSpecKitIntegration', () => {
  it('restores an edited guidance file and check reports the drift first', async () => {
    await scaffoldWorkspace();
    await addSpecKitIntegration(workDir);

    const guidancePath = join(workDir, '.specify', 'memory', 'pdac.md');
    await writeFile(guidancePath, '# Edited by hand\n', 'utf8');

    const edited = await checkSpecKitIntegration(workDir);
    expect(edited.ok).toBe(false);
    expect(edited.checks.find((c) => c.name === 'guidance')?.ok).toBe(false);

    await updateSpecKitIntegration(workDir);
    expect(await readFile(guidancePath, 'utf8')).toBe(PDAC_SPECKIT_GUIDANCE);

    const healthy = await checkSpecKitIntegration(workDir);
    expect(healthy.ok).toBe(true);
    expect(healthy.checks.every((c) => c.ok)).toBe(true);
  });
});

describe('removeSpecKitIntegration', () => {
  it('removes exactly the managed files and leaves native Spec Kit files alone', async () => {
    await scaffoldWorkspace();
    await addSpecKitIntegration(workDir);

    const result = await removeSpecKitIntegration(workDir);
    expect(result.removed).toEqual([
      '.specify/memory/pdac.md',
      '.product/integrations/speckit.ci.yml',
      '.product/integrations/speckit.json',
    ]);
    expect(await isSpecKitIntegrationInstalled(workDir)).toBe(false);
    expect(
      await readFile(join(workDir, '.specify', 'memory', 'constitution.md'), 'utf8'),
    ).toContain('User-owned principles');

    const again = await removeSpecKitIntegration(workDir);
    expect(again.removed).toEqual([]);
  });
});
