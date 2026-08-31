import { claudeRenderer } from '@prodshape/integration-claude';
import { codexRenderer } from '@prodshape/integration-codex';
import { copilotRenderer } from '@prodshape/integration-copilot';
import type { CanonicalAssets, ProviderRenderer, RenderOptions } from './assets.js';
import { loadBundledAssets } from './assets.js';
import {
  emptyLock,
  fileDigest,
  lockRelativePath,
  serializeLock,
  type InstallationLock,
} from './lock.js';
import { classifyManaged, readLock, readManaged, removeManaged, writeManaged } from './mutation.js';

export interface IntegrationDiagnostic {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  file: string;
}

/** Compare strings lexicographically by UTF-16 code unit, independent of locale and ICU data. */
function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Renderers consumed via structural typing; integrations never import distribution. */
export const renderers: ProviderRenderer[] = [claudeRenderer, copilotRenderer, codexRenderer];

export function rendererFor(provider: string): ProviderRenderer | undefined {
  return renderers.find((r) => r.provider === provider);
}

export interface InstallResult {
  provider: string;
  /** Managed files whose bytes this run actually changed. */
  written: string[];
  /**
   * Managed files already byte-identical to what this render produces, and therefore not
   * rewritten. A no-op install must leave the working tree alone, not rewrite it with the same
   * content: rewriting makes every no-op look like a change to Git, to file watchers and to
   * anything that reads modification times.
   */
  unchanged: string[];
  /** Files the lock owned but this render no longer produces, and which were deleted. */
  removed: string[];
}

export interface InstallOptions {
  assets?: CanonicalAssets;
  force?: boolean;
  /** Passed through to the provider renderer; see ProviderRenderer. */
  render?: RenderOptions;
}

/**
 * What installing one provider would do. Computed without touching the filesystem so that
 * `init --dry-run` and the real run cannot diverge: the plan carries the rendered content,
 * and applying it is a straight write of what was already reported.
 */
export interface ProviderPlan {
  provider: string;
  /** The framework version stamped into the managed-file headers and recorded in the lock. */
  version: string;
  /** Every rendered file, with content, sorted by path. */
  files: { path: string; content: string }[];
  /** Targets absent on disk. */
  created: string[];
  /** Targets the lock owns, unmodified, that will be rewritten identically. */
  regenerated: string[];
  /** Targets that exist unowned or drifted and will be replaced because force is set. */
  overwritten: string[];
  /** Targets that exist but the lock does not own, or owns and has drifted. Empty when force. */
  conflicts: string[];
  /** Paths this provider's lock entry owns that the current render no longer produces. */
  orphans: string[];
  force: boolean;
}

/** A refused installation: targets exist that the lock does not own, or were hand-edited. */
export class InstallConflictError extends Error {
  constructor(
    readonly provider: string,
    readonly conflicts: string[],
  ) {
    super(
      `Refusing to overwrite ${conflicts.length} existing file(s) for the ${provider} integration ` +
        `(not managed by the installation lock, or modified by hand):\n` +
        conflicts.map((path) => `  ${path}`).join('\n') +
        '\nReconcile the files (or re-run with --force to overwrite them).',
    );
  }
}

/**
 * Classify every target of one provider's render without writing anything.
 * A target that exists but is not owned by the lock, or is owned but drifted, is a conflict
 * and blocks the whole install unless force is set.
 */
export async function planProvider(
  root: string,
  provider: string,
  options: InstallOptions = {},
): Promise<ProviderPlan> {
  const { force = false } = options;
  const renderer = rendererFor(provider);
  if (!renderer) {
    throw new Error(`Unknown AI provider '${provider}' (supported: claude, copilot)`);
  }
  const resolvedAssets = options.assets ?? (await loadBundledAssets());
  const files = renderer.render(resolvedAssets, options.render ?? {});
  const lock: InstallationLock = (await readLock(root)) ?? emptyLock(resolvedAssets.version);

  const owned = new Map<string, string>();
  for (const entry of Object.values(lock.providers)) {
    for (const [path, digest] of Object.entries(entry.files)) owned.set(path, digest);
  }

  const created: string[] = [];
  const regenerated: string[] = [];
  const overwritten: string[] = [];
  const conflicts: string[] = [];
  for (const file of files) {
    const classification = await classifyManaged(
      root,
      file.path,
      owned.get(file.path),
      `the ${provider} renderer`,
    );
    if (classification.state === 'absent') {
      created.push(file.path); // Absent targets are always writable.
    } else if (classification.state === 'owned-clean') {
      // Ours and unmodified: rewriting it is a no-op, not a loss of user content.
      regenerated.push(file.path);
    } else if (force) {
      overwritten.push(file.path);
    } else {
      conflicts.push(file.path);
    }
  }

  const rendered = new Set(files.map((f) => f.path));
  const orphans = Object.keys(lock.providers[provider]?.files ?? {})
    .filter((path) => !rendered.has(path))
    .sort();

  return {
    provider,
    version: resolvedAssets.version,
    files,
    created,
    regenerated,
    overwritten,
    conflicts,
    orphans,
    force,
  };
}

/**
 * Write a provider plan. The lock is re-read here rather than carried in the plan: `init`
 * installs providers in sequence, and a snapshotted lock would make the second apply drop the
 * first provider's entries.
 */
export async function applyProviderPlan(root: string, plan: ProviderPlan): Promise<InstallResult> {
  const lock: InstallationLock = (await readLock(root)) ?? emptyLock(plan.version);
  const previouslyOwned = { ...(lock.providers[plan.provider]?.files ?? {}) };

  lock.version = plan.version;
  const entry = { files: {} as Record<string, string> };
  lock.providers[plan.provider] = entry;
  const written: string[] = [];
  const unchanged: string[] = [];
  for (const file of plan.files) {
    const source = `the ${plan.provider} renderer`;
    const existing = await readManaged(root, file.path, source);
    if (existing === file.content) {
      unchanged.push(file.path);
    } else {
      await writeManaged(root, file.path, file.content, source);
      written.push(file.path);
    }
    entry.files[file.path] = fileDigest(file.content);
  }

  // Files this provider used to own but no longer renders would otherwise linger forever:
  // dropping them from the lock also drops them from every drift check. Delete only what we
  // can prove is ours and unmodified; anything hand-edited is left for a human.
  const rendered = new Set(plan.files.map((f) => f.path));
  const removed: string[] = [];
  for (const path of Object.keys(previouslyOwned).sort()) {
    if (rendered.has(path)) continue;
    const classification = await classifyManaged(
      root,
      path,
      previouslyOwned[path],
      lockRelativePath,
    );
    // Absent: already gone. Drifted: hand-edited, and no longer ours to delete.
    if (classification.state !== 'owned-clean') continue;
    await removeManaged(root, path, lockRelativePath);
    removed.push(path);
  }

  // The lock is rewritten only when it would differ: a no-op install must not touch it either.
  const currentLock = await readManaged(root, lockRelativePath, lockRelativePath);
  const nextLock = serializeLock(lock);
  if (currentLock !== nextLock) {
    await writeManaged(root, lockRelativePath, nextLock, lockRelativePath);
  }
  return { provider: plan.provider, written, unchanged, removed };
}

/**
 * Render and write one provider's managed files, recording hashes in the lock.
 * A refused install leaves files and lock untouched.
 */
export async function installProvider(
  root: string,
  provider: string,
  options: InstallOptions = {},
): Promise<InstallResult> {
  const plan = await planProvider(root, provider, options);
  if (plan.conflicts.length > 0) throw new InstallConflictError(provider, plan.conflicts);
  return applyProviderPlan(root, plan);
}

/** Regenerate every installed provider (refusing over drift unless force). */
export async function updateIntegrations(
  root: string,
  options: InstallOptions = {},
): Promise<InstallResult[]> {
  const lock = await readLock(root);
  if (!lock) return [];
  const assets = options.assets ?? (await loadBundledAssets());
  const results: InstallResult[] = [];
  for (const provider of Object.keys(lock.providers).sort()) {
    results.push(await installProvider(root, provider, { ...options, assets }));
  }
  return results;
}

/**
 * Detect managed-file drift without touching anything:
 * PRODUCT051 for manual edits, PRODUCT052 for missing files.
 */
export async function checkIntegrations(root: string): Promise<IntegrationDiagnostic[]> {
  const diagnostics: IntegrationDiagnostic[] = [];
  const lock = await readLock(root);
  if (!lock) return diagnostics;

  for (const [provider, entry] of Object.entries(lock.providers)) {
    for (const [path, expected] of Object.entries(entry.files)) {
      const content = await readManaged(root, path, lockRelativePath);
      if (content === undefined) {
        diagnostics.push({
          severity: 'error',
          code: 'PRODUCT052',
          message: `Managed ${provider} file is missing; run: prodshape integration update`,
          file: path,
        });
        continue;
      }
      if (fileDigest(content) !== expected) {
        diagnostics.push({
          severity: 'error',
          code: 'PRODUCT051',
          message: `Managed ${provider} file was modified by hand; edit the canonical asset and run: prodshape integration update`,
          file: path,
        });
      }
    }
  }
  return diagnostics.sort(
    (a, b) => compareCodeUnits(a.file, b.file) || compareCodeUnits(a.code, b.code),
  );
}
