import {
  applyIdSuffixMigration,
  planIdSuffixMigration,
  stableJson,
  type IdMigrationPlan,
  type ProductRepository,
} from '@prodshape/core';
import { exitCodes, type CliIo } from '../context.js';

export const idMigrationSchemaId = 'product-definition-as-code/id-migration/v1alpha1';

export interface IdMigrationOptions {
  /** Explicit consent: apply without asking. Never implied by anything else. */
  apply?: boolean;
  /** Report only; exits 1 when something would change, so it can gate a pipeline. */
  dryRun?: boolean;
  format?: 'text' | 'json';
  /** Say nothing when no ID carries a suffix (the upgrade step runs on every adopter). */
  quietWhenNone?: boolean;
}

const collisionText: Record<string, string> = {
  'shared-base': 'several IDs would become the same ID',
  'base-exists': 'the ID without the number already exists',
  'target-taken': 'the target ID is taken',
};

function describe(io: CliIo, plan: IdMigrationPlan): void {
  io.out(`${plan.renames.length} ID(s) would lose their numeric suffix:`);
  for (const rename of plan.renames) io.out(`  ${rename.from} -> ${rename.to}`);
  if (plan.collisions.length > 0) {
    io.out(
      `${plan.collisions.length} group(s) are left as they are, because renaming would collide:`,
    );
    for (const collision of plan.collisions) {
      io.out(
        `  ${collision.ids.join(', ')}  (${collisionText[collision.reason] ?? collision.reason}: ${collision.base})`,
      );
    }
  }
  io.out(`${plan.fileMoves.length} file(s) would be renamed to keep matching their ID.`);
  io.out(
    `${plan.referenceUpdates.length} file(s) would have ID references updated (${plan.referenceUpdates.reduce((n, u) => n + u.mentions, 0)} mention(s), including relationships and Product Change overlays).`,
  );
  const cited = plan.citationUpdates.reduce((n, u) => n + u.count, 0);
  io.out(
    `${plan.citationUpdates.length} consumer file(s) would have ${cited} citation digest(s) re-pinned; ${plan.citationsLeftAlone} citation(s) that were already stale or unresolved are not touched.`,
  );
  io.out(
    'Nothing is written unless the migration is applied; a failed validation rolls everything back.',
  );
}

/**
 * The ID-suffix migration, as an upgrade step: show the plan, then change the repository only
 * with explicit consent. Interactive terminals are asked; everything else (scripts, CI, pipes)
 * defaults to no change unless `--apply-id-migration` is passed.
 */
export async function runIdSuffixMigration(
  io: CliIo,
  repo: ProductRepository,
  options: IdMigrationOptions,
): Promise<number> {
  let plan: IdMigrationPlan;
  try {
    plan = await planIdSuffixMigration(repo);
  } catch (error) {
    io.err(
      `ID-suffix migration cannot be planned: ${error instanceof Error ? error.message : String(error)}`,
    );
    return exitCodes.validationErrors;
  }
  const pending = plan.renames.length;
  const dryRun = options.dryRun === true;

  if (options.format === 'json') {
    let applied = false;
    let rolledBack: string | undefined;
    if (pending > 0 && options.apply && !dryRun) {
      const result = await applyIdSuffixMigration(repo);
      applied = result.applied;
      rolledBack = result.rolledBack;
    }
    io.out(
      stableJson({
        schema: idMigrationSchemaId,
        dryRun: dryRun || !options.apply,
        applied,
        ...(rolledBack ? { rolledBack } : {}),
        ...plan,
      }).trimEnd(),
    );
    if (rolledBack) return exitCodes.validationErrors;
    return dryRun && pending > 0 ? exitCodes.validationErrors : exitCodes.success;
  }

  if (pending === 0 && plan.collisions.length === 0) {
    if (!options.quietWhenNone) io.out('No artifact ID carries a numeric suffix.');
    return exitCodes.success;
  }
  if (pending === 0) {
    describe(io, plan);
    io.out(
      'Nothing can be migrated without a collision; resolve those IDs by hand if you want to.',
    );
    return exitCodes.success;
  }

  io.out(
    'ID-suffix migration (breaking change in 0.24): artifact IDs no longer carry a numeric suffix.',
  );
  describe(io, plan);

  if (dryRun) {
    io.out('Dry run: nothing was changed.');
    return exitCodes.validationErrors;
  }

  let consent = options.apply === true;
  if (!consent && io.prompt) {
    const answer = (
      await io.prompt(
        'Apply this migration now? IDs are normally immutable; this is a one-time exception. [y/N]: ',
      )
    )
      .trim()
      .toLowerCase();
    consent = answer === 'y' || answer === 'yes';
    if (!consent) io.out('Migration declined: nothing was changed.');
  } else if (!consent) {
    io.out(
      'Nothing was changed. Re-run with --apply-id-migration to apply, or run in a terminal to be asked.',
    );
  }
  if (!consent) return exitCodes.success;

  const result = await applyIdSuffixMigration(repo);
  if (result.rolledBack) {
    io.err(`ID-suffix migration rolled back, nothing was changed: ${result.rolledBack}`);
    return exitCodes.validationErrors;
  }
  io.out(
    `Migrated ${plan.renames.length} ID(s). Re-run: prodshape validate && prodshape citations verify`,
  );
  return exitCodes.success;
}
