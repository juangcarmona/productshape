import { join } from 'node:path';
import { loadConfig } from '@prodshape/core';
import {
  applyInitPlan,
  InstallConflictError,
  planInit,
  rendererFor,
  type InitAction,
  type InitActionKind,
  type InitPlan,
} from '@prodshape/distribution';
import { CliError, exitCodes, type CliIo } from '../context.js';

export interface InitCliOptions {
  ai?: string;
  force?: boolean;
  flat?: boolean;
  shorthand?: boolean;
  dryRun?: boolean;
}

const groupLabels: Record<InitActionKind, string> = {
  create: 'Would create',
  preserve: 'Would preserve',
  regenerate: 'Would regenerate',
  overwrite: 'Would overwrite',
  conflict: 'Conflicts',
};

const groupNotes: Partial<Record<InitActionKind, string>> = {
  regenerate: 'managed by the installation lock; rewritten identically',
  overwrite: 'replaced because --force is set',
};

function reportPlan(io: CliIo, plan: InitPlan): number {
  io.out(`Init plan for ${plan.root} (dry run):`);
  const order: InitActionKind[] = ['create', 'preserve', 'regenerate', 'overwrite', 'conflict'];
  for (const kind of order) {
    const group = plan.actions.filter((a: InitAction) => a.kind === kind);
    if (group.length === 0) {
      // Zero overwrites and zero conflicts are the reassuring cases: say them out loud.
      if (kind === 'overwrite' || kind === 'conflict') io.out(`  ${groupLabels[kind]} (0)`);
      continue;
    }
    const note = groupNotes[kind];
    io.out(`  ${groupLabels[kind]} (${group.length})${note ? ` — ${note}` : ''}:`);
    for (const action of group) {
      io.out(`    ${action.path}${action.reason ? ` (${action.reason})` : ''}`);
    }
  }
  io.out('Dry run: nothing was changed.');
  if (plan.conflicts.length > 0) {
    io.out('');
    io.out('Reconcile the conflicting files, or re-run with --force to overwrite them.');
    return exitCodes.validationErrors;
  }
  io.out('Next steps once applied:');
  for (const step of plan.nextSteps) io.out(`  - ${step}`);
  return exitCodes.success;
}

export async function runInit(io: CliIo, options: InitCliOptions): Promise<number> {
  const ai = (options.ai ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  for (const provider of ai) {
    if (!rendererFor(provider)) {
      throw new CliError(
        `Unknown AI provider '${provider}' (supported: claude, copilot, codex)`,
        exitCodes.invalidInvocation,
      );
    }
  }

  // Read any existing configuration first, so a preserved config.yaml keeps deciding what is
  // rendered rather than a flag silently disagreeing with it.
  const existing = await loadConfig(join(io.cwd, '.product', 'config.yaml'), io.cwd);

  const plan = await planInit({
    root: io.cwd,
    ai,
    existingShorthand: existing.config.integrations['shorthand-commands'],
    ...(options.force !== undefined ? { force: options.force } : {}),
    ...(options.flat !== undefined ? { flat: options.flat } : {}),
    ...(options.shorthand !== undefined ? { shorthand: options.shorthand } : {}),
  });

  if (options.dryRun) return reportPlan(io, plan);

  let result;
  try {
    result = await applyInitPlan(plan);
  } catch (error) {
    if (error instanceof InstallConflictError) {
      throw new CliError(error.message, exitCodes.validationErrors);
    }
    throw error;
  }

  io.out(`Initialized Product Definition as Code (${result.created.length} file(s) created).`);
  if (result.skipped.length > 0) {
    io.out('Preserved existing files (use --force to overwrite):');
    for (const path of result.skipped) io.out(`  ${path}`);
  }
  if (result.removed.length > 0) {
    io.out('Removed managed files that are no longer generated:');
    for (const path of result.removed) io.out(`  ${path}`);
  }
  io.out('Next steps:');
  for (const step of result.nextSteps) io.out(`  - ${step}`);
  return exitCodes.success;
}
