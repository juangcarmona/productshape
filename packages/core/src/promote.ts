import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { LoadedChange } from './changes.js';
import { contentDigest } from './digest.js';
import type { Diagnostic } from './diagnostics.js';
import { gitShow } from './git.js';
import type { LoadedArtifact } from './model.js';

/** Where each artifact type lives inside the model directory. */
export const modelSubdirByType: Record<string, string> = {
  actor: 'actors',
  journey: 'journeys',
  'use-case': 'use-cases',
  'business-rule': 'business-rules',
  'domain-term': 'domain/terms',
  'bounded-context': 'domain/bounded-contexts',
  'functional-requirement': 'requirements/functional',
  'quality-requirement': 'requirements/quality',
  constraint: 'requirements/constraints',
};

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

export interface PlanPromotionOptions {
  repoRoot: string;
  modelRelative: string;
  changesRelative: string;
  change: LoadedChange;
  baseline: LoadedArtifact[];
  /** Error diagnostics from full overlay revalidation. */
  overlayErrors: Diagnostic[];
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

/** Execute a promotion plan. Never runs implicitly and never creates Git commits. */
export async function applyPromotion(repoRoot: string, plan: PromotionPlan): Promise<void> {
  if (plan.diagnostics.some((d) => d.severity === 'error')) {
    throw new Error('Refusing to apply a promotion plan with unresolved errors');
  }
  for (const action of plan.actions) {
    if (action.kind === 'write' && action.from && action.to) {
      const content = await readFile(join(repoRoot, ...action.from.split('/')), 'utf8');
      const target = join(repoRoot, ...action.to.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, 'utf8');
    } else if (action.kind === 'delete' && action.from) {
      await rm(join(repoRoot, ...action.from.split('/')));
    } else if (action.kind === 'move-change' && action.from && action.to) {
      const target = join(repoRoot, ...action.to.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await rename(join(repoRoot, ...action.from.split('/')), target);
    }
  }
}
