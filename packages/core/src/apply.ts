import { access, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { modelSubdirByType } from './artifact.js';
import type { LoadedChange } from './changes.js';
import { contentDigestBytes } from './digest.js';
import { sortDiagnostics, type Diagnostic } from './diagnostics.js';
import { gitShowBytes } from './git.js';
import type { LoadedArtifact } from './model.js';

export interface ApplyAction {
  kind: 'write' | 'delete' | 'set-status' | 'move-change';
  description: string;
  /** Repository-relative POSIX paths. */
  from?: string;
  to?: string;
}

/** The kind of impact an applied change had on one artifact. */
export type ProductDiffKind = 'added' | 'modified' | 'removed';

/** One artifact the applied result differs on, with the digest it ends up carrying. */
export interface ProductDiffEntry {
  id: string;
  file: string;
  /**
   * Carried on the entry as well as implied by the group it sits in, because the diff record is
   * specified per entry: a consumer reading a flattened diff must not have to infer the kind.
   */
  kind: ProductDiffKind;
  /** Absent for a removal: nothing remains to digest. */
  digest?: string;
}

/**
 * The effective change: what actually differs between the baseline and the applied result.
 *
 * Computed from the result, never read off the change's operations. The two can legitimately
 * disagree: a declared modification whose proposed text is byte-identical to the baseline changes
 * nothing, and reporting it as changed would send every citation of it stale for no reason.
 */
export interface ProductDiff {
  added: ProductDiffEntry[];
  modified: ProductDiffEntry[];
  removed: ProductDiffEntry[];
}

export interface ApplyPlan {
  changeId: string;
  actions: ApplyAction[];
  diff: ProductDiff;
  /**
   * Every reason the plan must not execute, including both apply preconditions: the status gate
   * (PRODUCT028) and baseline drift (PRODUCT027). Both are findings about the model, so both carry
   * a code; there is no second, codeless channel for a refusal.
   */
  diagnostics: Diagnostic[];
}

export interface PlanApplyOptions {
  repoRoot: string;
  modelRelative: string;
  changesRelative: string;
  change: LoadedChange;
  baseline: LoadedArtifact[];
  /** Error diagnostics from full overlay revalidation. */
  overlayErrors: Diagnostic[];
}

/** Rewrite the `status:` line of a change's frontmatter, leaving everything else byte-identical. */
export function withStatus(content: string, status: string): string {
  return content.replace(/^status:[ \t]*\S.*$/m, `status: ${status}`);
}

function computeDiff(
  change: LoadedChange,
  baselineById: Map<string, LoadedArtifact>,
  writes: Map<string, { id: string; digest: string }>,
): ProductDiff {
  const diff: ProductDiff = { added: [], modified: [], removed: [] };

  for (const [to, { id, digest }] of [...writes].sort((a, b) => a[0].localeCompare(b[0]))) {
    const existing = baselineById.get(id);
    if (!existing) {
      diff.added.push({ id, file: to, kind: 'added', digest });
    } else if (existing.digest !== digest) {
      diff.modified.push({ id, file: to, kind: 'modified', digest });
    }
    // Same ID, same digest: the file is rewritten with identical bytes, so nothing changed.
  }

  for (const id of [...change.operations.remove].sort()) {
    const existing = baselineById.get(id);
    // No digest: a removal has no resulting content to digest.
    if (existing) diff.removed.push({ id, file: existing.file, kind: 'removed' });
  }

  return diff;
}

/**
 * Compute the apply plan, its product diff and its precondition diagnostics.
 *
 * Nothing is touched: `--dry-run` prints exactly this plan, and execution is a separate step.
 */
export async function planApply(options: PlanApplyOptions): Promise<ApplyPlan> {
  const { repoRoot, modelRelative, changesRelative, change, baseline, overlayErrors } = options;
  const diagnostics: Diagnostic[] = [...overlayErrors];
  const actions: ApplyAction[] = [];

  // The status gate (PRODUCT028). `status` is a field in change.md, so refusing on it is a finding
  // about the model rather than a complaint about the invocation: the invocation is well formed,
  // and the caller exits 1 rather than 2. Approval stays a human product decision no tool may make.
  if (change.status !== 'approved') {
    diagnostics.push({
      severity: 'error',
      code: 'PRODUCT028',
      message: `Apply requires status 'approved'; the change is '${change.status ?? 'unknown'}'. Approval is a human product decision, so set it by hand once the change is ready.`,
      file: change.file,
      artifact: change.id,
      field: 'status',
    });
  }

  // Baseline-revision compatibility: artifacts the change touches must be unchanged since
  // base-revision (PRODUCT027). The comparison is by normalized content digest, so a commit that
  // touched a file without changing its content is not drift. `operations.add` is not checked: an
  // addition has no baseline artifact to compare against, and an ID that appeared in the baseline
  // since is already PRODUCT020 from the revalidated overlay.
  const baselineById = new Map(baseline.filter((a) => a.id).map((a) => [a.id as string, a]));
  if (change.baseRevision) {
    for (const id of [...change.operations.modify, ...change.operations.remove].sort()) {
      const artifact = baselineById.get(id);
      if (!artifact) continue; // PRODUCT021/022 already reported by validation.
      const historical = await gitShowBytes(repoRoot, change.baseRevision, artifact.file);
      if (historical === undefined || contentDigestBytes(historical) !== artifact.digest) {
        diagnostics.push({
          severity: 'error',
          code: 'PRODUCT027',
          message: `Baseline artifact '${id}' changed since base-revision ${change.baseRevision.slice(0, 12)}; rebase the change explicitly`,
          file: artifact.file,
          artifact: id,
          target: id,
        });
      }
    }
  }

  // Plan: writes for additions and modifications.
  const writes = new Map<string, { id: string; digest: string }>();
  for (const artifact of [...change.proposed].sort((a, b) =>
    (a.id ?? '').localeCompare(b.id ?? ''),
  )) {
    if (!artifact.id || !artifact.type) continue;
    const subdir = modelSubdirByType[artifact.type];
    if (!subdir) continue;
    const isModify = change.operations.modify.includes(artifact.id);
    const existing = baselineById.get(artifact.id);
    const to =
      isModify && existing
        ? existing.file // keep the artifact's current location; identity is the ID
        : `${modelRelative}/${subdir}/${artifact.id.toLowerCase()}.md`;
    actions.push({
      kind: 'write',
      description: `${isModify ? 'Replace' : 'Add'} ${artifact.id} at ${to}`,
      from: artifact.file,
      to,
    });
    writes.set(to, { id: artifact.id, digest: artifact.digest });
  }

  // Plan: deletions for removals.
  for (const id of [...change.operations.remove].sort()) {
    const artifact = baselineById.get(id);
    if (!artifact) continue;
    actions.push({
      kind: 'delete',
      description: `Remove ${id} (${artifact.file})`,
      from: artifact.file,
    });
  }

  // Plan: record the change as applied, then archive it. Applied means materialized and archived,
  // not accepted: only a human merging the pull request accepts it.
  const changeDirName = change.dir.split(/[\\/]/).pop() ?? change.id?.toLowerCase() ?? 'change';
  actions.push({
    kind: 'set-status',
    description: `Set ${change.id ?? 'the change'} status to applied`,
    from: change.file,
  });
  actions.push({
    kind: 'move-change',
    description: `Move change to ${changesRelative}/completed/${changeDirName}`,
    from: `${changesRelative}/active/${changeDirName}`,
    to: `${changesRelative}/completed/${changeDirName}`,
  });

  return {
    changeId: change.id ?? '',
    actions,
    diff: computeDiff(change, baselineById, writes),
    // Finalize only after overlay, status and drift diagnostics have all been collected. The
    // returned plan is the public boundary: callers may filter this set, but nothing appends to it.
    diagnostics: sortDiagnostics(diagnostics),
  };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Preflight an apply plan: read every write source, confirm every delete target and verify the
 * archive destination is absent. Touches nothing; throws on the first failure.
 *
 * Runs identically whether the caller intends to execute the plan or only report it (`--dry-run`
 * per product-changes.md, Apply rule 8): a dry run that skipped this would report "Would apply"
 * for a plan that fails immediately for real, defeating its use as a gate.
 *
 * Returns the write-action content staged for {@link executeApply}, so a real execution reads
 * every source exactly once.
 */
export async function preflightApply(
  repoRoot: string,
  plan: ApplyPlan,
): Promise<Map<string, string>> {
  // Both apply preconditions arrive as error diagnostics, so one guard covers the status gate,
  // baseline drift and every overlay error alike.
  if (plan.diagnostics.some((d) => d.severity === 'error')) {
    throw new Error('Refusing to apply a plan with unresolved errors');
  }

  const staged = new Map<string, string>();
  for (const action of plan.actions) {
    if (action.kind === 'write' && action.from && action.to) {
      staged.set(action.to, await readFile(join(repoRoot, ...action.from.split('/')), 'utf8'));
    } else if (action.kind === 'delete' && action.from) {
      await stat(join(repoRoot, ...action.from.split('/')));
    } else if (action.kind === 'set-status' && action.from) {
      const path = join(repoRoot, ...action.from.split('/'));
      staged.set(action.from, withStatus(await readFile(path, 'utf8'), 'applied'));
    } else if (action.kind === 'move-change' && action.from && action.to) {
      await stat(join(repoRoot, ...action.from.split('/')));
      const target = join(repoRoot, ...action.to.split('/'));
      if (await pathExists(target)) {
        throw new Error(
          `Refusing to apply: archive destination '${action.to}' already exists; move it aside and retry`,
        );
      }
    }
  }

  return staged;
}

/**
 * Execute an apply plan. Never runs implicitly and never creates Git commits.
 *
 * Two-phase: {@link preflightApply} first, touching nothing on failure, then execution ordered so
 * the change-directory move happens last.
 */
export async function executeApply(repoRoot: string, plan: ApplyPlan): Promise<void> {
  const staged = await preflightApply(repoRoot, plan);

  try {
    for (const action of plan.actions) {
      if (action.kind === 'write' && action.to) {
        const target = join(repoRoot, ...action.to.split('/'));
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, staged.get(action.to) as string, 'utf8');
      } else if (action.kind === 'delete' && action.from) {
        await rm(join(repoRoot, ...action.from.split('/')));
      } else if (action.kind === 'set-status' && action.from) {
        await writeFile(
          join(repoRoot, ...action.from.split('/')),
          staged.get(action.from) as string,
          'utf8',
        );
      } else if (action.kind === 'move-change' && action.from && action.to) {
        const target = join(repoRoot, ...action.to.split('/'));
        await mkdir(dirname(target), { recursive: true });
        await rename(join(repoRoot, ...action.from.split('/')), target);
      }
    }
  } catch (error) {
    throw new Error(
      `Apply failed while executing the plan: ${error instanceof Error ? error.message : String(error)}. ` +
        "Apply never creates commits, so 'git status' shows exactly what was written; " +
        "restore with 'git checkout -- <path>' (and remove untracked files) before retrying.",
      { cause: error },
    );
  }
}
