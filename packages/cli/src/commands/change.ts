import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  appliedArtifacts,
  computeAffectedCitations,
  discoverChanges,
  escalateWarnings,
  executeApply,
  gitHead,
  loadChange,
  planApply,
  preflightApply,
  requiredBodySections,
  scanCitations,
  sortDiagnostics,
  stableJson,
  validateBaseline,
  validateChange,
  type AffectedCitation,
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

export interface ChangeCreateOptions extends ChangeFormatOptions {
  title?: string;
}

/** The change ID grammar (schemas/common.schema.json `productChangeId`), checked up front so an
 * invalid ID is refused before anything is written. */
const changeIdPattern = /^CHG-[A-Z0-9]+(-[A-Z0-9]+)*$/;

/**
 * The sentinel base-revision of a change created where no Git history exists yet, matching the
 * CHG-INITIAL convention: seven zeros satisfy the `gitRevision` schema pattern while naming no
 * real commit, so drift detection (PRODUCT027) has nothing to compare against.
 */
const noBaselineRevision = '0000000';

/**
 * Per-section starter prose, condensed from the authoring template
 * (assets/templates/product-change.md) so a scaffolded change explains itself. `Open Questions`
 * starts at `None.` because a placeholder list item would read as an unresolved question once the
 * change reaches `approved` (PRODUCT108).
 */
const sectionGuidance: Record<string, string> = {
  Problem: 'What is wrong or missing in the current Product Definition? State the problem, not the solution.',
  'Intended Product Outcome':
    'What the Product Definition says once this change is accepted. Describe the destination, not the steps.',
  Rationale: 'Why this outcome, and why now.',
  'Affected Product Areas':
    'Which parts of the product this change touches, in product language rather than file paths.',
  'Open Questions': 'None.',
  'Product Acceptance':
    'How a human recognises that the accepted definition expresses the intended outcome.',
  'Out of Scope':
    'What this change explicitly does not touch, including delivery, technical design and implementation.',
};

/** 'CHG-ADD-CITE-001' -> 'Add cite 001': a real title is expected to replace it, but the default
 * must satisfy the schema's non-empty `title` and read as something a human would recognise. */
function defaultTitle(id: string): string {
  const words = id.split('-').slice(1).map((word) => word.toLowerCase());
  const first = words[0] ?? '';
  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(' ');
}

/** A YAML single-quoted scalar: total escaping, so any single-line title round-trips. */
function yamlSingleQuoted(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function scaffoldChangeDocument(id: string, title: string, baseRevision: string): string {
  const body = requiredBodySections['product-change'].flatMap((section) => [
    `## ${section}`,
    '',
    sectionGuidance[section] ?? 'TODO.',
    '',
  ]);
  return [
    '---',
    `id: ${id}`,
    'type: product-change',
    `title: ${yamlSingleQuoted(title)}`,
    'status: draft',
    // Quoted so YAML reads an all-digit revision as a string (see the authoring template).
    `base-revision: '${baseRevision}'`,
    'operations:',
    '  add: []',
    '  modify: []',
    '  remove: []',
    '---',
    '',
    ...body,
  ].join('\n');
}

/**
 * `prodshape change create <id>`: scaffold a draft Product Change under changes/active/.
 *
 * Deterministic and prompt-free, so it is safe to run from scripts and CI. The result is a valid
 * draft with intentionally empty operations: `base-revision` is the repository HEAD (or the
 * CHG-INITIAL sentinel where no Git history exists), and every required body section is present,
 * so `prodshape change validate` accepts the scaffold as-is. An existing change with the same ID
 * or directory is never overwritten.
 */
export async function runChangeCreate(
  io: CliIo,
  id: string,
  options: ChangeCreateOptions,
): Promise<number> {
  if (!changeIdPattern.test(id)) {
    io.err(
      `error: invalid change ID '${id}': expected CHG- followed by uppercase A-Z/0-9 words separated by hyphens (e.g. CHG-ADD-CITE-001)`,
    );
    return exitCodes.invalidInvocation;
  }
  const title = options.title ?? defaultTitle(id);
  if (title.includes('\n')) {
    io.err('error: --title must be a single line');
    return exitCodes.invalidInvocation;
  }

  const repo = await resolveRepository(io);
  const changes = await loadActiveChanges(repo);
  const existing = findChange(changes, id);
  if (existing) {
    io.err(`error: change '${id}' already exists at ${existing.file}`);
    return exitCodes.invalidInvocation;
  }
  const dirName = id.toLowerCase();
  const dir = join(repo.changesDir, 'active', dirName);
  const relativeDir = `${repo.config.product.changes}/active/${dirName}`;
  try {
    await stat(dir);
    io.err(`error: ${relativeDir}/ already exists`);
    return exitCodes.invalidInvocation;
  } catch {
    // Destination is absent, which is what we need.
  }

  const baseRevision = (await gitHead(repo.root)) ?? noBaselineRevision;
  await mkdir(join(dir, 'proposed'), { recursive: true });
  await writeFile(join(dir, 'change.md'), `${scaffoldChangeDocument(id, title, baseRevision)}\n`, {
    encoding: 'utf8',
    // Belt and braces alongside the stat probe: never clobber a concurrently created change.
    flag: 'wx',
  });

  const path = `${relativeDir}/change.md`;
  if (options.format === 'json') {
    io.out(
      stableJson({
        created: { id, title, status: 'draft', baseRevision, path },
      }).trimEnd(),
    );
  } else {
    io.out(`Created ${path} (status draft, base-revision ${baseRevision})`);
    io.out('Next steps:');
    io.out('  - Describe the problem and the intended product outcome in change.md.');
    io.out(
      `  - Declare operations and author complete proposed artifacts under ${relativeDir}/proposed/.`,
    );
    io.out(`  - Validate the overlay: prodshape change validate ${id}`);
  }
  return exitCodes.success;
}

export interface ChangeListOptions extends ChangeFormatOptions {
  all?: boolean;
}

/** The archive directories, one per terminal status. Each is tracked, inert and never compiled. */
const archiveStates = ['completed', 'rejected', 'superseded'] as const;

type ArchiveState = (typeof archiveStates)[number];

interface ListedChange {
  id: string;
  title: string;
  status: string;
  state: 'active' | ArchiveState;
  operations: { add: number; modify: number; remove: number };
  path: string;
}

async function listArchived(repo: ProductRepository, state: ArchiveState): Promise<ListedChange[]> {
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
    for (const state of archiveStates) listed.push(...(await listArchived(repo, state)));
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

/**
 * A citation's point of use: file and line for a payload-carried citation, ledger file and entry
 * for a sidecar citation, whose `line` is the 1-based entry ordinal rather than a file line.
 */
function citationLocation(citation: AffectedCitation['citation']): string {
  return citation.form === 'sidecar-ledger'
    ? `${citation.source} entry ${citation.line}`
    : `${citation.source}:${citation.line}`;
}

function reportPlan(
  io: CliIo,
  plan: ApplyPlan,
  affected: AffectedCitation[],
  dryRun: boolean,
): void {
  io.out(`${dryRun ? 'Would apply' : 'Applied'} ${plan.changeId}:`);
  for (const action of plan.actions) io.out(`  ${action.description}`);
  const { added, modified, removed } = plan.diff;
  io.out(
    `Product diff: ${added.length} added, ${modified.length} modified, ${removed.length} removed`,
  );
  // Every entry names its impact kind, and a removal carries no digest because it leaves no
  // content to digest. The JSON form carries the same three facts per entry.
  for (const entry of [...added, ...modified, ...removed]) {
    io.out(`  ${entry.id}\t${entry.kind}\t${entry.digest ?? '-'}`);
  }
  // The count is stated even at zero: absence of impact is a claim the reviewer relies on,
  // silence is not (RFC 0048).
  io.out(`Affected citations: ${affected.length}`);
  for (const { citation, prospectiveStatus } of affected) {
    const anchor = citation.anchor ? `#${citation.anchor}` : '';
    io.out(`  ${citationLocation(citation)}\t${citation.id}${anchor}\t${prospectiveStatus}`);
  }
}

/**
 * `prodshape change apply <id>`: materialize an approved Product Change into the working tree.
 *
 * Apply is not acceptance. It writes the change's operations into the proposal's model files,
 * computes the product diff and the affected citation set, revalidates the result and archives
 * the change. It creates no commit and merges nothing: only a human merging the pull request
 * accepts the change.
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

  // Both apply preconditions are diagnostics: the status gate is PRODUCT028 and baseline drift is
  // PRODUCT027. Nothing has been written at this point, so a refusal leaves the working tree
  // untouched. The invocation is well formed, so this is exit 1 and not 2.
  const blocking = plan.diagnostics.filter((d) => d.severity === 'error');
  if (blocking.length > 0) {
    for (const diagnostic of blocking) io.err(formatDiagnosticLine(diagnostic));
    if (options.format === 'json') {
      io.out(
        stableJson({
          applied: false,
          change: plan.changeId,
          diagnostics: blocking,
        }).trimEnd(),
      );
    }
    return exitCodes.validationErrors;
  }

  // The affected citation set (RFC 0048): every citation whose target artifact appears in the
  // product diff, with the status it will hold against the applied result. Citations resolve
  // within one repository, so the index is scanned from the repository root. Like the product
  // diff it is recomputed output — never persisted into the archived change — and never a veto:
  // breaking consumers is frequently a change's purpose, so apply proceeds however many
  // citations go stale. Scanned before execution moves the change directory.
  const changedIds = [...plan.diff.added, ...plan.diff.modified, ...plan.diff.removed].map(
    (entry) => entry.id,
  );
  const affected = computeAffectedCitations(
    await scanCitations(repo.root, repo.root),
    changedIds,
    appliedArtifacts(baseline.artifacts, change),
  );

  // A dry run still preflights: it reads every write source, confirms every delete target and
  // verifies the archive destination is absent, so it fails the same way a real apply would
  // instead of reporting "Would apply" for a plan that cannot execute.
  if (options.dryRun) {
    await preflightApply(repo.root, plan);
  } else {
    await executeApply(repo.root, plan);
  }

  if (options.format === 'json') {
    io.out(
      stableJson({
        applied: !options.dryRun,
        change: plan.changeId,
        actions: plan.actions,
        diff: plan.diff,
        affectedCitations: affected.map(({ citation, prospectiveStatus }) => ({
          id: citation.id,
          anchor: citation.anchor,
          source: citation.source,
          line: citation.line,
          form: citation.form,
          prospectiveStatus,
        })),
      }).trimEnd(),
    );
  } else {
    reportPlan(io, plan, affected, options.dryRun ?? false);
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
 *
 * Each terminal status has its own directory, so the destination follows the status: `rejected/`
 * for a refusal, `superseded/` for a change that was overtaken. `superseded` is reachable from
 * `approved`, so filing both in one place would record a refusal that never happened.
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

  const state: ArchiveState = change.status === 'superseded' ? 'superseded' : 'rejected';
  const dirName = basename(change.dir);
  const destDir = join(repo.changesDir, state, dirName);
  try {
    await stat(destDir);
    io.err(
      `error: an archived change already exists at ${repo.config.product.changes}/${state}/${dirName}/`,
    );
    return exitCodes.invalidInvocation;
  } catch {
    // Destination is absent, which is what we need.
  }

  await mkdir(join(repo.changesDir, state), { recursive: true });
  await rename(change.dir, destDir);

  const path = `${repo.config.product.changes}/${state}/${dirName}/change.md`;
  if (options.format === 'json') {
    io.out(stableJson({ archived: { id: change.id ?? dirName, path } }).trimEnd());
  } else {
    io.out(`Archived ${change.id ?? dirName} to ${path}`);
  }
  return exitCodes.success;
}
