import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../helpers.js';

const execFileAsync = promisify(execFile);

/**
 * The only test that exercises the published artifact rather than the repo
 * tree: pack the CLI, install the tarball into a clean directory, and run
 * every binary the package declares. Generated skills and hooks invoke
 * `product-definition`, so a missing bin entry breaks every consumer
 * integration (public-brand spec: the alias must work with identical output).
 * Requires a prior `pnpm build` (dist/ is packed) and registry access for the
 * CLI's runtime dependencies.
 */

let scratch: string;

const isWindows = process.platform === 'win32';

function bin(name: string): string {
  return join(scratch, 'node_modules', '.bin', isWindows ? `${name}.cmd` : name);
}

async function runBin(name: string, args: string[], cwd = scratch) {
  try {
    const { stdout, stderr } = await execFileAsync(bin(name), args, {
      cwd,
      encoding: 'utf8',
      shell: isWindows,
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failed = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failed.code ?? 1, stdout: failed.stdout ?? '', stderr: failed.stderr ?? '' };
  }
}

beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'prodshape-package-'));
  const cliDir = join(repoRoot, 'packages', 'cli');
  try {
    await stat(join(cliDir, 'dist', 'bin.js'));
  } catch {
    throw new Error(
      'packages/cli/dist/bin.js is missing: this test packs the BUILT package — run `pnpm build` before the test suite',
    );
  }
  await execFileAsync('npm', ['pack', '--pack-destination', scratch], {
    cwd: cliDir,
    encoding: 'utf8',
    shell: isWindows,
  });
  const tarball = (await readdir(scratch)).find((f) => f.endsWith('.tgz'));
  expect(tarball).toBeDefined();
  await writeFile(join(scratch, 'package.json'), '{ "name": "scratch", "private": true }\n');
  await execFileAsync('npm', ['install', '--no-audit', '--no-fund', tarball as string], {
    cwd: scratch,
    encoding: 'utf8',
    shell: isWindows,
  });
}, 180_000);

afterAll(async () => {
  await rm(scratch, { recursive: true, force: true });
});

describe('packed tarball binaries', () => {
  it('installs both prodshape and product-definition', async () => {
    const entries = await readdir(join(scratch, 'node_modules', '.bin'));
    expect(entries.some((e) => e.startsWith('prodshape'))).toBe(true);
    expect(entries.some((e) => e.startsWith('product-definition'))).toBe(true);
  });

  it('the alias produces byte-identical output', async () => {
    const canonical = await runBin('prodshape', ['--help']);
    const alias = await runBin('product-definition', ['--help']);
    expect(canonical.code).toBe(0);
    expect(alias.code).toBe(0);
    expect(alias.stdout).toBe(canonical.stdout);
  }, 60_000);

  it('a real command works end to end through the alias', async () => {
    const init = await runBin('product-definition', ['init']);
    expect(init.code, init.stderr).toBe(0);
    const validate = await runBin('product-definition', ['validate']);
    expect(validate.code, validate.stderr).toBe(0);
  }, 60_000);
});
