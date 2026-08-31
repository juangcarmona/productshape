/**
 * Repository mutation for managed files.
 *
 * One module owns everything that touches the working tree on behalf of an integration: safe
 * path resolution, loading the installation lock and proving it trustworthy, classifying what is
 * on disk against what the lock recorded, planning a removal, and applying an already validated
 * plan. Everything here returns plans and results; nothing prints, and nothing decides an exit
 * code. Commands render what these functions return.
 *
 * The seam matters more than the file. Before it, a managed-file path could be joined onto the
 * repository root in five places with five different degrees of care, and `--dry-run` was a flag
 * consulted after the write. After it, a target is resolved once, a plan is computed before
 * anything is written, and applying a plan is a straight execution of what was already reported.
 */
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isNotFound, resolveInRepository, RepositoryPathError } from '@prodshape/core';
import {
  emptyLock,
  fileDigest,
  InstallationLockError,
  lockRelativePath,
  parseLock,
  serializeLock,
  type InstallationLock,
} from './lock.js';

export { RepositoryPathError } from '@prodshape/core';
export { InstallationLockError };
export type { LockFailure } from './lock.js';

/**
 * Resolve a managed-file path against the repository root.
 *
 * Every read, write and delete of a managed file goes through here. `source` names the document
 * that supplied the path so a refusal says which record is wrong.
 */
export function resolveManaged(root: string, relativePath: string, source: string): string {
  return resolveInRepository(root, relativePath, source);
}

/** Read a managed file. Absent is undefined; unreadable is an error, never an empty file. */
export async function readManaged(
  root: string,
  relativePath: string,
  source: string,
): Promise<string | undefined> {
  const target = resolveManaged(root, relativePath, source);
  try {
    return await readFile(target, 'utf8');
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

/** Write a managed file, creating the directories it needs. */
export async function writeManaged(
  root: string,
  relativePath: string,
  content: string,
  source: string,
): Promise<void> {
  const target = resolveManaged(root, relativePath, source);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}

/**
 * Delete a managed file. Reports whether something was there.
 *
 * `rm` is called without `force`, so a delete that fails for any reason other than the file
 * already being absent is surfaced instead of being reported as a successful removal.
 */
export async function removeManaged(
  root: string,
  relativePath: string,
  source: string,
): Promise<boolean> {
  const target = resolveManaged(root, relativePath, source);
  try {
    await rm(target);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

/**
 * Load the installation lock.
 *
 * Absent means nothing is installed and is a supported state. Present-but-untrustworthy is not:
 * a malformed document, a schema violation, a path that is not repository-relative, a permission
 * error or any other filesystem failure raises {@link InstallationLockError}. The old behaviour —
 * catch everything, return undefined — turned an unreadable lock into "no integrations installed",
 * which reinstalls over managed files whose recorded digests were just lost and reports a clean
 * drift check for an installation nobody can verify.
 */
export async function readLock(root: string): Promise<InstallationLock | undefined> {
  const target = resolveInRepository(root, lockRelativePath, 'the installation lock path');
  let content: string;
  try {
    content = await readFile(target, 'utf8');
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw new InstallationLockError(
      'unreadable',
      `it exists but could not be read (${error instanceof Error ? error.message : String(error)})`,
      [],
      { cause: error },
    );
  }
  return parseLock(content);
}

/** Write the installation lock deterministically. */
export async function writeLock(root: string, lock: InstallationLock): Promise<void> {
  await writeManaged(root, lockRelativePath, serializeLock(lock), 'the installation lock path');
}

/** What is on disk at a managed path, judged against what the lock recorded for it. */
export type ManagedState =
  | 'absent'
  /** Present, owned by the lock, and byte-identical to the digest recorded for it. */
  | 'owned-clean'
  /** Present, owned by the lock, and changed since it was recorded: a human edited it. */
  | 'owned-drifted'
  /** Present and not owned by the lock: it was not this product that put it there. */
  | 'unowned';

export interface ManagedClassification {
  path: string;
  state: ManagedState;
  /** The current bytes, when the file is present. */
  content?: string;
}

/**
 * Classify one managed path. The single definition of drift, shared by installation, drift
 * checking and removal, so the three cannot disagree about what counts as a hand edit.
 */
export async function classifyManaged(
  root: string,
  relativePath: string,
  ownedDigest: string | undefined,
  source: string,
): Promise<ManagedClassification> {
  const content = await readManaged(root, relativePath, source);
  if (content === undefined) return { path: relativePath, state: 'absent' };
  if (ownedDigest === undefined) return { path: relativePath, state: 'unowned', content };
  return {
    path: relativePath,
    state: fileDigest(content) === ownedDigest ? 'owned-clean' : 'owned-drifted',
    content,
  };
}

/** One managed path a removal refuses to touch, with the reason it was refused. */
export interface RejectedManagedPath {
  path: string;
  reason: string;
}

/**
 * What removing one provider would do. Computed without touching the filesystem, so that
 * `--dry-run` and the real run cannot diverge.
 */
export interface RemovalPlan {
  provider: string;
  /** Owned, present and unmodified: safe to delete, and the lock entry goes with it. */
  removed: string[];
  /**
   * Owned but modified by hand. Kept on disk, and kept in the lock: dropping the entry would
   * drop the file from every future drift check while leaving the file behind.
   */
  preserved: string[];
  /** Owned but already gone. Nothing to delete; the entry is dropped. */
  missing: string[];
  /** Recorded paths that do not satisfy the repository-relative contract. Never touched. */
  rejected: RejectedManagedPath[];
  /** Whether the provider's whole lock entry can be dropped. False when anything was preserved. */
  lockEntryRemoved: boolean;
  force: boolean;
}

export interface RemovalResult {
  provider: string;
  removed: string[];
  preserved: string[];
  missing: string[];
  rejected: RejectedManagedPath[];
  lockEntryRemoved: boolean;
}

/**
 * Classify every path one provider's lock entry owns, without removing anything.
 *
 * Default removal is drift-safe: a managed file a human edited is the human's work now, and the
 * product deletes only what it can prove is its own and untouched. `force` is the explicit,
 * separately requested destructive path — it deletes drifted files too, and says so in the plan.
 *
 * The lock may be supplied by a caller that already loaded it. A recorded path that fails the
 * repository-relative contract lands in `rejected` and is never resolved, so a hostile entry
 * cannot reach the filesystem even if it somehow bypassed validation at load.
 */
export async function planProviderRemoval(
  root: string,
  provider: string,
  options: { force?: boolean; lock?: InstallationLock } = {},
): Promise<RemovalPlan> {
  const force = options.force ?? false;
  const lock = options.lock ?? (await readLock(root)) ?? emptyLock('0.0.0');
  const entry = lock.providers[provider];

  const removed: string[] = [];
  const preserved: string[] = [];
  const missing: string[] = [];
  const rejected: RejectedManagedPath[] = [];

  for (const path of Object.keys(entry?.files ?? {}).sort()) {
    const digest = entry?.files[path];
    let classification: ManagedClassification;
    try {
      classification = await classifyManaged(root, path, digest, lockRelativePath);
    } catch (error) {
      if (error instanceof RepositoryPathError) {
        rejected.push({ path, reason: error.message });
        continue;
      }
      throw error;
    }
    switch (classification.state) {
      case 'absent':
        missing.push(path);
        break;
      case 'owned-clean':
        removed.push(path);
        break;
      case 'owned-drifted':
      case 'unowned':
        if (force) removed.push(path);
        else preserved.push(path);
        break;
    }
  }

  return {
    provider,
    removed: removed.sort(),
    preserved,
    missing,
    rejected,
    lockEntryRemoved: preserved.length === 0 && rejected.length === 0,
    force,
  };
}

/**
 * Execute a removal plan. Only what the plan classified as removable is deleted, and the lock is
 * rewritten to match: the entry disappears when everything went, and keeps exactly the preserved
 * and rejected paths when something stayed.
 */
export async function applyProviderRemoval(
  root: string,
  plan: RemovalPlan,
): Promise<RemovalResult> {
  for (const path of plan.removed) {
    await removeManaged(root, path, lockRelativePath);
  }

  const lock = (await readLock(root)) ?? emptyLock('0.0.0');
  const entry = lock.providers[plan.provider];
  if (entry) {
    if (plan.lockEntryRemoved) {
      delete lock.providers[plan.provider];
    } else {
      const keep = new Set([...plan.preserved, ...plan.rejected.map((r) => r.path)]);
      entry.files = Object.fromEntries(
        Object.entries(entry.files).filter(([path]) => keep.has(path)),
      );
    }
    await writeLock(root, lock);
  }

  return {
    provider: plan.provider,
    removed: plan.removed,
    preserved: plan.preserved,
    missing: plan.missing,
    rejected: plan.rejected,
    lockEntryRemoved: plan.lockEntryRemoved,
  };
}
