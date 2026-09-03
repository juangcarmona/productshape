import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../helpers.js';
import {
  approve,
  createRepo,
  priceFloorSpec,
  snapshotTree,
  writeHostedChange,
} from './openspec-product-helpers.js';

/**
 * The production bridge proof: a consumer repository that installed the PACKED
 * @prodshape/integration-openspec (and the packed @prodshape/core it depends on) as a local
 * devDependency, exactly as the README documents, runs the installed bridge scripts with NO
 * PRODSHAPE_INTEGRATION_OPENSPEC_ENTRY override, so the scripts resolve the bare package
 * specifier from the consumer's node_modules. This is what the workspace-resolution CLI suite
 * cannot prove.
 *
 * Needs the OpenSpec CLI at the product floor (>= 1.7.0) on PATH, npm, and built dist in both
 * packages (pnpm build) so pnpm pack ships real files; skips otherwise.
 */

const isWindows = process.platform === 'win32';

function openspecOnPath(): boolean {
  const names = isWindows ? ['openspec.cmd', 'openspec.exe', 'openspec.bat'] : ['openspec'];
  return (process.env.PATH ?? '')
    .split(delimiter)
    .some((dir) => dir.length > 0 && names.some((name) => existsSync(join(dir, name))));
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

function run(
  command: string,
  args: string[],
  cwd: string,
  useShell = false,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: useShell });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

const openspecVersion = detectedOpenSpecVersion();
const distBuilt =
  existsSync(join(repoRoot, 'packages', 'integration-openspec', 'dist', 'index.js')) &&
  existsSync(join(repoRoot, 'packages', 'core', 'dist', 'index.js'));
const canRun = meetsProductFloor(openspecVersion) && distBuilt;

describe.skipIf(!canRun)(
  'packed-consumer bridge (needs openspec >= 1.7.0, npm and built dist)',
  () => {
    it(
      'the installed bridge resolves the packed package without the entry override',
      { timeout: 300_000 },
      async () => {
        const packDir = await mkdtemp(join(tmpdir(), 'prodshape-packed-'));
        const { root, base } = await createRepo();
        try {
          // 1. Pack the local packages; pnpm rewrites workspace:* to the real versions.
          for (const pkg of ['core', 'integration-openspec']) {
            const packed = run(
              'pnpm',
              ['--filter', `@prodshape/${pkg}`, 'pack', '--pack-destination', packDir],
              repoRoot,
              isWindows,
            );
            expect(packed.status, packed.stderr).toBe(0);
          }
          const tarballs = (await readdir(packDir)).filter((entry) => entry.endsWith('.tgz'));
          expect(tarballs).toHaveLength(2);

          // 2-3. Install both tarballs locally in the consumer, as the README documents.
          const install = run(
            'npm',
            [
              'install',
              '--save-dev',
              '--no-audit',
              '--no-fund',
              ...tarballs.map((entry) => join(packDir, entry)),
            ],
            root,
            isWindows,
          );
          expect(install.status, install.stderr).toBe(0);
          // The packed package delivered its schema assets.
          expect(
            existsSync(
              join(
                root,
                'node_modules',
                '@prodshape',
                'integration-openspec',
                'assets',
                'openspec-product-change-schema',
                'schema.yaml',
              ),
            ),
          ).toBe(true);

          // 5. Install the managed product schema through the installed package (bare specifier,
          // resolved from the consumer's node_modules; no workspace, no override).
          const added = run(
            process.execPath,
            [
              '--input-type=module',
              '-e',
              `const integration = await import('@prodshape/integration-openspec'); await integration.addOpenSpecIntegration(process.cwd(), { cliVersion: '${openspecVersion}' });`,
            ],
            root,
          );
          expect(added.status, added.stderr).toBe(0);
          expect(
            existsSync(join(root, 'openspec', 'schemas', 'product-change', 'schema.yaml')),
          ).toBe(true);

          // 4. The pinned OpenSpec CLI owns the container.
          const created = run(
            'openspec',
            ['new', 'change', 'spike-price', '--schema', 'product-change'],
            root,
            isWindows,
          );
          expect(created.status, created.stderr).toBe(0);
          await writeHostedChange(root, priceFloorSpec(base, { name: 'spike-price' }));

          const bridge = (script: string, ...args: string[]) =>
            run(
              process.execPath,
              [join(root, 'openspec', 'schemas', 'product-change', 'scripts', script), ...args],
              root,
            );

          // 6-8. Preflight, PRODUCT028 refusal, dry run, real apply, separate archive; the model
          // is untouched on every refusal and on the archive.
          const preflight = bridge('product-validate.mjs', '--change', 'spike-price');
          expect(preflight.stdout).toContain('Overlay validation: PASS.');
          expect(preflight.status).toBe(0);

          const before = await snapshotTree(root, 'docs/product/model');
          const refused = bridge('product-apply.mjs', '--change', 'spike-price');
          expect(refused.status).toBe(1);
          expect(refused.stdout).toContain('PRODUCT028');
          expect(refused.stdout).toContain("caller's authorisation policy");
          expect(await snapshotTree(root, 'docs/product/model')).toEqual(before);

          await approve(root, 'spike-price');
          const dryRun = bridge('product-apply.mjs', '--change', 'spike-price', '--dry-run');
          expect(dryRun.status, dryRun.stderr).toBe(0);
          expect(await snapshotTree(root, 'docs/product/model')).toEqual(before);

          const applied = bridge('product-apply.mjs', '--change', 'spike-price');
          expect(applied.status, applied.stderr).toBe(0);
          expect(applied.stdout).toContain('Product diff: 2 added, 1 modified, 0 removed.');
          const afterApply = await snapshotTree(root, 'docs/product/model');
          expect(afterApply.size).toBe(before.size + 2);

          const archive = run('openspec', ['archive', 'spike-price', '--yes'], root, isWindows);
          expect(archive.status, archive.stderr).toBe(0);
          expect(existsSync(join(root, 'openspec', 'changes', 'spike-price'))).toBe(false);
          const archived = await readdir(join(root, 'openspec', 'changes', 'archive'));
          expect(archived.some((entry) => entry.endsWith('spike-price'))).toBe(true);
          expect(await snapshotTree(root, 'docs/product/model')).toEqual(afterApply);
          expect(
            await readFile(
              join(
                root,
                'openspec',
                'changes',
                'archive',
                archived.find((entry) => entry.endsWith('spike-price'))!,
                'product-change',
                'change.md',
              ),
              'utf8',
            ),
          ).toContain('status: applied');
        } finally {
          await rm(root, { recursive: true, force: true });
          await rm(packDir, { recursive: true, force: true });
        }
      },
    );
  },
);
