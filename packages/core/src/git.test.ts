import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gitHead, gitRevisionExists, gitShowBytes } from './git.js';

const exec = promisify(execFile);

const setupHookTimeoutMs = 15_000;
const cleanupHookTimeoutMs = 10_000;

let repoDir: string;
let plainDir: string;
let head: string;

async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await exec('git', args, { cwd, windowsHide: true });
  return stdout.trim();
}

beforeEach(async () => {
  repoDir = await mkdtemp(join(tmpdir(), 'prodshape-git-'));
  await git(repoDir, 'init', '--initial-branch=main');
  await git(repoDir, 'config', 'user.email', 'probe@example.org');
  await git(repoDir, 'config', 'user.name', 'Probe');
  await writeFile(join(repoDir, 'file.txt'), 'content\n', 'utf8');
  await git(repoDir, 'add', '-A');
  await git(repoDir, 'commit', '-m', 'initial');
  head = await git(repoDir, 'rev-parse', 'HEAD');

  // A directory with no Git repository at all, to exercise "outside a Git repo".
  plainDir = await mkdtemp(join(tmpdir(), 'prodshape-not-git-'));
}, setupHookTimeoutMs);

afterEach(async () => {
  await rm(repoDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  await rm(plainDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
}, cleanupHookTimeoutMs);

describe('gitRevisionExists', () => {
  it('is true for a revision that resolves to a commit', async () => {
    expect(await gitRevisionExists(repoDir, head)).toBe(true);
    expect(await gitRevisionExists(repoDir, 'HEAD')).toBe(true);
  });

  it('is false for a revision that does not exist in the repository', async () => {
    expect(await gitRevisionExists(repoDir, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef')).toBe(
      false,
    );
  });

  it('is false for a malformed or ambiguous revision', async () => {
    expect(await gitRevisionExists(repoDir, 'not a revision')).toBe(false);
  });

  it('is false outside a Git repository entirely', async () => {
    expect(await gitRevisionExists(plainDir, head)).toBe(false);
  });
});

describe('gitHead and gitShowBytes still behave as documented (regression guard)', () => {
  it('gitHead resolves the current commit inside a repository, and is undefined outside one', async () => {
    expect(await gitHead(repoDir)).toBe(head);
    expect(await gitHead(plainDir)).toBeUndefined();
  });

  it('gitShowBytes reads a path at a resolvable revision', async () => {
    const bytes = await gitShowBytes(repoDir, head, 'file.txt');
    expect(bytes?.toString('utf8')).toBe('content\n');
  });

  it('gitShowBytes is undefined for a path absent at an otherwise resolvable revision', async () => {
    expect(await gitShowBytes(repoDir, head, 'no-such-file.txt')).toBeUndefined();
  });

  it('gitShowBytes is undefined for an unresolvable revision', async () => {
    expect(
      await gitShowBytes(repoDir, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', 'file.txt'),
    ).toBeUndefined();
  });
});
