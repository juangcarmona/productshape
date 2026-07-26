import {
  applyFilenameFixes,
  discoverFixTempFiles,
  loadModel,
  planFilenameFixes,
  recoverFilenameFixes,
  stableJson,
  type FilenamePlan,
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

  // Finish any rename interrupted between its two steps before planning, so a crashed run
  // self-heals rather than leaving an artifact invisible to discovery.
  const leftovers = await discoverFixTempFiles(repo.modelDir, repo.root);
  const recovery = await recoverFilenameFixes(repo.root, leftovers);

  // loadModel, not validateBaseline: no graph is needed, and a file that fails to parse yields no
  // artifact and is correctly left alone.
  const model = await loadModel(repo.modelDir, repo.root, repo.registry);
  const plan = planFilenameFixes(model.artifacts);

  const blocked = [...recovery.blocked, ...plan.blocked];
  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: fixPlanSchemaId,
        dryRun: options.dryRun === true,
        recovered: recovery.recovered,
        fixes: plan.fixes,
        blocked,
      }).trimEnd(),
    );
    return exitCode(plan, blocked, options);
  }

  for (const path of recovery.recovered) {
    io.out(`recovered ${path} from an interrupted rename`);
  }
  if (blocked.length > 0) {
    io.out(`${blocked.length} file(s) need attention before any rename can run:`);
    for (const fix of blocked) io.out(`  ${fix.from} -> ${fix.to} (${fix.blocked})`);
  }
  if (plan.fixes.length === 0 && blocked.length === 0) {
    io.out(
      recovery.recovered.length > 0
        ? 'All file names are aligned with their IDs.'
        : '0 fix(es): all file names are already aligned with their IDs.',
    );
    return exitCodes.success;
  }

  if (blocked.length > 0) return exitCodes.validationErrors;

  if (options.dryRun) {
    io.out(`Would rename ${plan.fixes.length} file(s) to match their ID casing:`);
    for (const fix of plan.fixes) io.out(`  ${fix.from} -> ${fix.to}  [${fix.artifact}]`);
    io.out('Dry run: nothing was changed.');
    // Non-zero when anything would change, so this is usable as a CI gate. PRODUCT101 is a
    // warning and repositories default to warnings-as-errors: false, so without this there is no
    // gate on filename drift at all. Matches `integration update --check`.
    return exitCodes.validationErrors;
  }

  await applyFilenameFixes(repo.root, plan);
  io.out(`Renamed ${plan.fixes.length} file(s) to match their ID casing:`);
  for (const fix of plan.fixes) io.out(`  ${fix.from} -> ${fix.to}`);
  io.out('Re-run: prodshape validate');
  return exitCodes.success;
}

function exitCode(plan: FilenamePlan, blocked: unknown[], options: FixOptions): number {
  if (blocked.length > 0) return exitCodes.validationErrors;
  if (options.dryRun && plan.fixes.length > 0) return exitCodes.validationErrors;
  return exitCodes.success;
}
