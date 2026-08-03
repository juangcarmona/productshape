import { access, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { modelSubdirByType } from './artifact.js';
import type { LoadedChange, LoadedSlice } from './changes.js';
import { contentDigest } from './digest.js';
import { escalateWarnings, type Diagnostic } from './diagnostics.js';
import { gitShow } from './git.js';
import type { LoadedArtifact } from './model.js';
import { sliceImplements } from './slices.js';

export interface PromotionAction {
  kind: 'write' | 'delete' | 'move-change';
  description: string;
  /** Repository-relative POSIX paths. */
  from?: string;
  to?: string;
}

export interface PromotionPlan {
  changeId: string;
  actions: PromotionAction[];
  diagnostics: Diagnostic[];
}

/** Verdict of a coverage-evidence lookup for one delivery slice. */
export interface SliceEvidence {
  /** False when no handoff referencing the slice exists anywhere in the SDD workspace. */
  found: boolean;
  /** Coverage diagnostics from the SDD adapter; any error blocks promotion. */
  diagnostics: Diagnostic[];
  /** Requirement IDs with accepted coverage evidence. */
  covered: string[];
}

/**
 * Port through which promotion verifies coverage evidence. Implemented by SDD
 * adapters and composed in the CLI; core never depends on a concrete adapter.
 */
export type CoverageEvidenceProvider = (
  change: LoadedChange,
  slice: LoadedSlice,
) => Promise<SliceEvidence>;

export interface PlanPromotionOptions {
  repoRoot: string;
  modelRelative: string;
  changesRelative: string;
  change: LoadedChange;
  baseline: LoadedArtifact[];
  /** Error diagnostics from full overlay revalidation. */
  overlayErrors: Diagnostic[];
  /** Absent when no SDD provider is configured (OD-003). */
  coverageProvider?: CoverageEvidenceProvider;
  /** Human assertion that evidence exists outside any adapter; inert with a provider. */
  acceptExternalEvidence?: boolean;
  /**
   * Escalate forwarded coverage warnings per validation.warnings-as-errors.
   * The explicit --accept-external-evidence assertion stays a warning: it is a
   * documented human override, not a model-quality finding.
   */
  warningsAsErrors?: boolean;
}

const resolvedSliceStates = new Set(['completed', 'cancelled']);

/**
 * Compute the promotion plan and its precondition diagnostics.
 * Nothing is touched; apply happens separately (dry-run prints this plan).
 */
export async function planPromotion(options: PlanPromotionOptions): Promise<PromotionPlan> {
  const { repoRoot, modelRelative, changesRelative, change, baseline, overlayErrors } = options;
  const diagnostics: Diagnostic[] = [];
  const actions: PromotionAction[] = [];

  if (change.status !== 'implemented') {
    diagnostics.push({
      severity: 'error',
      code: 'PRODUCT027',
      message: `Promotion requires status 'implemented'; the change is '${change.status ?? 'unknown'}'`,
      file: change.file,
      artifact: change.id,
      field: 'status',
    });
  }

  for (const slice of change.slices) {
    if (!resolvedSliceStates.has(slice.status ?? '')) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT027',
        message: `Slice '${slice.id ?? slice.file}' must be completed or explicitly cancelled; it is '${slice.status ?? 'unknown'}'`,
        file: slice.file,
        artifact: slice.id,
        field: 'status',
      });
    }
  }

  // Coverage evidence: every completed slice must have verifiable evidence
  // (FR-PROMOTE-001). Cancelled slices are exempt — nothing was delivered.
  const completedSlices = change.slices.filter((s) => s.status === 'completed');
  if (completedSlices.length > 0) {
    if (!options.coverageProvider) {
      if (options.acceptExternalEvidence) {
        diagnostics.push({
          severity: 'warning',
          code: 'PRODUCT044',
          message: `Coverage evidence for '${change.id ?? 'the change'}' is asserted outside any SDD adapter (--accept-external-evidence); nothing was verified`,
          file: change.file,
          artifact: change.id,
        });
      } else {
        diagnostics.push({
          severity: 'error',
          code: 'PRODUCT044',
          message:
            'No SDD provider is configured to verify coverage evidence; configure integrations.sdd.provider or promote with --accept-external-evidence',
          file: change.file,
          artifact: change.id,
        });
      }
    } else {
      const covered = new Set<string>();
      let evidenceFailed = false;
      for (const slice of completedSlices) {
        const evidence = await options.coverageProvider(change, slice);
        if (!evidence.found) {
          evidenceFailed = true;
          diagnostics.push({
            severity: 'error',
            code: 'PRODUCT044',
            message: `Completed slice '${slice.id ?? slice.file}' has no coverage evidence: no handoff for this slice exists in the SDD workspace`,
            file: slice.file,
            artifact: slice.id,
          });
          continue;
        }
        const evidenceDiagnostics = escalateWarnings(
          evidence.diagnostics,
          options.warningsAsErrors ?? false,
        );
        if (evidenceDiagnostics.some((d) => d.severity === 'error')) evidenceFailed = true;
        diagnostics.push(...evidenceDiagnostics);
        for (const requirement of evidence.covered) covered.add(requirement);
      }
      // Drift guard: a slice edited after handoff generation must not smuggle an
      // uncovered requirement past evidence that predates the edit.
      if (!evidenceFailed) {
        const required = new Set<string>();
        for (const slice of completedSlices) {
          for (const entry of sliceImplements(slice)) {
            if (typeof entry.requirement === 'string') required.add(entry.requirement);
          }
        }
        for (const requirement of [...required].sort()) {
          if (!covered.has(requirement)) {
            diagnostics.push({
              severity: 'error',
              code: 'PRODUCT044',
              message: `Requirement '${requirement}' is implemented by a completed slice but no accepted coverage evidence covers it`,
              file: change.file,
              artifact: change.id,
              target: requirement,
            });
          }
        }
      }
    }
  }

  diagnostics.push(...overlayErrors);

  // Baseline-revision compatibility: artifacts touched by the change must be
  // unchanged since base-revision (PRODUCT027).
  const baselineById = new Map(baseline.filter((a) => a.id).map((a) => [a.id as string, a]));
  if (change.baseRevision) {
    for (const id of [...change.operations.modify, ...change.operations.remove].sort()) {
      const artifact = baselineById.get(id);
      if (!artifact) continue; // PRODUCT021/022 already reported by validation.
      const historical = await gitShow(repoRoot, change.baseRevision, artifact.file);
      if (historical === undefined || contentDigest(historical) !== artifact.digest) {
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

  // Plan: archive the change directory.
  const changeDirName = change.dir.split(/[\\/]/).pop() ?? change.id?.toLowerCase() ?? 'change';
  actions.push({
    kind: 'move-change',
    description: `Move change to ${changesRelative}/completed/${changeDirName}`,
    from: `${changesRelative}/active/${changeDirName}`,
    to: `${changesRelative}/completed/${changeDirName}`,
  });

  return { changeId: change.id ?? '', actions, diagnostics };
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
 * Execute a promotion plan. Never runs implicitly and never creates Git commits.
 *
 * Two-phase: a preflight that reads every write source, confirms every delete
 * target and verifies the archive destination is absent — touching nothing on
 * failure — then execution ordered so the change-directory move (the visible
 * "promoted" marker) happens last.
 */
export async function applyPromotion(repoRoot: string, plan: PromotionPlan): Promise<void> {
  if (plan.diagnostics.some((d) => d.severity === 'error')) {
    throw new Error('Refusing to apply a promotion plan with unresolved errors');
  }

  const staged = new Map<string, string>();
  for (const action of plan.actions) {
    if (action.kind === 'write' && action.from && action.to) {
      staged.set(action.to, await readFile(join(repoRoot, ...action.from.split('/')), 'utf8'));
    } else if (action.kind === 'delete' && action.from) {
      await stat(join(repoRoot, ...action.from.split('/')));
    } else if (action.kind === 'move-change' && action.from && action.to) {
      await stat(join(repoRoot, ...action.from.split('/')));
      const target = join(repoRoot, ...action.to.split('/'));
      if (await pathExists(target)) {
        throw new Error(
          `Refusing to promote: archive destination '${action.to}' already exists; move it aside and retry`,
        );
      }
    }
  }

  try {
    for (const action of plan.actions) {
      if (action.kind === 'write' && action.to) {
        const target = join(repoRoot, ...action.to.split('/'));
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, staged.get(action.to) as string, 'utf8');
      } else if (action.kind === 'delete' && action.from) {
        await rm(join(repoRoot, ...action.from.split('/')));
      } else if (action.kind === 'move-change' && action.from && action.to) {
        const target = join(repoRoot, ...action.to.split('/'));
        await mkdir(dirname(target), { recursive: true });
        await rename(join(repoRoot, ...action.from.split('/')), target);
      }
    }
  } catch (error) {
    throw new Error(
      `Promotion failed while applying the plan: ${error instanceof Error ? error.message : String(error)}. ` +
        "Promotion never creates commits, so 'git status' shows exactly what was applied; " +
        "restore with 'git checkout -- <path>' (and remove untracked files) before retrying.",
      { cause: error },
    );
  }
}
