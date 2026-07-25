import { join } from 'node:path';
import { checkSliceEvidence } from '@prodshape/adapter-openspec';
import {
  applyPromotion,
  discoverChanges,
  escalateWarnings,
  loadChange,
  loadModel,
  planPromotion,
  stableJson,
  validateChange,
  type CoverageEvidenceProvider,
  type LoadedChange,
  type ProductRepository,
} from '@prodshape/core';
import {
  CliError,
  exitCodes,
  formatDiagnosticLine,
  resolveRepository,
  type CliIo,
} from '../context.js';

export async function loadActiveChanges(repo: ProductRepository): Promise<LoadedChange[]> {
  const dirs = await discoverChanges(join(repo.changesDir, 'active'));
  const changes: LoadedChange[] = [];
  for (const dir of dirs) changes.push(await loadChange(dir, repo.root, repo.registry));
  return changes;
}

export function findChange(changes: LoadedChange[], id: string): LoadedChange {
  const change = changes.find((c) => c.id === id);
  if (!change) {
    throw new CliError(`Unknown active Product Change '${id}'`, exitCodes.validationErrors);
  }
  return change;
}

export interface ChangeValidateOptions {
  format?: 'text' | 'json';
}

export async function runChangeValidate(
  io: CliIo,
  id: string,
  options: ChangeValidateOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const changes = await loadActiveChanges(repo);
  const change = findChange(changes, id);
  const model = await loadModel(repo.modelDir, repo.root, repo.registry);

  const { diagnostics, overlayGraph } = validateChange(
    change,
    model.artifacts,
    changes,
    repo.config,
  );
  const allDiagnostics = escalateWarnings(
    [...model.diagnostics, ...diagnostics],
    repo.config.validation['warnings-as-errors'],
  );
  const errors = allDiagnostics.filter((d) => d.severity === 'error');
  const warnings = allDiagnostics.filter((d) => d.severity === 'warning');

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/diagnostics/v1alpha1',
        change: id,
        diagnostics: allDiagnostics,
        summary: { errors: errors.length, warnings: warnings.length },
      }).trimEnd(),
    );
  } else {
    for (const diagnostic of allDiagnostics) io.out(formatDiagnosticLine(diagnostic));
    io.out(
      `${id}: ${errors.length} error(s), ${warnings.length} warning(s); overlay has ${overlayGraph.nodes.length} artifact(s)`,
    );
  }
  return errors.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}

export interface ChangePromoteOptions {
  dryRun?: boolean;
  acceptExternalEvidence?: boolean;
}

export async function runChangePromote(
  io: CliIo,
  id: string,
  options: ChangePromoteOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const changes = await loadActiveChanges(repo);
  const change = findChange(changes, id);
  const model = await loadModel(repo.modelDir, repo.root, repo.registry);

  const validation = validateChange(change, model.artifacts, changes, repo.config);
  const overlayErrors = escalateWarnings(
    [...model.diagnostics, ...validation.diagnostics],
    repo.config.validation['warnings-as-errors'],
  ).filter((d) => d.severity === 'error');

  const coverageProvider: CoverageEvidenceProvider | undefined =
    repo.config.integrations.sdd.provider === 'openspec'
      ? (forChange, slice) =>
          checkSliceEvidence(repo.root, forChange.id ?? '', slice.id ?? '', repo.registry)
      : undefined;

  const plan = await planPromotion({
    repoRoot: repo.root,
    modelRelative: repo.config.product.model,
    changesRelative: repo.config.product.changes,
    change,
    baseline: model.artifacts,
    overlayErrors,
    coverageProvider,
    acceptExternalEvidence: options.acceptExternalEvidence,
    warningsAsErrors: repo.config.validation['warnings-as-errors'],
  });

  const planErrors = plan.diagnostics.filter((d) => d.severity === 'error');
  const planWarnings = plan.diagnostics.filter((d) => d.severity === 'warning');
  io.out(`Promotion plan for ${id}:`);
  for (const action of plan.actions) io.out(`  ${action.kind}: ${action.description}`);
  for (const diagnostic of planWarnings) io.out(`  ${formatDiagnosticLine(diagnostic)}`);
  if (planErrors.length > 0) {
    io.out('Blocking problems:');
    for (const diagnostic of planErrors) io.out(`  ${formatDiagnosticLine(diagnostic)}`);
    return exitCodes.validationErrors;
  }

  if (options.dryRun) {
    io.out('Dry run: nothing was changed.');
    return exitCodes.success;
  }

  try {
    await applyPromotion(repo.root, plan);
  } catch (error) {
    io.err(`error: ${error instanceof Error ? error.message : String(error)}`);
    return exitCodes.validationErrors;
  }
  io.out(`Promoted ${id}: baseline updated, change moved to completed.`);
  io.out('Review and commit the result; promotion never creates Git commits.');
  return exitCodes.success;
}
