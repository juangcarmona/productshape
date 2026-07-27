import {
  applyFilenameFixes,
  applyFilenameRecovery,
  discoverFixTempFiles,
  loadModel,
  planFilenameFixes,
  planFilenameRecovery,
  stableJson,
  type FilenameFix,
} from '@prodshape/core';
import { CliError, exitCodes, resolveRepository, type CliIo } from '../context.js';

export const fixPlanSchemaId = 'product-definition-as-code/fix-plan/v1alpha1';

export interface FixOptions {
  filenames?: boolean;
  dryRun?: boolean;
  format?: 'text' | 'json';
}

/** Available fixers, named so an invocation with none can say what it expected. */
const fixers = ['--filenames'];

export async function runFix(io: CliIo, options: FixOptions): Promise<number> {
  if (!options.filenames) {
    // Never implicit: this repository's posture is that mutating commands are asked for by name.
    throw new CliError(
      `Nothing to fix: choose a fixer (${fixers.join(', ')})`,
      exitCodes.invalidInvocation,
    );
  }

  const repo = await resolveRepository(io);
  const dryRun = options.dryRun === true;

  // Classify any rename interrupted between its two steps. Planning is read-only; the renames
  // happen below, and only when this is not a dry run.
  const leftovers = await discoverFixTempFiles(repo.modelDir, repo.root);
  const recoveryPlan = await planFilenameRecovery(repo.root, leftovers);

  // A recovered file lands at the name its ID requires, so it never produces a fix of its own.
  // Outside a dry run the renames happen first anyway, so the model below already includes them
  // and target collisions are detected against the real tree.
  const recovered = dryRun ? [] : await applyFilenameRecovery(repo.root, recoveryPlan);

  // loadModel, not validateBaseline: no graph is needed, and a file that fails to parse yields no
  // artifact and is correctly left alone.
  const model = await loadModel(repo.modelDir, repo.root, repo.registry);
  const plan = planFilenameFixes(model.artifacts);

  const blocked = [...recoveryPlan.blocked, ...plan.blocked];
  const wouldRecover = dryRun ? recoveryPlan.recoverable.map((entry) => entry.to) : [];
  const pending = plan.fixes.length + wouldRecover.length;

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: fixPlanSchemaId,
        dryRun,
        recovered,
        wouldRecover,
        fixes: plan.fixes,
        blocked,
      }).trimEnd(),
    );
    return resolveExitCode({ blocked, dryRun, pending });
  }

  for (const path of recovered) io.out(`recovered ${path} from an interrupted rename`);
  for (const path of wouldRecover) io.out(`would recover ${path} from an interrupted rename`);

  if (blocked.length > 0) {
    io.out(`${blocked.length} file(s) need attention before any rename can run:`);
    for (const fix of blocked) io.out(`  ${fix.from} -> ${fix.to} (${fix.blocked})`);
    return exitCodes.validationErrors;
  }

  if (plan.fixes.length === 0) {
    if (pending === 0) {
      io.out(
        recovered.length > 0
          ? 'All file names are aligned with their IDs.'
          : '0 fix(es): all file names are already aligned with their IDs.',
      );
    } else {
      io.out('Dry run: nothing was changed.');
    }
    return resolveExitCode({ blocked, dryRun, pending });
  }

  if (dryRun) {
    io.out(`Would rename ${plan.fixes.length} file(s) to match their ID casing:`);
    for (const fix of plan.fixes) io.out(`  ${fix.from} -> ${fix.to}  [${fix.artifact}]`);
    io.out('Dry run: nothing was changed.');
    return resolveExitCode({ blocked, dryRun, pending });
  }

  await applyFilenameFixes(repo.root, plan);
  io.out(`Renamed ${plan.fixes.length} file(s) to match their ID casing:`);
  for (const fix of plan.fixes) io.out(`  ${fix.from} -> ${fix.to}`);
  io.out('Re-run: prodshape validate');
  return exitCodes.success;
}

function resolveExitCode(state: {
  blocked: FilenameFix[];
  dryRun: boolean;
  pending: number;
}): number {
  if (state.blocked.length > 0) return exitCodes.validationErrors;
  // Non-zero when anything would change, so this is usable as a CI gate. PRODUCT101 is a warning
  // and repositories default to warnings-as-errors: false, so without this there is no gate on
  // filename drift at all. Matches `integration update --check`.
  if (state.dryRun && state.pending > 0) return exitCodes.validationErrors;
  return exitCodes.success;
}
