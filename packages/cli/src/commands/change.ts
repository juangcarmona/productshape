import { mkdir, rename, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  discoverChanges,
  escalateWarnings,
  executeApply,
  loadChange,
  planApply,
  sortDiagnostics,
  stableJson,
  validateBaseline,
  validateChange,
  type ApplyPlan,
  type Diagnostic,
  type LoadedChange,
  type ProductRepository,
} from '@prodshape/core';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export interface ChangeFormatOptions {
  format?: 'text' | 'json';
}

/** Load every live change under changes/active. Archived changes are inert and never loaded. */
async function loadActiveChanges(repo: ProductRepository): Promise<LoadedChange[]> {
  const dirs = await discoverChanges(join(repo.changesDir, 'active'));
  const changes: LoadedChange[] = [];
  for (const dir of dirs) changes.push(await loadChange(dir, repo.root, repo.registry));
  return changes;
}

/** Match a change by its ID, case-insensitively, or by its directory name. */
function findChange(changes: LoadedChange[], id: string): LoadedChange | undefined {
  const wanted = id.toLowerCase();
  return changes.find(
    (change) =>
      change.id?.toLowerCase() === wanted || basename(change.dir).toLowerCase() === wanted,
  );
}

function notFound(io: CliIo, id: string, changes: LoadedChange[]): number {
  io.err(`error: no live change '${id}' under docs/product/changes/active/`);
  if (changes.length > 0) {
    io.err(`known: ${changes.map((c) => c.id ?? basename(c.dir)).join(', ')}`);
  }
  return exitCodes.invalidInvocation;
}

/**
 * `prodshape change validate [id]`: validate live Product Changes as overlays on the baseline.
 *
 * Each change is compiled against the baseline into an overlay and the result is validated end to
 * end, without touching a single baseline file. With no ID every live change is validated, which
 * is the form a CI gate runs.
 */
export async function runChangeValidate(
  io: CliIo,
  id: string | undefined,
  options: ChangeFormatOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const baseline = await validateBaseline(repo);
  const changes = await loadActiveChanges(repo);

  const selected = id ? findChange(changes, id) : undefined;
  if (id && !selected) return notFound(io, id, changes);
  const targets = selected ? [selected] : changes;

  // The baseline must be sound before an overlay on it means anything.
  const diagnostics: Diagnostic[] = [...baseline.diagnostics];
  for (const change of targets) {
    diagnostics.push(
      ...validateChange(change, baseline.artifacts, changes, repo.config).diagnostics,
    );
  }

  const escalated = escalateWarnings(
    sortDiagnostics(diagnostics),
    repo.config.validation['warnings-as-errors'],
  );
  const errors = escalated.filter((d) => d.severity === 'error');
  const warnings = escalated.filter((d) => d.severity === 'warning');

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/diagnostics/v1alpha1',
        diagnostics: escalated,
        summary: { errors: errors.length, warnings: warnings.length, changes: targets.length },
      }).trimEnd(),
    );
  } else {
    for (const diagnostic of escalated) io.out(formatDiagnosticLine(diagnostic));
    io.out(
      `${errors.length} error(s), ${warnings.length} warning(s) across ${baseline.graph.nodes.length} artifact(s) and ${targets.length} live change(s)`,
    );
    if (targets.length === 0) io.out('No live changes under docs/product/changes/active/.');
  }

  return errors.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}

export interface ChangeListOptions extends ChangeFormatOptions {
  all?: boolean;
}

interface ListedChange {
  id: string;
  title: string;
  status: string;
  state: 'active' | 'completed' | 'rejected';
  operations: { add: number; modify: number; remove: number };
  path: string;
}

async function listArchived(
  repo: ProductRepository,
  state: 'completed' | 'rejected',
): Promise<ListedChange[]> {
  const dirs = await discoverChanges(join(repo.changesDir, state));
  const listed: ListedChange[] = [];
  for (const dir of dirs) {
    const change = await loadChange(dir, repo.root, repo.registry);
    listed.push(describe(change, state));
  }
  return listed;
}

function describe(change: LoadedChange, state: ListedChange['state']): ListedChange {
  return {
    id: change.id ?? basename(change.dir),
    title: change.title ?? '(untitled)',
    status: change.status ?? 'unknown',
    state,
    operations: {
      add: change.operations.add.length,
      modify: change.operations.modify.length,
      remove: change.operations.remove.length,
    },
    path: change.file,
  };
}

/** `prodshape change list [--all]`: live changes, or the whole change history with --all. */
export async function runChangeList(io: CliIo, options: ChangeListOptions): Promise<number> {
  const repo = await resolveRepository(io);
  const listed = (await loadActiveChanges(repo)).map((change) => describe(change, 'active'));
  if (options.all) {
    listed.push(...(await listArchived(repo, 'completed')));
    listed.push(...(await listArchived(repo, 'rejected')));
  }

  if (options.format === 'json') {
    io.out(stableJson({ changes: listed }).trimEnd());
    return exitCodes.success;
  }

  if (listed.length === 0) {
    io.out(
      options.all ? 'No changes found.' : 'No live changes under docs/product/changes/active/.',
    );
    return exitCodes.success;
  }
  for (const change of listed) {
    const ops = `+${change.operations.add} ~${change.operations.modify} -${change.operations.remove}`;
    io.out(`${change.state}\t${change.status}\t${change.id}\t${ops}\t${change.title}`);
  }
  return exitCodes.success;
}

export interface ChangeApplyOptions extends ChangeFormatOptions {
  dryRun?: boolean;
}

function reportPlan(io: CliIo, plan: ApplyPlan, dryRun: boolean): void {
  io.out(`${dryRun ? 'Would apply' : 'Applied'} ${plan.changeId}:`);
  for (const action of plan.actions) io.out(`  ${action.description}`);
  const { added, modified, removed } = plan.diff;
  io.out(
    `Product diff: ${added.length} added, ${modified.length} modified, ${removed.length} removed`,
  );
  for (const entry of [...added, ...modified]) io.out(`  ${entry.id} ${entry.digest}`);
  for (const entry of removed) io.out(`  ${entry.id} removed`);
}

/**
 * `prodshape change apply <id>`: materialize an approved Product Change into the working tree.
 *
 * Apply is not acceptance. It writes the change's operations into the proposal's model files,
 * computes the product diff, revalidates the result and archives the change. It creates no commit
 * and merges nothing: only a human merging the pull request accepts the change.
 */
export async function runChangeApply(
  io: CliIo,
  id: string,
  options: ChangeApplyOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const baseline = await validateBaseline(repo);
  const changes = await loadActiveChanges(repo);
  const change = findChange(changes, id);
  if (!change) return notFound(io, id, changes);

  const validation = validateChange(change, baseline.artifacts, changes, repo.config);
  const overlayErrors = escalateWarnings(
    validation.diagnostics,
    repo.config.validation['warnings-as-errors'],
  ).filter((d) => d.severity === 'error');

  const plan = await planApply({
    repoRoot: repo.root,
    modelRelative: repo.config.product.model,
    changesRelative: repo.config.product.changes,
    change,
    baseline: baseline.artifacts,
    overlayErrors,
  });

  const blocking = plan.diagnostics.filter((d) => d.severity === 'error');
  if (plan.blockers.length > 0 || blocking.length > 0) {
    for (const blocker of plan.blockers) io.err(`error: ${blocker}`);
    for (const diagnostic of blocking) io.err(formatDiagnosticLine(diagnostic));
    if (options.format === 'json') {
      io.out(
        stableJson({
          applied: false,
          change: plan.changeId,
          blockers: plan.blockers,
          diagnostics: blocking,
        }).trimEnd(),
      );
    }
    return exitCodes.validationErrors;
  }

  if (!options.dryRun) await executeApply(repo.root, plan);

  if (options.format === 'json') {
    io.out(
      stableJson({
        applied: !options.dryRun,
        change: plan.changeId,
        actions: plan.actions,
        diff: plan.diff,
      }).trimEnd(),
    );
  } else {
    reportPlan(io, plan, options.dryRun ?? false);
    io.out(
      options.dryRun
        ? 'Dry run: nothing was written.'
        : 'Applied and archived. Nothing was committed: open a pull request so a human can accept it.',
    );
  }

  return exitCodes.success;
}

/**
 * `prodshape change archive <id>`: file a withdrawn change into the change history.
 *
 * Applying a change archives it under `completed/`, so this command exists for the other outcome:
 * a change that was rejected or superseded rather than applied. It is a file move, never a Git
 * operation.
 */
export async function runChangeArchive(
  io: CliIo,
  id: string,
  options: ChangeFormatOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const changes = await loadActiveChanges(repo);
  const change = findChange(changes, id);
  if (!change) return notFound(io, id, changes);

  if (change.status !== 'rejected' && change.status !== 'superseded') {
    io.err(
      `error: change '${change.id ?? id}' has status '${change.status ?? 'unknown'}'. Archiving is for a change that was withdrawn, so set status to 'rejected' or 'superseded' first; an approved change is filed by 'prodshape change apply'.`,
    );
    return exitCodes.invalidInvocation;
  }

  const dirName = basename(change.dir);
  const destDir = join(repo.changesDir, 'rejected', dirName);
  try {
    await stat(destDir);
    io.err(
      `error: an archived change already exists at ${repo.config.product.changes}/rejected/${dirName}/`,
    );
    return exitCodes.invalidInvocation;
  } catch {
    // Destination is absent, which is what we need.
  }

  await mkdir(join(repo.changesDir, 'rejected'), { recursive: true });
  await rename(change.dir, destDir);

  const path = `${repo.config.product.changes}/rejected/${dirName}/change.md`;
  if (options.format === 'json') {
    io.out(stableJson({ archived: { id: change.id ?? dirName, path } }).trimEnd());
  } else {
    io.out(`Archived ${change.id ?? dirName} to ${path}`);
  }
  return exitCodes.success;
}
