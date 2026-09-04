import { blockingDiagnostics, dedupeDiagnostics, sortDiagnostics } from './diagnostics.js';
import { planApply } from './apply.js';
import { validateChange } from './overlay.js';
import type { ApplyPlan } from './apply.js';
import type { Diagnostic } from './diagnostics.js';
import type { LoadedArtifact } from './model.js';
import type { LoadedChange } from './changes.js';
import type { ProductRepository } from './repository.js';

export interface HostedProductValidation {
  diagnostics: Diagnostic[];
  blocking: Diagnostic[];
}

export function validateHostedProductChange(
  repo: ProductRepository,
  baseline: LoadedArtifact[],
  change: LoadedChange,
  liveChanges: LoadedChange[],
  baselineDiagnostics: Diagnostic[] = [],
): HostedProductValidation {
  const validation = validateChange(change, baseline, liveChanges);
  const diagnostics = sortDiagnostics(
    dedupeDiagnostics([
      ...repo.configDiagnostics,
      ...baselineDiagnostics,
      ...validation.diagnostics,
    ]),
  );
  return {
    diagnostics,
    blocking: blockingDiagnostics(diagnostics, repo.config.validation['warnings-as-errors']),
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
  return {
    ...plan,
    actions: plan.actions.filter((action) => !filtered.has(action.kind)),
  };
}
