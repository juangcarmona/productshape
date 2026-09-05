import { join } from 'node:path';
import { executeApply, planApply, preflightApply } from './apply.js';
import { discoverChanges, loadChange } from './changes.js';
import { blockingDiagnostics, dedupeDiagnostics, sortDiagnostics } from './diagnostics.js';
import { validateChange } from './overlay.js';
import { validateBaseline } from './repository.js';
import type { ApplyPlan } from './apply.js';
import type { LoadedChange } from './changes.js';
import type { Diagnostic } from './diagnostics.js';
import type { ProductGraph } from './graph.js';
import type { LoadedArtifact } from './model.js';
import type { BaselineValidation, ProductRepository } from './repository.js';

export const TERMINAL_CHANGE_STATUSES: ReadonlySet<string> = new Set([
  'applied',
  'rejected',
  'superseded',
]);

export function isTerminalChange(change: LoadedChange): boolean {
  return change.status !== undefined && TERMINAL_CHANGE_STATUSES.has(change.status);
}

/** The host's non-terminal changes plus the native `changes/active` ones. */
export async function loadLiveChanges(
  repo: ProductRepository,
  hostedChangeDirs: readonly string[],
): Promise<LoadedChange[]> {
  const load = (dir: string) => loadChange(dir, repo.root, repo.registry);
  const hosted = await Promise.all(hostedChangeDirs.map(load));
  const native = await Promise.all(
    (await discoverChanges(join(repo.changesDir, 'active'))).map(load),
  );
  return [...hosted.filter((change) => !isTerminalChange(change)), ...native];
}

export interface HostedProductValidation {
  diagnostics: Diagnostic[];
  blocking: Diagnostic[];
  overlayArtifacts: LoadedArtifact[];
  overlayGraph: ProductGraph;
}

export function validateHostedProductChange(
  repo: ProductRepository,
  baseline: LoadedArtifact[],
  change: LoadedChange,
  liveChanges: LoadedChange[],
  baselineDiagnostics: Diagnostic[] = [],
): HostedProductValidation {
  const overlay = validateChange(change, baseline, liveChanges);
  const diagnostics = sortDiagnostics(
    dedupeDiagnostics([...repo.configDiagnostics, ...baselineDiagnostics, ...overlay.diagnostics]),
  );
  return {
    diagnostics,
    blocking: blockingDiagnostics(diagnostics, repo.config.validation['warnings-as-errors']),
    overlayArtifacts: overlay.overlayArtifacts,
    overlayGraph: overlay.overlayGraph,
  };
}

export interface HostedProductAssessment extends HostedProductValidation {
  baseline: BaselineValidation;
}

export async function assessHostedProductChange(
  repo: ProductRepository,
  change: LoadedChange,
  liveChanges: LoadedChange[],
): Promise<HostedProductAssessment> {
  const baseline = await validateBaseline(repo);
  return {
    baseline,
    ...validateHostedProductChange(
      repo,
      baseline.artifacts,
      change,
      liveChanges,
      baseline.diagnostics,
    ),
  };
}

export async function planHostedProductChange(options: {
  repoRoot: string;
  modelRelative: string;
  changesRelative: string;
  change: LoadedChange;
  baseline: LoadedArtifact[];
  overlayErrors: Diagnostic[];
  filterActionKinds?: readonly ApplyPlan['actions'][number]['kind'][];
}): Promise<ApplyPlan> {
  const plan = await planApply({
    repoRoot: options.repoRoot,
    modelRelative: options.modelRelative,
    changesRelative: options.changesRelative,
    change: options.change,
    baseline: options.baseline,
    overlayErrors: options.overlayErrors,
  });
  const filtered = new Set(options.filterActionKinds ?? ['move-change']);
  return { ...plan, actions: plan.actions.filter((action) => !filtered.has(action.kind)) };
}

export type HostedProductApplyOutcome = 'applied' | 'dry-run' | 'refused';

export interface HostedProductApplyResult {
  outcome: HostedProductApplyOutcome;
  plan: ApplyPlan;
  change: LoadedChange;
  resultingModel?: BaselineValidation;
}

function hostedStatusGateMessage(status: string | undefined): string {
  return `Apply requires status 'approved'; the change is '${status ?? 'unknown'}'. The transition into the apply-authorised state belongs to the caller's authorisation policy; the integration never performs or judges it.`;
}

function withHostedStatusGateMessage(plan: ApplyPlan, change: LoadedChange): ApplyPlan {
  return {
    ...plan,
    diagnostics: plan.diagnostics.map((diagnostic) =>
      diagnostic.code === 'PRODUCT028'
        ? { ...diagnostic, message: hostedStatusGateMessage(change.status) }
        : diagnostic,
    ),
  };
}

export async function applyHostedProductChange(options: {
  repo: ProductRepository;
  change: LoadedChange;
  liveChanges: LoadedChange[];
  dryRun?: boolean;
}): Promise<HostedProductApplyResult> {
  const { repo, change, liveChanges, dryRun = false } = options;
  const assessed = await assessHostedProductChange(repo, change, liveChanges);
  const plan = withHostedStatusGateMessage(
    await planHostedProductChange({
      repoRoot: repo.root,
      modelRelative: repo.config.product.model,
      changesRelative: repo.config.product.changes,
      change,
      baseline: assessed.baseline.artifacts,
      overlayErrors: assessed.blocking,
    }),
    change,
  );
  if (plan.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    return { outcome: 'refused', plan, change };
  }
  if (dryRun) {
    await preflightApply(repo.root, plan);
    return { outcome: 'dry-run', plan, change };
  }
  await executeApply(repo.root, plan);
  return { outcome: 'applied', plan, change, resultingModel: await validateBaseline(repo) };
}
