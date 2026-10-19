import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  isRepositoryRelativePath,
  readRepositoryFile,
  rejectRepositoryRelativePath,
  removeRepositoryFile,
  renameRepositoryFile,
  RepositoryPathError,
  resolveInRepository,
  toRepositoryRelative,
  writeRepositoryFile,
} from './repo-path.js';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'prodshape-repo-path-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the repository-relative path contract', () => {
  it.each([
    ['.claude/skills/define/SKILL.md'],
    ['.product/installation.lock.json'],
    ['a'],
    ['a/b/c.md'],
    ['.github/prompts/product-validate.prompt.md'],
    ['docs/product/model/index.md'],
  ])('accepts the normalized repository-relative path %s', (value) => {
    expect(rejectRepositoryRelativePath(value)).toBeUndefined();
    expect(isRepositoryRelativePath(value)).toBe(true);
  });

  it.each([
    ['', 'empty'],
    ['/etc/passwd', 'absolute'],
    ['//server/share/x', 'absolute'],
    ['C:/Windows/System32/drivers/etc/hosts', 'absolute'],
    ['c:relative', 'absolute'],
    ['..\\..\\Windows\\System32', 'backslash'],
    ['.claude\\skills\\x.md', 'backslash'],
    ['..', 'dot-segment'],
    ['../outside.txt', 'dot-segment'],
    ['a/../../outside.txt', 'dot-segment'],
    ['a/./b', 'dot-segment'],
    ['.', 'dot-segment'],
    ['a//b', 'empty-segment'],
    ['a/', 'empty-segment'],
    ['/', 'absolute'],
    ['a/\0b', 'nul-byte'],
  ])('rejects %s as %s', (value, rejection) => {
    expect(rejectRepositoryRelativePath(value)).toBe(rejection);
    expect(isRepositoryRelativePath(value)).toBe(false);
  });

  it('applies the kernel character rule only when strict', () => {
    // A space is legal in a managed file name and illegal in a configured root, which is the
    // exact split between the two contracts: the kernel constrains what a repository may
    // configure, not what a renderer may name.
    expect(isRepositoryRelativePath('a b/c.md')).toBe(true);
    expect(isRepositoryRelativePath('a b/c.md', { strictCharset: true })).toBe(false);
    expect(rejectRepositoryRelativePath('a b/c.md', { strictCharset: true })).toBe('charset');
    expect(isRepositoryRelativePath('.product/generated', { strictCharset: true })).toBe(true);
  });
});

describe('resolveInRepository', () => {
  it('resolves a contained path to an absolute path below the root', () => {
    const target = resolveInRepository(root, 'a/b.md', 'test');
    expect(target).toBe(resolve(root, 'a', 'b.md'));
    expect(target.startsWith(resolve(root) + sep)).toBe(true);
  });

  it('refuses the repository root itself: a mutation must name a path below it', () => {
    // `a/..` is already rejected by shape; the root is reachable only as the empty relative
    // result, so the containment check is what states this.
    expect(() => resolveInRepository(root, '.', 'test')).toThrow(RepositoryPathError);
  });

  it.each([
    '../escape.txt',
    '..',
    '/etc/passwd',
    'C:/Windows/win.ini',
    '..\\escape.txt',
    'a/../../escape.txt',
  ])('refuses %s', (value) => {
    expect(() => resolveInRepository(root, value, 'a hostile lock')).toThrow(RepositoryPathError);
  });

  it('names the offending value and its source in the error', () => {
    try {
      resolveInRepository(root, '../escape.txt', '.product/installation.lock.json');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(RepositoryPathError);
      const failure = error as RepositoryPathError;
      expect(failure.value).toBe('../escape.txt');
      expect(failure.rejection).toBe('dot-segment');
      expect(failure.source).toBe('.product/installation.lock.json');
      expect(failure.message).toContain('.product/installation.lock.json');
    }
  });

  it('round-trips through toRepositoryRelative', () => {
    const absolute = resolveInRepository(root, 'a/b/c.md', 'test');
    expect(toRepositoryRelative(root, absolute)).toBe('a/b/c.md');
  });
});

describe('the safe filesystem primitives', () => {
  it('write, read, rename and remove a contained file', async () => {
    await writeRepositoryFile(root, 'nested/one.txt', 'hello', 'test');
    expect(await readRepositoryFile(root, 'nested/one.txt', 'test')).toBe('hello');

    await renameRepositoryFile(root, 'nested/one.txt', 'nested/deeper/two.txt', 'test');
    expect(await readRepositoryFile(root, 'nested/one.txt', 'test')).toBeUndefined();
    expect(await readRepositoryFile(root, 'nested/deeper/two.txt', 'test')).toBe('hello');

    expect(await removeRepositoryFile(root, 'nested/deeper/two.txt', 'test')).toBe(true);
    expect(await removeRepositoryFile(root, 'nested/deeper/two.txt', 'test')).toBe(false);
  });

  it('reads an absent file as undefined, never as empty content', async () => {
    expect(await readRepositoryFile(root, 'never/written.txt', 'test')).toBeUndefined();
  });

  it('refuses to read, write, rename or delete outside the repository', async () => {
    const outside = join(root, '..', 'sentinel-primitives.txt');
    await writeFile(outside, 'untouched', 'utf8');
    try {
      const hostile = '../sentinel-primitives.txt';
      await expect(readRepositoryFile(root, hostile, 'test')).rejects.toThrow(RepositoryPathError);
      await expect(writeRepositoryFile(root, hostile, 'owned', 'test')).rejects.toThrow(
        RepositoryPathError,
      );
      await expect(removeRepositoryFile(root, hostile, 'test')).rejects.toThrow(
        RepositoryPathError,
      );
      await expect(renameRepositoryFile(root, 'a.txt', hostile, 'test')).rejects.toThrow(
        RepositoryPathError,
      );
      expect(await readFile(outside, 'utf8')).toBe('untouched');
    } finally {
      await rm(outside, { force: true });
    }
  });
});
