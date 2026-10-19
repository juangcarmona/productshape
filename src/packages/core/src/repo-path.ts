/**
 * The repository-relative path contract, and the one resolver every repository mutation goes
 * through.
 *
 * Paths reach this product from places a repository controls but a human did not necessarily
 * write: the installation lock, integration metadata, configuration. Any of them can name a
 * target, and joining that target onto the repository root is only safe if the result is proven
 * to stay below the root. This module states the contract once and enforces it once, so that a
 * read, a write, a rename and a delete cannot each be protected differently.
 *
 * The contract is the normative Configuration chapter's rule for `product-root`, applied to every
 * path a repository-controlled document supplies: a non-empty, normalized, POSIX, relative path.
 * Backslashes, absolute and drive-qualified paths, empty segments and dot segments are rejected
 * before resolution rather than normalized away, because a normalizer that silently repairs
 * `a/../../b` accepts a document that meant to escape.
 */
import { readFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/**
 * The normative character and structure rule for a configured repository-relative root, vendored
 * from the kernel configuration schema's `product-root` pattern so the two cannot drift.
 */
export const repositoryRelativeRootPattern =
  /^(?!\.{1,2}(?:\/|$))(?!.*\/\.{1,2}(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

/** Why a path was refused. Stable identifiers: callers classify without matching on prose. */
export type RepositoryPathRejection =
  | 'empty'
  | 'absolute'
  | 'backslash'
  | 'dot-segment'
  | 'empty-segment'
  | 'nul-byte'
  | 'charset'
  | 'escapes-root';

const rejectionMessages: Record<RepositoryPathRejection, string> = {
  empty: 'must not be empty',
  absolute: 'must be relative to the repository root, not absolute or drive-qualified',
  backslash: 'must use POSIX separators; backslashes are not permitted',
  'dot-segment': "must not contain '.' or '..' segments",
  'empty-segment': 'must not contain empty segments or a trailing separator',
  'nul-byte': 'must not contain a NUL byte',
  charset: 'must use only letters, digits, dot, underscore and hyphen in each segment',
  'escapes-root': 'must resolve inside the repository',
};

/**
 * A repository-controlled path that does not satisfy the contract.
 *
 * Carries the offending value, the stable rejection reason and the source that supplied it, so a
 * caller can report which document named an illegal target without re-deriving it.
 */
export class RepositoryPathError extends Error {
  constructor(
    readonly value: string,
    readonly rejection: RepositoryPathRejection,
    /** Where the path came from, e.g. `.product/installation.lock.json`. */
    readonly source: string,
  ) {
    super(`Refusing path '${value}' from ${source}: it ${rejectionMessages[rejection]}.`);
    this.name = 'RepositoryPathError';
  }
}

/**
 * Check a repository-relative path's shape. Returns the rejection reason, or undefined when the
 * shape is acceptable; containment is proven separately by {@link resolveInRepository}, because it
 * needs the root.
 *
 * `strictCharset` additionally applies the kernel `product-root` character rule. It is on for a
 * configured writable root, which the configuration contract already constrains, and off for a
 * recorded managed-file path, whose segments are file names the renderers produce.
 */
export function rejectRepositoryRelativePath(
  value: string,
  options: { strictCharset?: boolean } = {},
): RepositoryPathRejection | undefined {
  if (value.length === 0) return 'empty';
  if (value.includes('\0')) return 'nul-byte';
  if (value.includes('\\')) return 'backslash';
  // Drive-qualified (`C:/x`, `C:x`) and root-relative (`/x`) targets are absolute intent even
  // where this platform's `isAbsolute` disagrees, so both spellings are checked explicitly.
  if (isAbsolute(value) || value.startsWith('/') || /^[A-Za-z]:/.test(value)) return 'absolute';
  const segments = value.split('/');
  if (segments.some((segment) => segment.length === 0)) return 'empty-segment';
  if (segments.some((segment) => segment === '.' || segment === '..')) return 'dot-segment';
  if (options.strictCharset && !repositoryRelativeRootPattern.test(value)) return 'charset';
  return undefined;
}

/** Whether a path satisfies the repository-relative shape contract. */
export function isRepositoryRelativePath(
  value: string,
  options: { strictCharset?: boolean } = {},
): boolean {
  return rejectRepositoryRelativePath(value, options) === undefined;
}

/**
 * Resolve a repository-relative path to an absolute one, proving it stays inside the repository.
 *
 * The shape check rejects the traversal spellings; the containment check afterwards is what makes
 * the guarantee total, because it is stated over the resolved result rather than over the text.
 * The repository root itself is not a valid target: a mutation must name a path below it.
 */
export function resolveInRepository(
  root: string,
  value: string,
  source: string,
  options: { strictCharset?: boolean } = {},
): string {
  const rejection = rejectRepositoryRelativePath(value, options);
  if (rejection) throw new RepositoryPathError(value, rejection, source);
  const resolvedRoot = resolve(root);
  const target = resolve(resolvedRoot, ...value.split('/'));
  const inside = relative(resolvedRoot, target);
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
    throw new RepositoryPathError(value, 'escapes-root', source);
  }
  return target;
}

/** Express an absolute path inside the repository as its repository-relative POSIX form. */
export function toRepositoryRelative(root: string, absolutePath: string): string {
  return relative(resolve(root), resolve(absolutePath)).split(sep).join('/');
}

/** Whether a filesystem error means the path simply is not there. */
export function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT';
}

/**
 * Read a repository-relative file. Returns undefined only when the file is absent: every other
 * failure — a permission error, a directory in a file's place, an I/O fault — is surfaced, because
 * treating an unreadable file as an empty one turns a broken installation into a clean report.
 */
export async function readRepositoryFile(
  root: string,
  value: string,
  source: string,
): Promise<string | undefined> {
  const target = resolveInRepository(root, value, source);
  try {
    return await readFile(target, 'utf8');
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

/** Write a repository-relative file, creating the directories it needs. */
export async function writeRepositoryFile(
  root: string,
  value: string,
  content: string,
  source: string,
): Promise<void> {
  const target = resolveInRepository(root, value, source);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}

/** Delete a repository-relative file. Reports whether something was there to delete. */
export async function removeRepositoryFile(
  root: string,
  value: string,
  source: string,
): Promise<boolean> {
  const target = resolveInRepository(root, value, source);
  try {
    await rm(target);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

/** Rename one repository-relative path to another; both ends are proven contained. */
export async function renameRepositoryFile(
  root: string,
  from: string,
  to: string,
  source: string,
): Promise<void> {
  const fromTarget = resolveInRepository(root, from, source);
  const toTarget = resolveInRepository(root, to, source);
  await mkdir(dirname(toTarget), { recursive: true });
  await rename(fromTarget, toTarget);
}

/**
 * Join a repository-relative path onto the root without the contract check.
 *
 * For paths this implementation itself fixes as literals (a lock's own location, a template
 * directory). Never for a path a repository document supplied — those go through
 * {@link resolveInRepository}.
 */
export function joinRepositoryPath(root: string, value: string): string {
  return join(root, ...value.split('/'));
}
