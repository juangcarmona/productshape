import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import {
  addEvidence,
  addLead,
  addQuestion,
  answerQuestion,
  checkRecoverySession,
  deferQuestion,
  findingClassifications,
  loadRecoverySession,
  markEvidence,
  markEvidenceBulk,
  markFamilyProbe,
  nextBatch,
  parseRecoveryBrief,
  resolveLead,
  resolveSessionId,
  RecoveryStateError,
  RecoveryUsageError,
  scanCandidates,
  snapshotEvidence,
  startRecoverySession,
  stableJson,
  unmarkEvidence,
  writeRecoveryReport,
  computeCoverage,
  type EvidenceItem,
  type FindingClassification,
  type LoadedRecoverySession,
  type ProductRepository,
  type RecoveryBrief,
} from '@prodshape/core';
import { frameworkVersion } from '@prodshape/distribution';
import { CliError, exitCodes, resolveRepository, type CliIo } from '../context.js';
import { checkpoint, ensureRecoveryBranch, gitDiscipline } from './recover-git.js';

/**
 * Deterministic session bookkeeping for brownfield recovery. Every subcommand here manages
 * state under `.product/generated/recovery/<session-id>/`; none of them reads meaning out of
 * evidence. Semantic extraction is the recover-product skill's job, and keeping it out of the
 * CLI is a design rule, not a gap.
 */

export interface RecoverFormatOptions {
  format?: 'text' | 'json';
  session?: string;
}

function rethrow(error: unknown): never {
  if (error instanceof RecoveryUsageError || error instanceof RecoveryStateError) {
    throw new CliError(error.message, exitCodes.invalidInvocation);
  }
  throw error;
}

async function openSession(
  io: CliIo,
  sessionOption: string | undefined,
): Promise<{ repo: ProductRepository; session: LoadedRecoverySession }> {
  const repo = await resolveRepository(io);
  try {
    const sessionId = await resolveSessionId(repo, sessionOption);
    return { repo, session: await loadRecoverySession(repo, sessionId) };
  } catch (error) {
    rethrow(error);
  }
}

function describeEvidence(item: EvidenceItem): string {
  const where = item.path ?? item.url ?? item.title ?? 'inline';
  return `${item.id}\t${item.status}\t${item.kind}\t${where}`;
}

export interface RecoverStartOptions extends RecoverFormatOptions {
  brief?: string;
}

export async function runRecoverStart(io: CliIo, options: RecoverStartOptions): Promise<number> {
  const repo = await resolveRepository(io);

  let brief: RecoveryBrief | undefined;
  if (options.brief !== undefined) {
    const briefPath = isAbsolute(options.brief) ? options.brief : join(io.cwd, options.brief);
    let content: string;
    try {
      content = await readFile(briefPath, 'utf8');
    } catch {
      throw new CliError(
        `Cannot read recovery brief '${options.brief}'`,
        exitCodes.invalidInvocation,
      );
    }
    const parsed = parseRecoveryBrief(content, options.brief);
    if (parsed.errors.length > 0) {
      for (const error of parsed.errors) io.err(`error: ${error}`);
      throw new CliError('Invalid recovery brief', exitCodes.invalidInvocation);
    }
    brief = parsed.brief;
  }

  // Branch discipline runs before any session file exists, so the session's whole life
  // (state, candidates, checkpoints) happens on the declared branch.
  if (brief !== undefined && gitDiscipline(brief) !== undefined) {
    await ensureRecoveryBranch(io, repo.root, gitDiscipline(brief)!.branch);
  }

  try {
    const session = await startRecoverySession(repo, {
      ...(options.session !== undefined ? { sessionId: options.session } : {}),
      ...(brief !== undefined ? { brief } : {}),
      cliVersion: await frameworkVersion(),
    });
    await checkpoint(
      io,
      repo,
      session,
      `start ${session.state.sessionId} (${session.inventory.items.length} sources)`,
    );
    if (options.format === 'json') {
      io.out(
        stableJson({
          sessionId: session.state.sessionId,
          dir: session.relDir,
          changeDir: session.state.changeDir,
          evidence: session.inventory.items.length,
        }).trimEnd(),
      );
    } else {
      io.out(`Started recovery session '${session.state.sessionId}' at ${session.relDir}/`);
      io.out(`Inventoried ${session.inventory.items.length} evidence source(s).`);
      io.out(`Candidates belong under ${session.state.changeDir}/proposed/ and nowhere else.`);
      io.out(`Next: prodshape recover next`);
    }
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export async function runRecoverStatus(io: CliIo, options: RecoverFormatOptions): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  const coverage = await computeCoverage(repo, session, await scanCandidates(repo, session.state));
  if (options.format === 'json') {
    io.out(
      stableJson({
        sessionId: session.state.sessionId,
        changeDir: session.state.changeDir,
        nextAction: session.state.nextAction,
        coverage,
      }).trimEnd(),
    );
    return exitCodes.success;
  }
  io.out(`Recovery session '${session.state.sessionId}' (${session.relDir}/)`);
  io.out(
    `Sources: ${coverage.sources.processed}/${coverage.sources.total} processed, ${coverage.sources.pending} pending, ${coverage.sources.stale} stale, ${coverage.sources.missing} missing, ${coverage.sources.excluded} excluded`,
  );
  io.out(`Candidates: ${coverage.candidates.total} under ${session.state.changeDir}/proposed/`);
  io.out(
    `Leads: ${coverage.leads.open} open, ${coverage.leads.resolved} resolved. Questions: ${coverage.questions.open} open, ${coverage.questions.answered} answered, ${coverage.questions.deferred} deferred.`,
  );
  if (coverage.validation !== undefined) {
    io.out(
      `Validation: ${coverage.validation.errors} error(s), ${coverage.validation.warnings} warning(s)${coverage.validation.fresh ? '' : ' (stale, re-run: prodshape recover check)'}`,
    );
  } else {
    io.out('Validation: not run yet (prodshape recover check)');
  }
  io.out(`Complete: ${coverage.completion.complete ? 'yes' : 'no'}`);
  for (const [criterion, met] of Object.entries(coverage.completion.criteria)) {
    io.out(`  ${met ? 'ok  ' : 'todo'} ${criterion}`);
  }
  if (session.state.nextAction !== undefined) io.out(`Next: ${session.state.nextAction}`);
  return exitCodes.success;
}

export interface RecoverNextOptions extends RecoverFormatOptions {
  limit?: string;
}

export async function runRecoverNext(io: CliIo, options: RecoverNextOptions): Promise<number> {
  const { session } = await openSession(io, options.session);
  let limit: number | undefined;
  if (options.limit !== undefined) {
    limit = Number(options.limit);
    if (!Number.isInteger(limit) || limit < 1) {
      throw new CliError(`--limit must be a positive integer`, exitCodes.invalidInvocation);
    }
  }
  try {
    const batch = nextBatch(session, limit);
    if (options.format === 'json') {
      io.out(stableJson({ sessionId: session.state.sessionId, batch }).trimEnd());
      return exitCodes.success;
    }
    if (batch.length === 0) {
      io.out(
        'No pending or stale evidence; run: prodshape recover check, then: prodshape recover report',
      );
      return exitCodes.success;
    }
    for (const item of batch) io.out(describeEvidence(item));
    io.out(
      `${batch.length} source(s) in this batch. Mark each with: prodshape recover mark --source <id> --as <classification> [...] --complete`,
    );
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export interface RecoverMarkOptions extends RecoverFormatOptions {
  source?: string;
  sources?: string;
  glob?: string[];
  as?: string;
  artifacts?: string;
  question?: string;
  reason?: string;
  note?: string;
  complete?: boolean;
  exclude?: boolean;
  acceptChanged?: boolean;
}

/**
 * Split a separated id list. Commas are the documented separator; whitespace is accepted too
 * because the PowerShell path to a npm-installed CLI turns an unquoted comma list into one
 * space-joined argument (issue #196), and refusing to understand it helps nobody.
 */
function splitIdList(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function runRecoverMark(io: CliIo, options: RecoverMarkOptions): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  let classification: FindingClassification | undefined;
  if (options.as !== undefined) {
    if (!(findingClassifications as readonly string[]).includes(options.as)) {
      throw new CliError(
        `Unknown classification '${options.as}' (expected one of: ${findingClassifications.join(', ')})`,
        exitCodes.invalidInvocation,
      );
    }
    classification = options.as as FindingClassification;
  }

  const bulk =
    options.sources !== undefined || (options.glob !== undefined && options.glob.length > 0);
  if (options.source === undefined && !bulk) {
    throw new CliError(
      'Pass --source <id-or-path>, or a bulk selection with --sources <ids> and/or --glob <glob>',
      exitCodes.invalidInvocation,
    );
  }
  if (options.source !== undefined && bulk) {
    throw new CliError(
      'Pass either --source or a bulk selection (--sources / --glob), not both',
      exitCodes.invalidInvocation,
    );
  }

  const findingOptions = {
    ...(classification !== undefined ? { classification } : {}),
    ...(options.artifacts !== undefined ? { artifacts: splitIdList(options.artifacts) } : {}),
    ...(options.question !== undefined ? { question: options.question } : {}),
    ...(options.reason !== undefined ? { reason: options.reason } : {}),
    ...(options.note !== undefined ? { note: options.note } : {}),
    ...(options.complete !== undefined ? { complete: options.complete } : {}),
  };

  if (bulk) {
    if (options.exclude || options.acceptChanged) {
      throw new CliError(
        'Exclusion and --accept-changed are per-source decisions; use --source for them',
        exitCodes.invalidInvocation,
      );
    }
    if (classification === undefined && !options.complete) {
      throw new CliError(
        `Nothing to record: pass --as <classification> or --complete`,
        exitCodes.invalidInvocation,
      );
    }
    try {
      const items = await markEvidenceBulk(repo, session, {
        ...findingOptions,
        ...(options.sources !== undefined ? { sources: splitIdList(options.sources) } : {}),
        ...(options.glob !== undefined && options.glob.length > 0 ? { globs: options.glob } : {}),
      });
      await checkpoint(io, repo, session, `mark ${items.length} sources in bulk`);
      if (options.format === 'json') {
        io.out(stableJson({ marked: items }).trimEnd());
      } else {
        io.out(
          `Marked ${items.length} source(s)${classification !== undefined ? ` as ${classification}` : ''}${options.complete ? ' (processed)' : ''}.`,
        );
      }
      return exitCodes.success;
    } catch (error) {
      rethrow(error);
    }
  }

  if (classification === undefined && !options.complete && !options.exclude) {
    throw new CliError(
      `Nothing to record: pass --as <classification>, --complete, or --exclude --reason <why>`,
      exitCodes.invalidInvocation,
    );
  }
  try {
    const item = await markEvidence(repo, session, {
      source: options.source!,
      ...findingOptions,
      ...(options.exclude !== undefined ? { exclude: options.exclude } : {}),
      ...(options.acceptChanged !== undefined ? { acceptChanged: options.acceptChanged } : {}),
    });
    await checkpoint(io, repo, session, `mark ${item.id} (${item.status})`);
    if (options.format === 'json') {
      io.out(stableJson({ marked: item }).trimEnd());
    } else {
      io.out(`${item.id} is now ${item.status} with ${item.findings.length} finding(s).`);
    }
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export interface RecoverUnmarkOptions extends RecoverFormatOptions {
  source: string;
  last?: boolean;
  index?: string;
  all?: boolean;
}

export async function runRecoverUnmark(io: CliIo, options: RecoverUnmarkOptions): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  let index: number | undefined;
  if (options.index !== undefined) {
    index = Number(options.index);
    if (!Number.isInteger(index) || index < 1) {
      throw new CliError('--index must be a positive integer', exitCodes.invalidInvocation);
    }
  }
  try {
    const item = await unmarkEvidence(repo, session, {
      source: options.source,
      ...(options.last !== undefined ? { last: options.last } : {}),
      ...(index !== undefined ? { index } : {}),
      ...(options.all !== undefined ? { all: options.all } : {}),
    });
    await checkpoint(io, repo, session, `unmark ${item.id}`);
    if (options.format === 'json') {
      io.out(stableJson({ unmarked: item }).trimEnd());
    } else {
      io.out(
        `${item.id} is now ${item.status} with ${item.findings.length} finding(s); re-complete it with: prodshape recover mark --source ${item.id} --complete`,
      );
    }
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export interface RecoverEvidenceAddOptions extends RecoverFormatOptions {
  url?: string;
  file?: string;
  text?: string;
  title?: string;
  authorized?: boolean;
}

export async function runRecoverEvidenceAdd(
  io: CliIo,
  options: RecoverEvidenceAddOptions,
): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  if (options.title === undefined || options.title.length === 0) {
    throw new CliError('--title is required for added evidence', exitCodes.invalidInvocation);
  }
  try {
    const item = await addEvidence(repo, session, {
      ...(options.url !== undefined ? { url: options.url } : {}),
      ...(options.file !== undefined ? { file: options.file } : {}),
      ...(options.text !== undefined ? { text: options.text } : {}),
      title: options.title,
      ...(options.authorized !== undefined ? { authorized: options.authorized } : {}),
    });
    await checkpoint(io, repo, session, `evidence add ${item.id}`);
    if (options.format === 'json') {
      io.out(stableJson({ added: item }).trimEnd());
    } else {
      io.out(`Added ${item.id} (${item.kind}) to the inventory as pending.`);
      if (item.kind === 'external-url') {
        io.out(
          `Freeze its content once fetched: prodshape recover evidence snapshot ${item.id} --file <downloaded-file>`,
        );
      }
    }
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export interface RecoverEvidenceSnapshotOptions extends RecoverFormatOptions {
  file?: string;
}

export async function runRecoverEvidenceSnapshot(
  io: CliIo,
  evidenceId: string,
  options: RecoverEvidenceSnapshotOptions,
): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  if (options.file === undefined) {
    throw new CliError(
      '--file <path> is required to snapshot evidence',
      exitCodes.invalidInvocation,
    );
  }
  try {
    const item = await snapshotEvidence(repo, session, evidenceId, options.file);
    await checkpoint(io, repo, session, `evidence snapshot ${item.id}`);
    if (options.format === 'json') {
      io.out(stableJson({ snapshotted: item }).trimEnd());
    } else {
      io.out(
        `Snapshotted ${item.id} into ${session.relDir}/${item.snapshot ?? ''} (${item.digest ?? 'no digest'}).`,
      );
    }
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export async function runRecoverEvidenceList(
  io: CliIo,
  options: RecoverFormatOptions,
): Promise<number> {
  const { session } = await openSession(io, options.session);
  if (options.format === 'json') {
    io.out(stableJson({ items: session.inventory.items }).trimEnd());
    return exitCodes.success;
  }
  for (const item of session.inventory.items) io.out(describeEvidence(item));
  io.out(`${session.inventory.items.length} evidence source(s).`);
  return exitCodes.success;
}

export interface RecoverLeadAddOptions extends RecoverFormatOptions {
  description?: string;
  source?: string;
  kind?: string;
}

export async function runRecoverLeadAdd(
  io: CliIo,
  options: RecoverLeadAddOptions,
): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  if (options.description === undefined) {
    throw new CliError('--description is required', exitCodes.invalidInvocation);
  }
  const kind = options.kind ?? 'repo';
  if (kind !== 'repo' && kind !== 'external' && kind !== 'user') {
    throw new CliError(`--kind must be repo, external or user`, exitCodes.invalidInvocation);
  }
  try {
    const lead = await addLead(repo, session, {
      description: options.description,
      ...(options.source !== undefined ? { source: options.source } : {}),
      kind,
    });
    await checkpoint(io, repo, session, `lead add ${lead.id}`);
    if (options.format === 'json') io.out(stableJson({ lead }).trimEnd());
    else io.out(`Recorded ${lead.id}: ${lead.description}`);
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export interface RecoverLeadResolveOptions extends RecoverFormatOptions {
  resolution?: string;
}

export async function runRecoverLeadResolve(
  io: CliIo,
  leadId: string,
  options: RecoverLeadResolveOptions,
): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  try {
    const lead = await resolveLead(repo, session, leadId, options.resolution ?? '');
    await checkpoint(io, repo, session, `lead resolve ${lead.id}`);
    if (options.format === 'json') io.out(stableJson({ lead }).trimEnd());
    else io.out(`Resolved ${lead.id}.`);
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export async function runRecoverLeadList(
  io: CliIo,
  options: RecoverFormatOptions,
): Promise<number> {
  const { session } = await openSession(io, options.session);
  if (options.format === 'json') {
    io.out(stableJson({ leads: session.leads.leads }).trimEnd());
    return exitCodes.success;
  }
  for (const lead of session.leads.leads) {
    io.out(`${lead.id}\t${lead.status}\t${lead.kind}\t${lead.description}`);
  }
  io.out(`${session.leads.leads.length} lead(s).`);
  return exitCodes.success;
}

export interface RecoverQuestionAddOptions extends RecoverFormatOptions {
  text?: string;
  context?: string;
  option?: string[];
  recommendation?: string;
}

export async function runRecoverQuestionAdd(
  io: CliIo,
  options: RecoverQuestionAddOptions,
): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  if (options.text === undefined) {
    throw new CliError('--text is required', exitCodes.invalidInvocation);
  }
  try {
    const question = await addQuestion(repo, session, {
      text: options.text,
      ...(options.context !== undefined ? { context: options.context } : {}),
      ...(options.option !== undefined ? { options: options.option } : {}),
      ...(options.recommendation !== undefined ? { recommendation: options.recommendation } : {}),
    });
    await checkpoint(io, repo, session, `question add ${question.id}`);
    if (options.format === 'json') io.out(stableJson({ question }).trimEnd());
    else io.out(`Recorded ${question.id}: ${question.text}`);
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export interface RecoverQuestionAnswerOptions extends RecoverFormatOptions {
  answer?: string;
}

export async function runRecoverQuestionAnswer(
  io: CliIo,
  questionId: string,
  options: RecoverQuestionAnswerOptions,
): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  try {
    const question = await answerQuestion(repo, session, questionId, options.answer ?? '');
    await checkpoint(io, repo, session, `question answer ${question.id}`);
    if (options.format === 'json') io.out(stableJson({ question }).trimEnd());
    else io.out(`Answered ${question.id}.`);
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export interface RecoverQuestionDeferOptions extends RecoverFormatOptions {
  reason?: string;
}

export async function runRecoverQuestionDefer(
  io: CliIo,
  questionId: string,
  options: RecoverQuestionDeferOptions,
): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  try {
    const question = await deferQuestion(repo, session, questionId, options.reason ?? '');
    await checkpoint(io, repo, session, `question defer ${question.id}`);
    if (options.format === 'json') io.out(stableJson({ question }).trimEnd());
    else io.out(`Deferred ${question.id}.`);
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export async function runRecoverQuestionList(
  io: CliIo,
  options: RecoverFormatOptions,
): Promise<number> {
  const { session } = await openSession(io, options.session);
  if (options.format === 'json') {
    io.out(stableJson({ questions: session.questions.questions }).trimEnd());
    return exitCodes.success;
  }
  for (const question of session.questions.questions) {
    io.out(`${question.id}\t${question.status}\t${question.text}`);
  }
  io.out(`${session.questions.questions.length} question(s).`);
  return exitCodes.success;
}

export interface RecoverFamilyOptions extends RecoverFormatOptions {
  noneFound?: boolean;
  note?: string;
}

export async function runRecoverFamily(
  io: CliIo,
  family: string,
  options: RecoverFamilyOptions,
): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  if (!options.noneFound) {
    throw new CliError(
      'Families with candidates are probed by construction; this command records --none-found with a --note',
      exitCodes.invalidInvocation,
    );
  }
  try {
    await markFamilyProbe(repo, session, family, options.note ?? '');
    await checkpoint(io, repo, session, `family ${family} probed, none found`);
    io.out(`Recorded ${family} as probed with no candidates found.`);
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export async function runRecoverCheck(io: CliIo, options: RecoverFormatOptions): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  try {
    const result = await checkRecoverySession(repo, session);
    const errors = result.issues.filter((i) => i.severity === 'error');
    await checkpoint(
      io,
      repo,
      session,
      `check: ${errors.length} error(s), ${result.issues.length - errors.length} warning(s)`,
    );
    if (options.format === 'json') {
      io.out(
        stableJson({
          sessionId: session.state.sessionId,
          issues: result.issues,
          coverage: result.coverage,
        }).trimEnd(),
      );
    } else {
      for (const issue of result.issues) {
        io.out(
          `${issue.severity} ${issue.code}${issue.source !== undefined ? ` [${issue.source}]` : ''}: ${issue.message}`,
        );
      }
      io.out(
        `${errors.length} error(s), ${result.issues.length - errors.length} warning(s). Complete: ${result.coverage.completion.complete ? 'yes' : 'no'}.`,
      );
    }
    return errors.length > 0 ? exitCodes.validationErrors : exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}

export async function runRecoverReport(io: CliIo, options: RecoverFormatOptions): Promise<number> {
  const { repo, session } = await openSession(io, options.session);
  try {
    const { path, coverage } = await writeRecoveryReport(repo, session);
    await checkpoint(io, repo, session, `report written`);
    if (options.format === 'json') {
      io.out(stableJson({ report: path, complete: coverage.completion.complete }).trimEnd());
    } else {
      io.out(`Wrote ${path}`);
      io.out(
        `Complete: ${coverage.completion.complete ? 'yes' : 'no'}. The report is generated material; the reviewable output is the change itself.`,
      );
    }
    return exitCodes.success;
  } catch (error) {
    rethrow(error);
  }
}
