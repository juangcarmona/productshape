/**
 * The repository-mutation safety contract, exercised across the same interface the CLI uses.
 *
 * Every case here is a defect that shipped: a lock could name a path outside the repository and
 * have it deleted, `integration add --dry-run` wrote every managed file before announcing that it
 * had written nothing, removal deleted files a human had edited, and a malformed lock was read as
 * "nothing installed". The assertions are stated over observable outcomes — the bytes on disk, the
 * exit code, an external sentinel file — rather than over internal calls, so a future refactor of
 * the mutation module cannot make them vacuous.
 */
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '@prodshape/cli';
import {
  applyProviderRemoval,
  checkIntegrations,
  fileDigest,
  InstallationLockError,
  lockRelativePath,
  lockSchemaId,
  parseLock,
  planProviderRemoval,
  readLock,
  writeLock,
  type InstallationLock,
} from '@prodshape/distribution';
import { listFilesRecursive, toPosix } from '../helpers.js';

let scratch: string;
let repo: string;
/** A file outside the repository. Nothing this product does may ever touch it. */
let sentinel: string;
const SENTINEL_CONTENT = 'this file lives outside the repository and must never be touched\n';

async function run(argv: string[], cwd = repo) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, { cwd, out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

/** Every file in the repository with its exact bytes, for byte-identity comparisons. */
async function snapshotTree(root: string): Promise<Map<string, string>> {
  const files = await listFilesRecursive(root, '');
  const snapshot = new Map<string, string>();
  for (const file of files) {
    const relative = toPosix(file).slice(toPosix(root).length + 1);
    snapshot.set(relative, await readFile(file, 'utf8'));
  }
  return snapshot;
}

/** Modification times too: a byte-identical rewrite is still a rewrite. */
async function snapshotMtimes(root: string): Promise<Map<string, number>> {
  const files = await listFilesRecursive(root, '');
  const snapshot = new Map<string, number>();
  for (const file of files) {
    const relative = toPosix(file).slice(toPosix(root).length + 1);
    snapshot.set(relative, (await stat(file)).mtimeMs);
  }
  return snapshot;
}

async function writeRaw(relative: string, content: string): Promise<void> {
  const absolute = join(repo, ...relative.split('/'));
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content, 'utf8');
}

async function readRaw(relative: string): Promise<string> {
  return readFile(join(repo, ...relative.split('/')), 'utf8');
}

beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'prodshape-mutation-safety-'));
  repo = join(scratch, 'repo');
  await mkdir(join(repo, '.git'), { recursive: true });
  sentinel = join(scratch, 'sentinel.txt');
  await writeFile(sentinel, SENTINEL_CONTENT, 'utf8');
  const init = await run(['init', '--ai', 'claude']);
  expect(init.code, init.err).toBe(0);
});

afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

describe('a repository-controlled lock cannot escape the repository', () => {
  const hostilePaths = [
    '../sentinel.txt',
    '../../sentinel.txt',
    '/etc/passwd',
    'C:/Windows/System32/drivers/etc/hosts',
    '..\\sentinel.txt',
    'a/../../sentinel.txt',
    '',
  ];

  it('refuses to load a lock that records a path outside the repository', async () => {
    for (const hostile of hostilePaths) {
      await writeRaw(
        lockRelativePath,
        JSON.stringify({
          schema: lockSchemaId,
          version: '0.0.0-test',
          providers: { claude: { files: { [hostile]: fileDigest(SENTINEL_CONTENT) } } },
        }),
      );
      await expect(readLock(repo), hostile).rejects.toThrow(InstallationLockError);
    }
  });

  it('leaves the external sentinel byte-identical when a hostile lock drives removal', async () => {
    await writeRaw(
      lockRelativePath,
      JSON.stringify({
        schema: lockSchemaId,
        version: '0.0.0-test',
        providers: {
          claude: {
            files: Object.fromEntries(
              hostilePaths
                .filter((p) => p !== '')
                .map((path) => [path, fileDigest(SENTINEL_CONTENT)]),
            ),
          },
        },
      }),
    );

    const removal = await run(['integration', 'remove', 'claude']);
    expect(removal.code).toBe(1);
    expect(removal.err).toContain('cannot be trusted');
    expect(await readFile(sentinel, 'utf8')).toBe(SENTINEL_CONTENT);

    // Forced removal is the destructive path, and it is refused just as hard.
    const forced = await run(['integration', 'remove', 'claude', '--force']);
    expect(forced.code).toBe(1);
    expect(await readFile(sentinel, 'utf8')).toBe(SENTINEL_CONTENT);
  });

  it('rejects a hostile path in the plan even when the lock bypassed validation', async () => {
    // The lock schema refuses these entries at load, so this states the second layer: a plan built
    // from a lock object that never passed validation still resolves nothing outside the root.
    const hostileLock: InstallationLock = {
      schema: lockSchemaId,
      version: '0.0.0-test',
      providers: {
        claude: {
          files: Object.fromEntries(
            hostilePaths
              .filter((p) => p !== '')
              .map((path) => [path, fileDigest(SENTINEL_CONTENT)]),
          ),
        },
      },
    };

    const plan = await planProviderRemoval(repo, 'claude', { lock: hostileLock });
    expect(plan.removed).toEqual([]);
    expect(plan.preserved).toEqual([]);
    expect(plan.rejected.map((r) => r.path).sort()).toEqual(
      hostilePaths.filter((p) => p !== '').sort(),
    );
    expect(plan.lockEntryRemoved).toBe(false);

    await applyProviderRemoval(repo, plan);
    expect(await readFile(sentinel, 'utf8')).toBe(SENTINEL_CONTENT);
  });

  it('refuses a lock whose digests are not digests', async () => {
    await writeRaw(
      lockRelativePath,
      JSON.stringify({
        schema: lockSchemaId,
        version: '0.0.0-test',
        providers: { claude: { files: { '.claude/x.md': 'not-a-digest' } } },
      }),
    );
    await expect(readLock(repo)).rejects.toThrow(/sha256 digest/);
  });

  it('refuses a lock carrying an unrecognized schema identifier', () => {
    expect(() =>
      parseLock(JSON.stringify({ schema: 'something-else', version: '1', providers: {} })),
    ).toThrow(/schema/);
  });
});

describe('integration add --dry-run performs zero writes', () => {
  it.each(['claude', 'copilot', 'codex'])(
    'leaves the repository byte-identical for %s',
    async (provider) => {
      const before = await snapshotTree(repo);
      const result = await run(['integration', 'add', provider, '--dry-run']);
      expect(result.code, result.err).toBe(0);
      expect(result.out).toContain('Dry run');
      // The report must be a report, not a claim: it names what it would create.
      expect(result.out).toMatch(/would (create|regenerate|overwrite)/);
      expect(await snapshotTree(repo)).toEqual(before);
    },
  );

  it('reports the same set of files the real run then writes', async () => {
    const dry = await run(['integration', 'add', 'copilot', '--dry-run']);
    const wouldCreate = dry.out
      .split('\n')
      .filter((line) => line.includes('would create:'))
      .map((line) => line.split('would create:')[1]?.trim())
      .filter((value): value is string => value !== undefined)
      .sort();
    expect(wouldCreate.length).toBeGreaterThan(0);

    const before = await snapshotTree(repo);
    const real = await run(['integration', 'add', 'copilot']);
    expect(real.code, real.err).toBe(0);
    const after = await snapshotTree(repo);
    const created = [...after.keys()].filter((path) => !before.has(path)).sort();
    // The lock is written by the apply and is not a provider file, so it is excluded.
    expect(created.filter((path) => path !== lockRelativePath)).toEqual(wouldCreate);
  });

  it('predicts a conflict refusal instead of reporting a success it cannot deliver', async () => {
    await writeRaw('.github/prompts/product-audit.prompt.md', 'hand written\n');
    const before = await snapshotTree(repo);
    const dry = await run(['integration', 'add', 'copilot', '--dry-run']);
    expect(dry.code).toBe(1);
    expect(dry.err).toContain('Refusing to overwrite');
    expect(await snapshotTree(repo)).toEqual(before);

    const real = await run(['integration', 'add', 'copilot']);
    expect(real.code).toBe(1);
    expect(await snapshotTree(repo)).toEqual(before);
  });

  it.each(['openspec', 'speckit'])('leaves the repository byte-identical for %s', async (sdd) => {
    // Both SDD integrations require their own workspace; the invariant under test is that a dry
    // run writes nothing whether it can proceed or refuses.
    if (sdd === 'speckit') await mkdir(join(repo, '.specify', 'templates'), { recursive: true });
    const before = await snapshotTree(repo);
    await run(['integration', 'add', sdd, '--dry-run']);
    expect(await snapshotTree(repo)).toEqual(before);
  });
});

describe('integration removal is drift-safe', () => {
  const managed = '.claude/skills/define-product/SKILL.md';

  it('preserves a hand-edited managed file and keeps its lock entry', async () => {
    await writeRaw(managed, 'I edited this by hand\n');

    const result = await run(['integration', 'remove', 'claude']);
    expect(result.code, result.err).toBe(0);
    expect(result.out).toContain(`preserved (modified by hand): ${managed}`);
    expect(await readRaw(managed)).toBe('I edited this by hand\n');

    // The entry stays, so the file is still covered by drift checking rather than orphaned.
    const lock = await readLock(repo);
    expect(Object.keys(lock?.providers.claude?.files ?? {})).toEqual([managed]);
    expect((await checkIntegrations(repo)).map((d) => d.code)).toEqual(['PRODUCT051']);
  });

  it('removes everything it can prove is its own and untouched', async () => {
    const before = await snapshotTree(repo);
    const result = await run(['integration', 'remove', 'claude']);
    expect(result.code, result.err).toBe(0);
    const after = await snapshotTree(repo);
    const gone = [...before.keys()].filter((path) => !after.has(path));
    expect(gone.length).toBeGreaterThan(0);
    expect(gone.every((path) => path.startsWith('.claude/'))).toBe(true);
    expect((await readLock(repo))?.providers.claude).toBeUndefined();
  });

  it('removes a drifted file only when --force is given', async () => {
    await writeRaw(managed, 'I edited this by hand\n');
    const forced = await run(['integration', 'remove', 'claude', '--force']);
    expect(forced.code, forced.err).toBe(0);
    expect(forced.out).toContain(managed);
    await expect(readRaw(managed)).rejects.toThrow();
    expect((await readLock(repo))?.providers.claude).toBeUndefined();
  });

  it('reports what a removal would do without changing anything', async () => {
    await writeRaw(managed, 'I edited this by hand\n');
    const before = await snapshotTree(repo);
    const dry = await run(['integration', 'remove', 'claude', '--dry-run']);
    expect(dry.code, dry.err).toBe(0);
    expect(dry.out).toContain('Dry run');
    expect(dry.out).toContain(`preserved (modified by hand): ${managed}`);
    expect(dry.out).toMatch(/would remove: \.claude\//);
    expect(await snapshotTree(repo)).toEqual(before);

    // And the report matches what the real removal then does.
    const wouldRemove = dry.out
      .split('\n')
      .filter((line) => line.includes('would remove:'))
      .map((line) => line.split('would remove:')[1]?.trim())
      .sort();
    const real = await run(['integration', 'remove', 'claude']);
    const removed = real.out
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('.claude/'))
      .sort();
    expect(removed).toEqual(wouldRemove);
  });

  it('reports a file the lock owns that is already gone, and drops its entry', async () => {
    await rm(join(repo, ...managed.split('/')), { force: true });
    const dry = await run(['integration', 'remove', 'claude', '--dry-run']);
    expect(dry.out).toContain(`already absent: ${managed}`);
    const real = await run(['integration', 'remove', 'claude']);
    expect(real.code, real.err).toBe(0);
    expect((await readLock(repo))?.providers.claude).toBeUndefined();
  });
});

describe('malformed or inaccessible state fails closed', () => {
  it.each([
    ['not JSON at all', 'malformed'],
    ['{"schema":"wrong","version":"1","providers":{}}', 'schema'],
    ['{"schema":"product-definition-as-code/installation-lock/v1alpha1"}', 'schema'],
    ['[]', 'schema'],
  ])('refuses the lock %s', async (content, failure) => {
    await writeRaw(lockRelativePath, content);
    try {
      await readLock(repo);
      expect.unreachable('should have refused');
    } catch (error) {
      expect(error).toBeInstanceOf(InstallationLockError);
      expect((error as InstallationLockError).failure).toBe(failure);
    }
  });

  it('makes integration check fail when the lock cannot be trusted', async () => {
    await writeRaw(lockRelativePath, '{ this is not json');
    const result = await run(['integration', 'check']);
    expect(result.code).toBe(1);
    expect(result.err).toContain('cannot be trusted');
  });

  it('makes doctor report the untrustworthy lock instead of a clean bill of health', async () => {
    await writeRaw(lockRelativePath, '{ this is not json');
    const result = await run(['doctor']);
    expect(result.code).toBe(1);
    expect(result.out + result.err).toContain('installation lock');
  });

  it('does not silently replace a malformed configuration with defaults', async () => {
    await writeRaw('.product/config.yaml', 'version: v1alpha1\nproduct-root: [not, a, string]\n');
    const result = await run(['validate']);
    expect(result.code).toBe(2);
    expect(result.err).toContain('PRODUCT050');
  });

  it.runIf(process.platform !== 'win32')(
    'does not silently replace an unreadable configuration with defaults',
    async () => {
      // Windows ignores the POSIX mode bits, so this states the contract where it is enforceable.
      const configPath = join(repo, '.product', 'config.yaml');
      await chmod(configPath, 0o000);
      try {
        const result = await run(['validate']);
        expect(result.code).toBe(2);
        expect(result.err).toContain('PRODUCT050');
        expect(result.err).toContain('could not be read');
      } finally {
        await chmod(configPath, 0o644);
      }
    },
  );
});

describe('generated.root stays inside the repository', () => {
  it.each([
    '../outside',
    '/tmp/outside',
    'C:/outside',
    '..\\outside',
    '.product/../../outside',
    '.',
  ])('refuses %s before any command-specific work', async (root) => {
    await writeRaw(
      '.product/config.yaml',
      `version: v1alpha1\nextensions:\n  prodshape:\n    generated:\n      root: '${root}'\n`,
    );
    const result = await run(['graph', '--format', 'json']);
    expect(result.code, `${root}: ${result.out}`).toBe(2);
    expect(result.err).toContain('PRODUCT050');
    expect(result.err).toContain('generated.root');
  });

  it('accepts a normalized repository-relative generated root', async () => {
    await writeRaw(
      '.product/config.yaml',
      'version: v1alpha1\nextensions:\n  prodshape:\n    generated:\n      root: build/product\n',
    );
    const result = await run(['graph']);
    expect(result.code, result.err).toBe(0);
  });

  it('keeps consumer roots read-only and therefore free of the containment contract', async () => {
    // Consumer roots are scan targets, not writable roots: a repository may legitimately point
    // them at a sibling checkout. The property that makes that safe is that scanning writes
    // nothing, which is what this asserts.
    const external = join(scratch, 'external-consumers');
    await mkdir(external, { recursive: true });
    await writeFile(join(external, 'doc.md'), '# A consumer document\n', 'utf8');
    await writeRaw(
      '.product/config.yaml',
      `version: v1alpha1\nextensions:\n  prodshape:\n    citations:\n      consumer-roots:\n        - '${toPosix(external)}'\n`,
    );
    const before = await snapshotTree(external);
    const result = await run(['citations', 'verify']);
    // Whatever the verdict, the scan wrote nothing into the external tree.
    expect([0, 1]).toContain(result.code);
    expect(await snapshotTree(external)).toEqual(before);
  });
});

describe('integration operations are byte-idempotent', () => {
  it('a second integration add changes no byte and rewrites no file', async () => {
    await run(['integration', 'add', 'copilot']);
    const bytes = await snapshotTree(repo);
    const mtimes = await snapshotMtimes(repo);

    const again = await run(['integration', 'add', 'copilot']);
    expect(again.code, again.err).toBe(0);
    expect(await snapshotTree(repo)).toEqual(bytes);
    expect(await snapshotMtimes(repo)).toEqual(mtimes);
  });

  it('a no-op integration update changes no byte and rewrites no file', async () => {
    const bytes = await snapshotTree(repo);
    const mtimes = await snapshotMtimes(repo);

    const update = await run(['integration', 'update']);
    expect(update.code, update.err).toBe(0);
    expect(await snapshotTree(repo)).toEqual(bytes);
    expect(await snapshotMtimes(repo)).toEqual(mtimes);
  });

  it('preserves installedAt across a re-add of the Spec Kit integration', async () => {
    await mkdir(join(repo, '.specify', 'templates'), { recursive: true });
    await writeFile(
      join(repo, '.specify', 'templates', 'spec-template.md'),
      '# Spec template\n',
      'utf8',
    );
    const first = await run(['integration', 'add', 'speckit']);
    expect(first.code, first.err).toBe(0);
    const meta = JSON.parse(await readRaw('.product/integrations/speckit.json')) as {
      installedAt: string;
      updatedAt?: string;
    };
    expect(meta.updatedAt).toBeUndefined();

    const bytes = await snapshotTree(repo);
    const mtimes = await snapshotMtimes(repo);
    const again = await run(['integration', 'add', 'speckit']);
    expect(again.code, again.err).toBe(0);
    expect(again.out).toContain('already up to date');
    expect(await snapshotTree(repo)).toEqual(bytes);
    expect(await snapshotMtimes(repo)).toEqual(mtimes);

    const after = JSON.parse(await readRaw('.product/integrations/speckit.json')) as {
      installedAt: string;
    };
    expect(after.installedAt).toBe(meta.installedAt);
  });

  it('records updatedAt only when managed content actually changed', async () => {
    await mkdir(join(repo, '.specify', 'templates'), { recursive: true });
    await run(['integration', 'add', 'speckit']);
    // Removing the managed guidance makes the next add a real change.
    await rm(join(repo, '.specify', 'memory', 'pdac.md'), { force: true });
    const changed = await run(['integration', 'add', 'speckit']);
    expect(changed.code, changed.err).toBe(0);
    const meta = JSON.parse(await readRaw('.product/integrations/speckit.json')) as {
      installedAt: string;
      updatedAt?: string;
    };
    expect(meta.updatedAt).toBeDefined();
    expect(meta.updatedAt).not.toBe(meta.installedAt);
  });

  it('does not rewrite the installation lock on a no-op provider install', async () => {
    const before = await stat(join(repo, ...lockRelativePath.split('/')));
    await run(['integration', 'add', 'claude']);
    const after = await stat(join(repo, ...lockRelativePath.split('/')));
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });

  it('keeps the lock deterministic through a write/read round trip', async () => {
    const lock = await readLock(repo);
    expect(lock).toBeDefined();
    await writeLock(repo, lock as InstallationLock);
    expect(await readLock(repo)).toEqual(lock);
  });
});
