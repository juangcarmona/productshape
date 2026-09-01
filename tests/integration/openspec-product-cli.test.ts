import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile, rm } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { addOpenSpecIntegration } from '@prodshape/integration-openspec';
import { repoRoot } from '../helpers.js';
import {
  approve,
  createRepo,
  priceFloorSpec,
  snapshotTree,
  writeHostedChange,
} from './openspec-product-helpers.js';

/**
 * The OpenSpec-facing half of the product workflow proof, driven through the real `openspec` CLI
 * and the installed bridge script. Two complementary proofs stand in for the interactive
 * /opsx:apply slash command, which a test runner cannot execute:
 *
 * - the routing proof: `openspec instructions apply --json` returns the product schema's
 *   deterministic delegation instruction with the expected context, blocked until the delta
 *   exists;
 * - the execution proof: the installed bridge script drives applyOpenSpecProductChange through
 *   validation at apply time, the PRODUCT028 gate and the deterministic model write, and
 *   `openspec archive` afterwards moves only the container.
 *
 * The suite needs the OpenSpec CLI at the product workflow floor (>= 1.7.0) on PATH and the
 * built integration package (pnpm build) for the bridge's module resolution, and skips with the
 * reason in the suite name when either is missing.
 */

const isWindows = process.platform === 'win32';

function openspecOnPath(): boolean {
  const names = isWindows ? ['openspec.cmd', 'openspec.exe', 'openspec.bat'] : ['openspec'];
  return (process.env.PATH ?? '')
    .split(delimiter)
    .some((dir) => dir.length > 0 && names.some((name) => existsSync(join(dir, name))));
}

function runOpenspec(
  cwd: string,
  ...args: string[]
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('openspec', args, { cwd, encoding: 'utf8', shell: isWindows });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function detectedOpenSpecVersion(): string | undefined {
  if (!openspecOnPath()) return undefined;
  const result = spawnSync('openspec', ['--version'], { encoding: 'utf8', shell: isWindows });
  const match = `${result.stdout ?? ''}${result.stderr ?? ''}`.match(/(\d+\.\d+\.\d+)/);
  return match?.[1];
}

function meetsProductFloor(version: string | undefined): boolean {
  if (!version) return false;
  const [major = 0, minor = 0] = version.split('.').map((part) => Number.parseInt(part, 10));
  return major > 1 || (major === 1 && minor >= 7);
}

const openspecVersion = detectedOpenSpecVersion();
const integrationEntry = join(
  repoRoot,
  'packages',
  'integration-openspec',
  'dist',
  'index.js',
);
const canRun = meetsProductFloor(openspecVersion) && existsSync(integrationEntry);

/** The test resolution hook: production resolves @prodshape/integration-openspec from the
 * consumer's node_modules; the temp fixtures have none, so the script's documented entry
 * override points it at the built workspace package. */
const bridgeEnv = { PRODSHAPE_INTEGRATION_OPENSPEC_ENTRY: integrationEntry };

function runBridge(
  root: string,
  script: string,
  ...args: string[]
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [join(root, 'openspec', 'schemas', 'product', 'scripts', script), ...args],
    { cwd: root, encoding: 'utf8', env: { ...process.env, ...bridgeEnv } },
  );
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

async function createOpenSpecRepo(): Promise<{ root: string; base: string }> {
  const { root, base } = await createRepo();
  await addOpenSpecIntegration(root, { cliVersion: openspecVersion ?? '1.11.0' });
  return { root, base };
}

describe.skipIf(!canRun)(
  'openspec product workflow through the real OpenSpec CLI (needs openspec >= 1.7.0 and built dist)',
  () => {
    it('the installed schema is visible to openspec and pins new changes to it', async () => {
      const { root } = await createOpenSpecRepo();
      try {
        const schemas = runOpenspec(root, 'schemas', '--json');
        expect(schemas.status).toBe(0);
        const parsedSchemas = JSON.parse(schemas.stdout) as { schemas?: unknown } | unknown[];
        const rows = Array.isArray(parsedSchemas)
          ? parsedSchemas
          : ((parsedSchemas as { schemas?: unknown[] }).schemas ?? []);
        expect(JSON.stringify(rows)).toContain('"product"');

        const created = runOpenspec(root, 'new', 'change', 'spike-price', '--schema', 'product');
        expect(created.status).toBe(0);
        const metadata = parse(
          await readFile(join(root, 'openspec', 'changes', 'spike-price', '.openspec.yaml'), 'utf8'),
        ) as { schema: string; skip_specs?: boolean };
        expect(metadata.schema).toBe('product');
        // A schema with no specs artifact records skip_specs so openspec validate stays clean.
        expect(metadata.skip_specs).toBe(true);

        const validate = runOpenspec(root, 'validate', 'spike-price', '--no-interactive');
        expect(validate.status).toBe(0);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });

    it('status reports the two artifacts and instructions route apply through the bridge', async () => {
      const { root, base } = await createOpenSpecRepo();
      try {
        expect(runOpenspec(root, 'new', 'change', 'spike-price', '--schema', 'product').status).toBe(
          0,
        );

        // Before any artifact exists: apply is blocked on the delta.
        const blocked = runOpenspec(
          root,
          'instructions',
          'apply',
          '--change',
          'spike-price',
          '--json',
        );
        expect(blocked.status).toBe(0);
        const blockedPayload = JSON.parse(blocked.stdout) as Record<string, unknown>;
        expect(JSON.stringify(blockedPayload)).toContain('blocked');
        expect(JSON.stringify(blockedPayload)).toContain('delta');

        // Status is schema-driven: exactly the two artifacts, apply gated on the delta. Apply is
        // the schema's apply phase, never a third artifact.
        const status = runOpenspec(root, 'status', '--change', 'spike-price', '--json');
        expect(status.status).toBe(0);
        const statusPayload = JSON.parse(status.stdout) as {
          artifacts: { id: string }[];
          applyRequires?: string[];
        };
        expect(statusPayload.artifacts.map((artifact) => artifact.id).sort()).toEqual([
          'delta',
          'intent',
        ]);
        expect(statusPayload.applyRequires).toContain('delta');

        // The delta instruction carries the PDaC authoring contract.
        const delta = runOpenspec(root, 'instructions', 'delta', '--change', 'spike-price', '--json');
        expect(delta.status).toBe(0);
        const deltaPayload = JSON.parse(delta.stdout) as Record<string, unknown>;
        const deltaText = JSON.stringify(deltaPayload);
        expect(deltaText).toContain('product/change.md');
        expect(deltaText).toContain('operations.modify');

        // Author the hosted delta (the agent's work, pre-authored here), then apply is ready and
        // its instruction is the product schema's deterministic delegation.
        await writeHostedChange(root, priceFloorSpec(base, { name: 'spike-price' }));
        const ready = runOpenspec(
          root,
          'instructions',
          'apply',
          '--change',
          'spike-price',
          '--json',
        );
        expect(ready.status).toBe(0);
        const readyText = JSON.stringify(JSON.parse(ready.stdout));
        expect(readyText).not.toContain('"blocked"');
        expect(readyText).toContain('product-apply.mjs');
        expect(readyText).toContain('Do not archive this change as part of apply');
        expect(readyText).toContain('product/change.md');
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });

    it('the bridge script drives the deterministic apply and archive moves only the container', async () => {
      const { root, base } = await createOpenSpecRepo();
      try {
        expect(runOpenspec(root, 'new', 'change', 'spike-price', '--schema', 'product').status).toBe(
          0,
        );
        await writeHostedChange(root, priceFloorSpec(base, { name: 'spike-price' }));

        // Preflight through the validate bridge: clean overlay.
        const preflight = runBridge(root, 'product-validate.mjs', '--change', 'spike-price');
        expect(preflight.stdout).toContain('Overlay validation: PASS.');
        expect(preflight.status).toBe(0);

        // Outside the apply-authorised state the apply bridge refuses, exit 1, model untouched.
        const before = await snapshotTree(root, 'docs/product/model');
        const refused = runBridge(root, 'product-apply.mjs', '--change', 'spike-price');
        expect(refused.status).toBe(1);
        expect(refused.stdout).toContain('PRODUCT028');
        expect(await snapshotTree(root, 'docs/product/model')).toEqual(before);

        // The caller's authorisation act, then dry run, then the real apply.
        await approve(root, 'spike-price');
        const dryRun = runBridge(root, 'product-apply.mjs', '--change', 'spike-price', '--dry-run');
        expect(dryRun.status).toBe(0);
        expect(dryRun.stdout).toContain('Dry run; nothing was written.');
        expect(await snapshotTree(root, 'docs/product/model')).toEqual(before);

        const applied = runBridge(root, 'product-apply.mjs', '--change', 'spike-price');
        expect(applied.stderr).toBe('');
        expect(applied.status).toBe(0);
        expect(applied.stdout).toContain('Product diff: 2 added, 1 modified, 0 removed.');
        expect(applied.stdout).toContain('the change was not archived');
        const afterApply = await snapshotTree(root, 'docs/product/model');
        expect(afterApply.size).toBe(before.size + 2);
        expect(
          await readFile(
            join(root, 'openspec', 'changes', 'spike-price', 'product', 'change.md'),
            'utf8',
          ),
        ).toContain('status: applied');

        // Archive is a separate OpenSpec action: it moves the container and never touches the
        // model.
        const archive = runOpenspec(root, 'archive', 'spike-price', '--yes');
        expect(archive.status).toBe(0);
        expect(existsSync(join(root, 'openspec', 'changes', 'spike-price'))).toBe(false);
        const archived = await readdir(join(root, 'openspec', 'changes', 'archive'));
        expect(archived.some((entry) => entry.endsWith('spike-price'))).toBe(true);
        expect(await snapshotTree(root, 'docs/product/model')).toEqual(afterApply);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  },
);
