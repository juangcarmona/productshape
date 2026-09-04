import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { repoRoot } from '../helpers.js';
import {
  applySpecKitProductChange,
  archiveSpecKitProductChange,
  createSpecKitProductChange,
  listSpecKitProductChanges,
  nextSpecKitRecoveryBatch,
  startSpecKitRecovery,
  validateSpecKitProductChange,
} from '@prodshape/integration-speckit';

async function workspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'prodshape-speckit-product-'));
  await mkdir(join(root, '.product'), { recursive: true });
  await writeFile(join(root, '.product', 'config.yaml'), 'version: v1alpha1\n', 'utf8');
  await mkdir(join(root, '.specify', 'memory'), { recursive: true });
  await cp(
    join(repoRoot, 'examples', 'minimal', 'product', 'model'),
    join(root, 'docs', 'product', 'model'),
    { recursive: true },
  );
  return root;
}

describe('Spec Kit PRODUCT adapter', () => {
  it('ships a separate Spec Kit extension command family', async () => {
    const manifest = parse(
      await readFile(join(repoRoot, 'extensions', 'speckit-pdac-product', 'extension.yml'), 'utf8'),
    ) as {
      extension: { id: string };
      requires: { speckit_version: string };
      provides: { commands: { name: string; file: string }[] };
    };
    expect(manifest.extension.id).toBe('pdac-product');
    expect(manifest.requires.speckit_version).toBe('>=1.0.4');
    expect(manifest.provides.commands).toHaveLength(6);
    expect(manifest.provides.commands.map((command) => command.name)).toContain(
      'speckit.pdac-product.change',
    );
  });

  it('keeps multiple named changes in an adapter-owned area and validates from disk', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'checkout-copy');
      await createSpecKitProductChange(root, 'billing-copy');
      expect((await listSpecKitProductChanges(root)).map((c) => c.name)).toEqual([
        'billing-copy',
        'checkout-copy',
      ]);
      const checked = await validateSpecKitProductChange(root, 'checkout-copy');
      expect(checked.change.id).toBe('CHG-CHECKOUT-COPY-001');
      expect(
        checked.diagnostics.every((d) => d.file?.includes('docs/product/changes/active') !== true),
      ).toBe(true);
      expect(
        existsSync(join(root, '.specify', 'productshape', 'changes', 'checkout-copy', 'change.md')),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('refuses unauthorized apply without changing the model or hosted state', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'safe-change');
      const change = join(root, '.specify', 'productshape', 'changes', 'safe-change', 'change.md');
      const before = await readFile(change, 'utf8');
      const model = join(root, 'docs', 'product', 'model');
      const modelBefore = await readFile(join(model, 'actors', 'act-visitor.md'), 'utf8');
      const result = await applySpecKitProductChange(root, 'safe-change');
      expect(result.outcome).toBe('refused');
      expect(await readFile(change, 'utf8')).toBe(before);
      expect(await readFile(join(model, 'actors', 'act-visitor.md'), 'utf8')).toBe(modelBefore);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('persists recovery under the Spec Kit area and resumes without chat state', async () => {
    const root = await workspace();
    try {
      await rm(join(root, 'docs', 'product', 'model'), { recursive: true, force: true });
      await startSpecKitRecovery(root, 'first-round');
      const resumed = await nextSpecKitRecoveryBatch(root, 'first-round', 1);
      expect(resumed.session.state.sessionId).toBe('first-round');
      expect(resumed.session.state.changeDir).toBe(
        '.specify/productshape/recoveries/first-round/product',
      );
      expect(
        existsSync(
          join(root, '.specify', 'productshape', 'recoveries', 'first-round', 'state.json'),
        ),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('archives only an applied change and leaves the accepted model untouched', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'archive-me');
      const change = join(root, '.specify', 'productshape', 'changes', 'archive-me', 'change.md');
      const content = await readFile(change, 'utf8');
      await writeFile(change, content.replace('status: draft', 'status: applied'), 'utf8');
      expect(await archiveSpecKitProductChange(root, 'archive-me')).toContain(
        '.specify/productshape/archive/archive-me',
      );
      expect(existsSync(join(root, '.specify', 'productshape', 'changes', 'archive-me'))).toBe(
        false,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('applies a valid authorized delta into the accepted model, then archives separately', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'add-outcome');
      const dir = join(root, '.specify', 'productshape', 'changes', 'add-outcome');
      const change = join(dir, 'change.md');
      const manifest = await readFile(change, 'utf8');
      await writeFile(
        change,
        manifest
          .replace('status: draft', 'status: approved')
          .replace('id: CHG-ADD-OUTCOME-001', 'id: CHG-INITIAL')
          .replace('  add: []', '  add:\n    - FR-ADDED-001'),
        'utf8',
      );
      await mkdir(join(dir, 'proposed', 'requirements', 'functional'), { recursive: true });
      await writeFile(
        join(dir, 'proposed', 'requirements', 'functional', 'fr-added-001.md'),
        `---\nid: FR-ADDED-001\ntype: functional-requirement\ntitle: Added outcome\nstatus: active\nderived-from:\n  - UC-SHORTEN-001\nverification:\n  - scenario: The added outcome is observable\n---\n\n## Requirement\n\nThe product delivers the added outcome.\n\n## Rationale\n\nIt is needed.\n\n## Acceptance Scenarios\n\nThe outcome is observable.\n`,
        'utf8',
      );
      const applied = await applySpecKitProductChange(root, 'add-outcome');
      expect(applied.outcome).toBe('applied');
      expect(
        existsSync(
          join(root, 'docs', 'product', 'model', 'requirements', 'functional', 'fr-added-001.md'),
        ),
      ).toBe(true);
      expect(await readFile(change, 'utf8')).toContain('status: applied');
      await archiveSpecKitProductChange(root, 'add-outcome');
      expect(
        existsSync(
          join(root, 'docs', 'product', 'model', 'requirements', 'functional', 'fr-added-001.md'),
        ),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
