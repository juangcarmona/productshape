/**
 * Resolve PRODUCT101 (file name not aligned with its ID) by renaming files.
 *
 * The reason this needs code at all: on a case-insensitive filesystem (Windows, macOS by default)
 * renaming `ACT-ADMIN.md` to `act-admin.md` is a silent no-op, so the warning is unfixable by hand
 * there and persists on Windows CI runners. Every rename therefore goes through a temporary name.
 */
import { rename as fsRename, stat as fsStat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import fg from 'fast-glob';
import { expectedFileName } from './artifact.js';
import { toPosixRelative, type LoadedArtifact } from './model.js';

/** Suffix of the intermediate name used by the two-step rename. */
export const fixTempSuffix = '.prodshape-fix-tmp';

export type FilenameBlockReason = 'target-exists' | 'duplicate-target' | 'stale-temp-file';

export interface FilenameFix {
  /** Repository-relative path, POSIX separators. */
  from: string;
  to: string;
  artifact: string;
  blocked?: FilenameBlockReason;
}

export interface FilenamePlan {
  /** Renames that can be applied. */
  fixes: FilenameFix[];
  /** Renames that need a human first; their presence blocks the whole plan. */
  blocked: FilenameFix[];
}

/** The filesystem operations the applier needs. Injectable so the two-step can be asserted. */
export interface RenameFs {
  rename(from: string, to: string): Promise<void>;
  stat(path: string): Promise<unknown>;
}

const nodeFs: RenameFs = { rename: fsRename, stat: fsStat };

function withBase(path: string, base: string): string {
  const dir = path.slice(0, path.length - basename(path).length);
  return `${dir}${base}`;
}

/**
 * Derive the rename actions for a loaded model. Pure: no filesystem access, so the whole
 * decision surface is unit-testable on any platform.
 */
export function planFilenameFixes(artifacts: LoadedArtifact[]): FilenamePlan {
  const candidates: FilenameFix[] = [];
  for (const artifact of artifacts) {
    if (!artifact.id) continue;
    const expected = expectedFileName(artifact.id);
    if (basename(artifact.file) === expected) continue;
    candidates.push({
      from: artifact.file,
      to: withBase(artifact.file, expected),
      artifact: artifact.id,
    });
  }

  // Two artifacts resolving to one path is an ID clash (PRODUCT005 territory) or a casing clash.
  // Renaming either would destroy the other, so both are refused.
  const targetCounts = new Map<string, number>();
  for (const fix of candidates) {
    targetCounts.set(fix.to, (targetCounts.get(fix.to) ?? 0) + 1);
  }

  const occupied = new Set(artifacts.map((a) => a.file));
  const fixes: FilenameFix[] = [];
  const blocked: FilenameFix[] = [];
  for (const fix of candidates) {
    if ((targetCounts.get(fix.to) ?? 0) > 1) {
      blocked.push({ ...fix, blocked: 'duplicate-target' });
      continue;
    }
    // A target that is some *other* artifact's file would be destroyed by the rename. A target
    // differing from the source only in case is the case-only rename we exist to perform.
    if (occupied.has(fix.to) && fix.to !== fix.from) {
      blocked.push({ ...fix, blocked: 'target-exists' });
      continue;
    }
    fixes.push(fix);
  }

  const byPath = (a: FilenameFix, b: FilenameFix) => a.from.localeCompare(b.from);
  return { fixes: fixes.sort(byPath), blocked: blocked.sort(byPath) };
}

/**
 * Apply a plan. All-or-nothing: a blocked entry refuses the whole plan rather than partially
 * mutating canonical files, matching `applyPromotion` and `installProvider`.
 *
 * Each rename is two steps through a temporary name, unconditionally — branching on "is this
 * case-only?" would mean guessing the filesystem's semantics. The temporary name is derived from
 * the *target*, so a crash between the steps leaves a file that encodes where it was going and
 * `recoverFilenameFixes` can finish the job.
 */
export async function applyFilenameFixes(
  repoRoot: string,
  plan: FilenamePlan,
  fs: RenameFs = nodeFs,
): Promise<string[]> {
  if (plan.blocked.length > 0) {
    throw new Error(
      `Refusing to rename: ${plan.blocked.length} file(s) need attention first:\n` +
        plan.blocked.map((f) => `  ${f.from} -> ${f.to} (${f.blocked})`).join('\n'),
    );
  }

  const applied: string[] = [];
  for (const fix of plan.fixes) {
    const from = join(repoRoot, ...fix.from.split('/'));
    const to = join(repoRoot, ...fix.to.split('/'));

    // The planner only knows about files that parsed into artifacts. A target occupied by
    // something else — an unparseable .md, a stray file — would be silently replaced by rename,
    // so it is checked here, where the filesystem is available. A successful stat when the paths
    // differ only in case is the source itself on a case-insensitive filesystem, not a collision.
    if (fix.from.toLowerCase() !== fix.to.toLowerCase()) {
      let targetExists = true;
      try {
        await fs.stat(to);
      } catch {
        targetExists = false;
      }
      if (targetExists) {
        throw new Error(`Refusing to rename ${fix.from}: ${fix.to} already exists`);
      }
    }

    const temp = `${to}${fixTempSuffix}`;
    await fs.rename(from, temp);
    await fs.rename(temp, to);
    applied.push(fix.to);
  }
  return applied;
}

/** Repository-relative paths of temporary files left by an interrupted rename. */
export async function discoverFixTempFiles(modelDir: string, repoRoot: string): Promise<string[]> {
  const entries = await fg(`**/*${fixTempSuffix}`, { cwd: modelDir, absolute: true, dot: false });
  return entries.map((path) => toPosixRelative(repoRoot, path)).sort();
}

export interface FilenameRecoveryPlan {
  /** Leftovers whose destination is free: renaming them completes an interrupted repair. */
  recoverable: FilenameFix[];
  /** Leftovers whose destination is already taken; a human must decide. */
  blocked: FilenameFix[];
}

export interface FilenameRecovery {
  /** Renames completed from a leftover temporary file. */
  recovered: string[];
  /** Leftovers whose destination is already taken; a human must decide. */
  blocked: FilenameFix[];
}

/**
 * Classify leftover temporary files without touching the filesystem.
 *
 * Split from the apply step so a caller reporting what it *would* do never performs a rename as a
 * side effect of asking. That is not hypothetical: the first implementation recovered before
 * checking whether it was a dry run, and then reported that nothing had changed.
 */
export async function planFilenameRecovery(
  repoRoot: string,
  leftovers: string[],
  fs: RenameFs = nodeFs,
): Promise<FilenameRecoveryPlan> {
  const recoverable: FilenameFix[] = [];
  const blocked: FilenameFix[] = [];
  for (const leftover of [...leftovers].sort()) {
    const destination = leftover.slice(0, -fixTempSuffix.length);
    const entry: FilenameFix = {
      from: leftover,
      to: destination,
      artifact: basename(destination),
    };
    let destinationExists = true;
    try {
      await fs.stat(join(repoRoot, ...destination.split('/')));
    } catch {
      destinationExists = false;
    }
    if (destinationExists) {
      blocked.push({ ...entry, blocked: 'stale-temp-file' });
      continue;
    }
    recoverable.push(entry);
  }
  return { recoverable, blocked };
}

/** Complete the renames a recovery plan classified as recoverable. */
export async function applyFilenameRecovery(
  repoRoot: string,
  plan: FilenameRecoveryPlan,
  fs: RenameFs = nodeFs,
): Promise<string[]> {
  const recovered: string[] = [];
  for (const entry of plan.recoverable) {
    await fs.rename(
      join(repoRoot, ...entry.from.split('/')),
      join(repoRoot, ...entry.to.split('/')),
    );
    recovered.push(entry.to);
  }
  return recovered;
}

/**
 * Finish any rename interrupted between its two steps. Idempotent, and safe to run before
 * planning: a leftover temporary file is invisible to artifact discovery (which globs `*.md`), so
 * an interrupted run makes an artifact *missing* rather than duplicated — visible as dangling
 * references, and repaired here.
 */
export async function recoverFilenameFixes(
  repoRoot: string,
  leftovers: string[],
  fs: RenameFs = nodeFs,
): Promise<FilenameRecovery> {
  const plan = await planFilenameRecovery(repoRoot, leftovers, fs);
  const recovered = await applyFilenameRecovery(repoRoot, plan, fs);
  return { recovered, blocked: plan.blocked };
}
