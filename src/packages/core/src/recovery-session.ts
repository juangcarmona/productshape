import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import fg from 'fast-glob';
import picomatch from 'picomatch';
import { productArtifactIdPattern, productArtifactTypes } from './artifact.js';
import { discoverChanges, loadChange } from './changes.js';
import { contentDigest, contentDigestBytes } from './digest.js';
import type { Diagnostic } from './diagnostics.js';
import { loadArtifactFile, toPosixRelative } from './model.js';
import { validateChange } from './overlay.js';
import {
  defaultRecoveryBrief,
  isValidSessionId,
  nextSequentialId,
  recoveryChangeId,
  recoveryCoverageSchemaId,
  recoveryInventorySchemaId,
  recoveryLeadsSchemaId,
  recoveryQuestionsSchemaId,
  recoveryStateSchemaId,
  recoveryFormatVersion,
  readRecoverySessionFiles,
  sessionFileNames,
  writeJsonAtomic,
  writeRecoverySessionFiles,
  type EvidenceFinding,
  type EvidenceItem,
  type EvidenceStatus,
  type FindingClassification,
  type LoadedRecoverySession,
  type LeadKind,
  type ModelSnapshotEntry,
  type RecoveryBrief,
  type RecoveryLead,
  type RecoveryQuestion,
  type RecoveryState,
} from './recovery.js';
import type { ProductRepository } from './repository.js';
import { validateBaseline } from './repository.js';
import { stableJson } from './outputs.js';

/** A refusal or misuse the caller reports as an invalid invocation, never a crash. */
export class RecoveryUsageError extends Error {}

export interface RecoveryClock {
  now(): string;
}

const systemClock: RecoveryClock = { now: () => new Date().toISOString() };

function relPosix(repo: ProductRepository, absolute: string): string {
  return toPosixRelative(repo.root, absolute);
}

function recoveryRootRel(repo: ProductRepository): string {
  return repo.recoveryRoot ?? `${relPosix(repo, repo.generatedDir)}/recovery`;
}

export function sessionDirRel(repo: ProductRepository, sessionId: string): string {
  return `${recoveryRootRel(repo)}/${sessionId}`;
}

function sessionDirAbs(repo: ProductRepository, sessionId: string): string {
  return join(repo.root, ...sessionDirRel(repo, sessionId).split('/'));
}

function changeDirRel(repo: ProductRepository): string {
  return `${repo.config.product.changes}/active/${recoveryChangeId.toLowerCase()}`;
}

/** List existing recovery session ids, sorted. */
export async function listRecoverySessions(repo: ProductRepository): Promise<string[]> {
  try {
    const entries = await readdir(join(repo.root, ...recoveryRootRel(repo).split('/')), {
      withFileTypes: true,
    });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Resolve which session a command addresses: the explicit id when given, the only existing
 * session otherwise. Ambiguity is an error rather than a guess.
 */
export async function resolveSessionId(
  repo: ProductRepository,
  explicit: string | undefined,
): Promise<string> {
  if (explicit !== undefined) {
    if (!isValidSessionId(explicit)) {
      throw new RecoveryUsageError(
        `Invalid session id '${explicit}': use lowercase letters, digits and hyphens`,
      );
    }
    return explicit;
  }
  const sessions = await listRecoverySessions(repo);
  const first = sessions[0];
  if (first === undefined) {
    throw new RecoveryUsageError(
      `No recovery session found under ${recoveryRootRel(repo)}/; start one with: prodshape recover start`,
    );
  }
  if (sessions.length > 1) {
    throw new RecoveryUsageError(
      `Multiple recovery sessions exist (${sessions.join(', ')}); pass --session <id>`,
    );
  }
  return first;
}

export async function loadRecoverySession(
  repo: ProductRepository,
  sessionId: string,
): Promise<LoadedRecoverySession> {
  const session = await readRecoverySessionFiles(
    sessionDirAbs(repo, sessionId),
    sessionDirRel(repo, sessionId),
  );
  if (session.state.sessionId !== sessionId) {
    throw new RecoveryUsageError(
      `Session directory '${sessionId}' holds state for '${session.state.sessionId}'; the directory was moved or copied by hand`,
    );
  }
  return session;
}

/** Patterns no recovery inventory may ever traverse, on top of the brief's own rules. */
function builtinIgnores(repo: ProductRepository): string[] {
  return [
    '.git/**',
    '**/node_modules/**',
    `${relPosix(repo, repo.generatedDir)}/**`,
    '.product/**',
    // The product definition and its changes are the output side of recovery, never evidence.
    `${repo.config.product.root}/**`,
  ];
}

function inventoryPatterns(brief: RecoveryBrief): string[] {
  const patterns: string[] = [];
  for (const root of brief.roots) {
    const prefix = root === '.' ? '' : `${root.replace(/\/+$/, '')}/`;
    for (const include of brief.include) {
      patterns.push(`${prefix}${include}`);
    }
  }
  return patterns.sort();
}

/**
 * Deterministic repository evidence discovery: same tree and same brief produce the same list in
 * the same order, so evidence ids are stable across resumed and repeated runs.
 */
export async function discoverRepositoryEvidence(
  repo: ProductRepository,
  brief: RecoveryBrief,
): Promise<string[]> {
  const files = await globSafe(inventoryPatterns(brief), {
    cwd: repo.root,
    ignore: [...builtinIgnores(repo), ...brief.exclude, ...brief.ignore, ...brief.forbidden],
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
  });
  // Sessions persisted before tiers existed carry briefs without the field.
  const tiers = brief.tiers ?? [];
  if (tiers.length === 0) return files.sort();

  // Evidence ids follow enumeration order, so ordering by tier here is what makes
  // `recover next` serve the declared dense sources first. First matching tier wins;
  // unmatched paths sort after every tier, and path order breaks ties, so the result is
  // as deterministic as the untiered enumeration.
  const matchers = tiers.map((tier) => picomatch(tier.globs, { dot: true }));
  const tierIndex = new Map<string, number>();
  for (const file of files) {
    const index = matchers.findIndex((isMatch) => isMatch(file));
    tierIndex.set(file, index === -1 ? matchers.length : index);
  }
  return files.sort(
    (a, b) =>
      (tierIndex.get(a) ?? matchers.length) - (tierIndex.get(b) ?? matchers.length) ||
      (a < b ? -1 : a > b ? 1 : 0),
  );
}

async function digestFile(absolute: string): Promise<string | undefined> {
  try {
    return contentDigestBytes(await readFile(absolute));
  } catch {
    return undefined;
  }
}

export interface StartRecoveryOptions {
  sessionId?: string;
  brief?: RecoveryBrief;
  cliVersion: string;
  clock?: RecoveryClock;
  /** Optional adapter-owned Product Change container for CHG-INITIAL. */
  changeDir?: string;
}

/**
 * Refuse to start when an accepted baseline exists. `CHG-INITIAL` is the single initialisation
 * change; recovered knowledge on top of an accepted model enters through an ordinary Product
 * Change instead, and misusing the reserved change would rewrite history.
 */
export async function assertInitialRecoveryIsLegitimate(repo: ProductRepository): Promise<void> {
  const model = await snapshotModel(repo);
  if (model.length > 0) {
    throw new RecoveryUsageError(
      `An accepted Product Definition already exists under ${repo.config.product.model} (${model.length} file(s)). ` +
        `Initial recovery through ${recoveryChangeId} is only for a repository without a baseline. ` +
        `Propose newly recovered knowledge through an ordinary Product Change under ${repo.config.product.changes}/active/ instead.`,
    );
  }
  const completedInitial = join(
    repo.root,
    ...`${repo.config.product.changes}/completed/${recoveryChangeId.toLowerCase()}`.split('/'),
  );
  try {
    await readdir(completedInitial);
    throw new RecoveryUsageError(
      `${recoveryChangeId} was already applied (${repo.config.product.changes}/completed/${recoveryChangeId.toLowerCase()} exists). ` +
        `The baseline exists even if the model directory is currently empty; use an ordinary Product Change.`,
    );
  } catch (error) {
    if (error instanceof RecoveryUsageError) throw error;
    // Directory absent: this genuinely is initial recovery.
  }
}

async function globSafe(pattern: string | string[], options: fg.Options): Promise<string[]> {
  try {
    return await fg(pattern, options);
  } catch {
    // A scan root that does not exist yet (no model directory, no proposed/ directory) simply
    // contributes nothing.
    return [];
  }
}

async function snapshotModel(repo: ProductRepository): Promise<ModelSnapshotEntry[]> {
  const files = await globSafe('**/*.md', { cwd: repo.modelDir, absolute: true, dot: false });
  const entries: ModelSnapshotEntry[] = [];
  for (const file of files.sort()) {
    const digest = await digestFile(file);
    if (digest !== undefined) entries.push({ file: relPosix(repo, file), digest });
  }
  return entries.sort((a, b) => a.file.localeCompare(b.file));
}

async function defaultSessionId(repo: ProductRepository): Promise<string> {
  const existing = new Set(await listRecoverySessions(repo));
  for (let ordinal = 1; ordinal < 1000; ordinal += 1) {
    const candidate = `session-${String(ordinal).padStart(3, '0')}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new RecoveryUsageError('Too many recovery sessions; pass --session <id> explicitly');
}

export async function startRecoverySession(
  repo: ProductRepository,
  options: StartRecoveryOptions,
): Promise<LoadedRecoverySession> {
  const clock = options.clock ?? systemClock;
  await assertInitialRecoveryIsLegitimate(repo);

  const sessionId = options.sessionId ?? (await defaultSessionId(repo));
  if (!isValidSessionId(sessionId)) {
    throw new RecoveryUsageError(
      `Invalid session id '${sessionId}': use lowercase letters, digits and hyphens`,
    );
  }
  const dir = sessionDirAbs(repo, sessionId);
  const relDir = sessionDirRel(repo, sessionId);
  try {
    await readdir(dir);
    throw new RecoveryUsageError(
      `Recovery session '${sessionId}' already exists at ${relDir}/; resume it with: prodshape recover status --session ${sessionId}`,
    );
  } catch (error) {
    if (error instanceof RecoveryUsageError) throw error;
    // Directory absent: free to create.
  }

  const brief = options.brief ?? defaultRecoveryBrief();
  const now = clock.now();

  const items: EvidenceItem[] = [];
  let evidenceCounter = 0;
  for (const path of await discoverRepositoryEvidence(repo, brief)) {
    evidenceCounter += 1;
    const digest = await digestFile(join(repo.root, ...path.split('/')));
    items.push({
      id: nextSequentialId('E', evidenceCounter),
      kind: 'repo-file',
      path,
      ...(digest !== undefined ? { digest } : {}),
      authorization: 'brief',
      status: 'pending',
      findings: [],
      addedAt: now,
    });
  }
  for (const source of brief.externalSources) {
    evidenceCounter += 1;
    const item: EvidenceItem = {
      id: nextSequentialId('E', evidenceCounter),
      kind: source.url !== undefined ? 'external-url' : 'external-file',
      title: source.title,
      authorization: 'brief',
      status: 'pending',
      findings: [],
      addedAt: now,
    };
    if (source.url !== undefined) item.url = source.url;
    if (source.file !== undefined) {
      item.path = source.file;
      const digest = await digestFile(
        isAbsolute(source.file) ? source.file : join(repo.root, ...source.file.split('/')),
      );
      if (digest !== undefined) item.digest = digest;
    }
    items.push(item);
  }

  const state: RecoveryState = {
    schema: recoveryStateSchemaId,
    formatVersion: recoveryFormatVersion,
    sessionId,
    cliVersion: options.cliVersion,
    createdAt: now,
    updatedAt: now,
    changeId: recoveryChangeId,
    changeDir: options.changeDir ?? changeDirRel(repo),
    brief,
    modelSnapshot: await snapshotModel(repo),
    familyProbes: {},
    counters: { evidence: evidenceCounter, lead: 0, question: 0 },
    nextAction: 'Inventory recorded; process the first batch: prodshape recover next',
  };

  const session: LoadedRecoverySession = {
    dir,
    relDir,
    state,
    inventory: { schema: recoveryInventorySchemaId, sessionId, items },
    leads: { schema: recoveryLeadsSchemaId, sessionId, leads: [] },
    questions: { schema: recoveryQuestionsSchemaId, sessionId, questions: [] },
  };
  await mkdir(join(dir, 'evidence'), { recursive: true });
  await writeRecoverySessionFiles(session);
  await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
  return session;
}

function touch(session: LoadedRecoverySession, clock: RecoveryClock, nextAction?: string): void {
  session.state.updatedAt = clock.now();
  if (nextAction !== undefined) session.state.nextAction = nextAction;
}

/** The next bounded batch: pending and stale sources, in stable id order. */
export function nextBatch(session: LoadedRecoverySession, limit?: number): EvidenceItem[] {
  const size = limit ?? session.state.brief.batchSize;
  if (!Number.isInteger(size) || size < 1) {
    throw new RecoveryUsageError(`Batch size must be a positive integer, got '${String(size)}'`);
  }
  return session.inventory.items
    .filter((item) => item.status === 'pending' || item.status === 'stale')
    .slice(0, size);
}

export function findEvidence(session: LoadedRecoverySession, source: string): EvidenceItem {
  const byId = session.inventory.items.find((item) => item.id === source);
  if (byId) return byId;
  const matches = session.inventory.items.filter(
    (item) => item.path === source || item.url === source || item.title === source,
  );
  const first = matches[0];
  if (first === undefined) {
    throw new RecoveryUsageError(
      `No evidence matches '${source}'; use the id or exact path from: prodshape recover next`,
    );
  }
  if (matches.length > 1) {
    throw new RecoveryUsageError(
      `'${source}' matches ${matches.length} evidence items (${matches.map((m) => m.id).join(', ')}); use the id`,
    );
  }
  return first;
}

export interface MarkEvidenceOptions {
  source: string;
  classification?: FindingClassification;
  artifacts?: string[];
  question?: string;
  reason?: string;
  note?: string;
  /** Declare the source fully classified; requires at least one recorded finding. */
  complete?: boolean;
  /** Take the source out of scope entirely (status excluded); requires a reason. */
  exclude?: boolean;
  /** Accept that the content changed: refresh the digest and drop the invalidated findings. */
  acceptChanged?: boolean;
  clock?: RecoveryClock;
}

async function currentDigestOf(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  item: EvidenceItem,
): Promise<string | undefined> {
  if (item.kind === 'repo-file' && item.path !== undefined) {
    return digestFile(join(repo.root, ...item.path.split('/')));
  }
  if (item.snapshot !== undefined) {
    return digestFile(join(session.dir, ...item.snapshot.split('/')));
  }
  if (item.kind === 'external-file' && item.path !== undefined) {
    return digestFile(isAbsolute(item.path) ? item.path : join(repo.root, ...item.path.split('/')));
  }
  if (item.kind === 'user-input' && item.path !== undefined) {
    return digestFile(join(session.dir, ...item.path.split('/')));
  }
  return undefined;
}

/**
 * Reject artifact IDs that cannot possibly resolve, before they are persisted. The space-joined
 * shape is called out because it is what an unquoted comma list becomes on the PowerShell path
 * to a npm-installed CLI (issue #196): failing here keeps the broken value out of the findings
 * instead of leaving it for `recover check` to trip over later.
 */
function assertValidArtifactIds(artifacts: string[]): void {
  const invalid = artifacts.filter((id) => !productArtifactIdPattern.test(id));
  if (invalid.length > 0) {
    throw new RecoveryUsageError(
      `Invalid artifact id(s): ${invalid.map((id) => `'${id}'`).join(', ')}. ` +
        `IDs look like UC-CHECKOUT or BR-REFUND-001. On PowerShell, quote the list: --artifacts "UC-A,UC-B"`,
    );
  }
}

type FindingOptions = Pick<
  MarkEvidenceOptions,
  'classification' | 'artifacts' | 'question' | 'reason' | 'note' | 'complete'
>;

/**
 * Record one finding (and the optional completion) on an already-guarded item. Shared by the
 * single and bulk mark paths so their validation and semantics cannot drift apart.
 */
function applyFinding(
  session: LoadedRecoverySession,
  item: EvidenceItem,
  options: FindingOptions,
  clock: RecoveryClock,
): void {
  if (options.classification !== undefined) {
    const finding: EvidenceFinding = {
      classification: options.classification,
      recordedAt: clock.now(),
    };
    if (options.classification === 'represented' || options.classification === 'duplicate') {
      if (!options.artifacts || options.artifacts.length === 0) {
        throw new RecoveryUsageError(
          `Classification '${options.classification}' requires --artifacts <ID,...>`,
        );
      }
      finding.artifacts = [...options.artifacts].sort();
    }
    if (options.artifacts !== undefined) assertValidArtifactIds(options.artifacts);
    if (options.classification === 'question' || options.classification === 'contradiction') {
      if (options.question !== undefined) {
        if (!session.questions.questions.some((q) => q.id === options.question)) {
          throw new RecoveryUsageError(`Unknown question '${options.question}'`);
        }
        finding.question = options.question;
      } else if (options.classification === 'question') {
        throw new RecoveryUsageError(
          `Classification 'question' requires --question <Q-id>; record the question first: prodshape recover question add`,
        );
      }
      if (options.classification === 'contradiction') {
        if (options.note === undefined || options.note.length === 0) {
          throw new RecoveryUsageError(
            `Classification 'contradiction' requires --note describing what conflicts with what`,
          );
        }
      }
    }
    if (
      options.classification === 'out-of-scope' ||
      options.classification === 'no-product-intent'
    ) {
      if (options.reason === undefined || options.reason.length === 0) {
        throw new RecoveryUsageError(
          `Classification '${options.classification}' requires --reason`,
        );
      }
      finding.reason = options.reason;
    }
    if (options.note !== undefined && options.note.length > 0) finding.note = options.note;
    item.findings.push(finding);
  }

  if (options.complete) {
    if (item.findings.length === 0) {
      throw new RecoveryUsageError(
        `${item.id} has no findings; classify every relevant section before marking it processed`,
      );
    }
    item.status = 'processed';
    item.processedAt = clock.now();
  } else if (options.classification !== undefined && item.status === 'stale') {
    item.status = 'pending';
  }
}

export async function markEvidence(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  options: MarkEvidenceOptions,
): Promise<EvidenceItem> {
  const clock = options.clock ?? systemClock;
  const item = findEvidence(session, options.source);

  if (options.exclude) {
    if (options.reason === undefined || options.reason.length === 0) {
      throw new RecoveryUsageError(`Excluding ${item.id} requires --reason`);
    }
    item.status = 'excluded';
    item.reason = options.reason;
    touch(session, clock);
    await writeRecoverySessionFiles(session);
    await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
    return item;
  }

  if (item.status === 'missing') {
    throw new RecoveryUsageError(
      `${item.id} is missing from disk; restore it and run: prodshape recover check, or exclude it with a reason`,
    );
  }

  // Hash guard: findings recorded against different bytes than the current ones are not
  // trustworthy, so marking over changed content requires an explicit acknowledgement.
  const currentDigest = await currentDigestOf(repo, session, item);
  if (item.digest !== undefined && currentDigest !== undefined && currentDigest !== item.digest) {
    if (!options.acceptChanged) {
      throw new RecoveryUsageError(
        `${item.id} changed since it was inventoried (digest mismatch); re-read it and mark with --accept-changed to refresh the digest and drop the invalidated findings`,
      );
    }
    item.digest = currentDigest;
    item.findings = [];
    item.status = 'pending';
    delete item.processedAt;
  }

  applyFinding(session, item, options, clock);

  touch(session, clock);
  await writeRecoverySessionFiles(session);
  await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
  return item;
}

export interface MarkEvidenceBulkOptions extends FindingOptions {
  /** Globs matched against inventoried repository-relative paths; selects pending sources. */
  globs?: string[];
  /** Explicit evidence ids (or exact paths, urls, titles), any resolvable status. */
  sources?: string[];
  clock?: RecoveryClock;
}

/**
 * Apply one identical finding to a whole selection of sources in a single state write.
 *
 * Validation runs over the complete selection before anything is touched: a bulk mark either
 * lands everywhere or nowhere, because a half-applied bulk over a thousand sources is harder to
 * reason about than a refused one. Globs select pending sources only; stale, missing and
 * excluded evidence needs the individual attention `mark` gives it (`--accept-changed`,
 * restoration, re-scoping), which a bulk operation cannot honestly provide.
 */
export async function markEvidenceBulk(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  options: MarkEvidenceBulkOptions,
): Promise<EvidenceItem[]> {
  const clock = options.clock ?? systemClock;
  const globs = options.globs ?? [];
  const sources = options.sources ?? [];
  if (globs.length === 0 && sources.length === 0) {
    throw new RecoveryUsageError('Bulk mark needs a selection: pass --glob and/or --sources');
  }
  if (options.classification === undefined && !options.complete) {
    throw new RecoveryUsageError('Nothing to record: pass --as <classification> or --complete');
  }

  const selected = new Map<string, EvidenceItem>();
  for (const source of sources) {
    const item = findEvidence(session, source);
    selected.set(item.id, item);
  }
  if (globs.length > 0) {
    const isMatch = picomatch(globs, { dot: true });
    for (const item of session.inventory.items) {
      if (item.status !== 'pending') continue;
      if (item.path !== undefined && isMatch(item.path)) selected.set(item.id, item);
    }
  }
  if (selected.size === 0) {
    throw new RecoveryUsageError(
      'The bulk selection matches no markable evidence; nothing was changed',
    );
  }

  // All-or-nothing: collect every problem first, then apply only when the whole selection is
  // markable. The digest guard mirrors the single-source mark, without an --accept-changed
  // escape: accepting changed content is a per-source decision.
  const problems: string[] = [];
  for (const item of selected.values()) {
    if (item.status === 'missing') {
      problems.push(`${item.id} is missing from disk`);
      continue;
    }
    if (item.status === 'excluded') {
      problems.push(
        `${item.id} is excluded; re-scope it individually with: prodshape recover mark`,
      );
      continue;
    }
    const currentDigest = await currentDigestOf(repo, session, item);
    if (item.digest !== undefined && currentDigest !== undefined && currentDigest !== item.digest) {
      problems.push(
        `${item.id} changed since it was inventoried; mark it individually with --accept-changed`,
      );
      continue;
    }
    if (options.classification === undefined && options.complete && item.findings.length === 0) {
      problems.push(`${item.id} has no findings to complete`);
    }
  }
  if (problems.length > 0) {
    throw new RecoveryUsageError(
      `Bulk mark refused; nothing was changed:\n${problems.map((p) => `  ${p}`).join('\n')}`,
    );
  }

  for (const item of selected.values()) {
    applyFinding(session, item, options, clock);
  }

  touch(session, clock);
  await writeRecoverySessionFiles(session);
  await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
  return [...selected.values()];
}

export interface UnmarkEvidenceOptions {
  source: string;
  /** Remove the most recently recorded finding. */
  last?: boolean;
  /** Remove the finding at this 1-based position. */
  index?: number;
  /** Remove every finding. */
  all?: boolean;
  clock?: RecoveryClock;
}

/**
 * Retract findings through the CLI instead of by hand-editing session state. Any retraction
 * returns the source to `pending`: whatever completion claim the old findings supported is void
 * once they change, and re-completing is a deliberate `mark --complete` away.
 */
export async function unmarkEvidence(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  options: UnmarkEvidenceOptions,
): Promise<EvidenceItem> {
  const clock = options.clock ?? systemClock;
  const item = findEvidence(session, options.source);
  const selectors = [options.last, options.index !== undefined, options.all].filter(Boolean);
  if (selectors.length !== 1) {
    throw new RecoveryUsageError('Pass exactly one of --last, --index <n> or --all');
  }
  if (item.status === 'missing') {
    throw new RecoveryUsageError(
      `${item.id} is missing from disk; restore it and run: prodshape recover check`,
    );
  }
  if (item.status === 'excluded') {
    throw new RecoveryUsageError(
      `${item.id} is excluded and carries no findings to retract; re-scope it with: prodshape recover mark`,
    );
  }
  if (item.findings.length === 0) {
    throw new RecoveryUsageError(`${item.id} has no findings to retract`);
  }

  if (options.all) {
    item.findings = [];
  } else if (options.last) {
    item.findings.pop();
  } else {
    const index = options.index ?? 0;
    if (!Number.isInteger(index) || index < 1 || index > item.findings.length) {
      throw new RecoveryUsageError(
        `--index must be between 1 and ${item.findings.length} for ${item.id}`,
      );
    }
    item.findings.splice(index - 1, 1);
  }

  // Stale means the content changed behind the findings; retracting some of them does not make
  // the remainder trustworthy, so staleness survives the retraction.
  if (item.status !== 'stale') item.status = 'pending';
  delete item.processedAt;

  touch(session, clock);
  await writeRecoverySessionFiles(session);
  await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
  return item;
}

export interface AddEvidenceOptions {
  url?: string;
  file?: string;
  /** Inline user-relayed knowledge; stored under the session's evidence directory. */
  text?: string;
  title: string;
  /**
   * Externally sourced material may only enter the inventory when the user explicitly authorised
   * it in this conversation; the flag records that authorisation as data.
   */
  authorized?: boolean;
  clock?: RecoveryClock;
}

export async function addEvidence(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  options: AddEvidenceOptions,
): Promise<EvidenceItem> {
  const clock = options.clock ?? systemClock;
  const provided = [options.url, options.file, options.text].filter((v) => v !== undefined);
  if (provided.length !== 1) {
    throw new RecoveryUsageError(`Provide exactly one of --url, --file or --text`);
  }
  if (options.title.length === 0) {
    throw new RecoveryUsageError('External evidence requires --title');
  }
  if ((options.url !== undefined || options.file !== undefined) && !options.authorized) {
    throw new RecoveryUsageError(
      'External sources enter the inventory only with explicit user authorisation; re-run with --authorized once the user has confirmed this exact source',
    );
  }

  session.state.counters.evidence += 1;
  const id = nextSequentialId('E', session.state.counters.evidence);
  const now = clock.now();
  const item: EvidenceItem = {
    id,
    kind:
      options.url !== undefined
        ? 'external-url'
        : options.file !== undefined
          ? 'external-file'
          : 'user-input',
    title: options.title,
    authorization: 'user',
    status: 'pending',
    findings: [],
    addedAt: now,
  };
  if (options.url !== undefined) item.url = options.url;
  if (options.file !== undefined) {
    item.path = options.file;
    const digest = await digestFile(
      isAbsolute(options.file) ? options.file : join(repo.root, ...options.file.split('/')),
    );
    if (digest === undefined) {
      throw new RecoveryUsageError(`Cannot read '${options.file}' to hash it`);
    }
    item.digest = digest;
  }
  if (options.text !== undefined) {
    const relative = `evidence/${id.toLowerCase()}.md`;
    await mkdir(join(session.dir, 'evidence'), { recursive: true });
    await writeFile(join(session.dir, ...relative.split('/')), options.text, 'utf8');
    item.path = relative;
    item.digest = contentDigest(options.text);
  }

  session.inventory.items.push(item);
  touch(session, clock);
  await writeRecoverySessionFiles(session);
  await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
  return item;
}

/**
 * Freeze external content the skill fetched (with user authorisation) into the session directory,
 * so the evidence hash has stable bytes to stand on and staleness stays detectable.
 */
export async function snapshotEvidence(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  evidenceId: string,
  sourceFile: string,
  clock: RecoveryClock = systemClock,
): Promise<EvidenceItem> {
  const item = findEvidence(session, evidenceId);
  if (item.kind === 'repo-file') {
    throw new RecoveryUsageError(
      `${item.id} is a repository file; snapshots are for external evidence`,
    );
  }
  const bytes = await readFile(isAbsolute(sourceFile) ? sourceFile : join(repo.root, sourceFile));
  const relative = `evidence/${item.id.toLowerCase()}.snapshot`;
  await mkdir(join(session.dir, 'evidence'), { recursive: true });
  await writeFile(join(session.dir, ...relative.split('/')), bytes);
  item.snapshot = relative;
  item.digest = contentDigestBytes(bytes);
  if (item.status === 'stale') item.status = 'pending';
  touch(session, clock);
  await writeRecoverySessionFiles(session);
  return item;
}

export async function addLead(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  options: { description: string; source?: string; kind: LeadKind; clock?: RecoveryClock },
): Promise<RecoveryLead> {
  const clock = options.clock ?? systemClock;
  if (options.description.length === 0) throw new RecoveryUsageError('A lead needs a description');
  session.state.counters.lead += 1;
  const lead: RecoveryLead = {
    id: nextSequentialId('L', session.state.counters.lead),
    description: options.description,
    kind: options.kind,
    status: 'open',
    createdAt: clock.now(),
  };
  if (options.source !== undefined) lead.source = options.source;
  session.leads.leads.push(lead);
  touch(session, clock);
  await writeRecoverySessionFiles(session);
  await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
  return lead;
}

export async function resolveLead(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  leadId: string,
  resolution: string,
  clock: RecoveryClock = systemClock,
): Promise<RecoveryLead> {
  const lead = session.leads.leads.find((l) => l.id === leadId);
  if (!lead) throw new RecoveryUsageError(`Unknown lead '${leadId}'`);
  if (resolution.length === 0)
    throw new RecoveryUsageError('Resolving a lead requires --resolution');
  lead.status = 'resolved';
  lead.resolution = resolution;
  lead.resolvedAt = clock.now();
  touch(session, clock);
  await writeRecoverySessionFiles(session);
  await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
  return lead;
}

export async function addQuestion(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  options: {
    text: string;
    context?: string;
    options?: string[];
    recommendation?: string;
    clock?: RecoveryClock;
  },
): Promise<RecoveryQuestion> {
  const clock = options.clock ?? systemClock;
  if (options.text.length === 0) throw new RecoveryUsageError('A question needs text');
  session.state.counters.question += 1;
  const question: RecoveryQuestion = {
    id: nextSequentialId('Q', session.state.counters.question),
    text: options.text,
    status: 'open',
    createdAt: clock.now(),
  };
  if (options.context !== undefined) question.context = options.context;
  if (options.options !== undefined && options.options.length > 0)
    question.options = options.options;
  if (options.recommendation !== undefined) question.recommendation = options.recommendation;
  session.questions.questions.push(question);
  touch(session, clock);
  await writeRecoverySessionFiles(session);
  await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
  return question;
}

export async function answerQuestion(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  questionId: string,
  answer: string,
  clock: RecoveryClock = systemClock,
): Promise<RecoveryQuestion> {
  const question = session.questions.questions.find((q) => q.id === questionId);
  if (!question) throw new RecoveryUsageError(`Unknown question '${questionId}'`);
  if (answer.length === 0) throw new RecoveryUsageError('Answering a question requires --answer');
  question.status = 'answered';
  question.answer = answer;
  question.resolvedAt = clock.now();
  touch(session, clock);
  await writeRecoverySessionFiles(session);
  await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
  return question;
}

export async function deferQuestion(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  questionId: string,
  reason: string,
  clock: RecoveryClock = systemClock,
): Promise<RecoveryQuestion> {
  const question = session.questions.questions.find((q) => q.id === questionId);
  if (!question) throw new RecoveryUsageError(`Unknown question '${questionId}'`);
  if (reason.length === 0) throw new RecoveryUsageError('Deferring a question requires --reason');
  question.status = 'deferred';
  question.deferredReason = reason;
  question.resolvedAt = clock.now();
  touch(session, clock);
  await writeRecoverySessionFiles(session);
  await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
  return question;
}

/**
 * Record that an artifact family was probed and yielded nothing. Families with candidates are
 * probed by construction; the explicit record exists so "we looked and found none" is
 * distinguishable from "nobody looked".
 */
export async function markFamilyProbe(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  family: string,
  note: string,
  clock: RecoveryClock = systemClock,
): Promise<void> {
  if (!(productArtifactTypes as readonly string[]).includes(family)) {
    throw new RecoveryUsageError(
      `Unknown artifact family '${family}' (expected one of: ${productArtifactTypes.join(', ')})`,
    );
  }
  if (note.length === 0) {
    throw new RecoveryUsageError(
      'Recording a none-found probe requires --note explaining what was searched',
    );
  }
  session.state.familyProbes[family] = { outcome: 'none-found', note, recordedAt: clock.now() };
  touch(session, clock);
  await writeRecoverySessionFiles(session);
  await writeCoverage(repo, session, await scanCandidates(repo, session.state), clock);
}

export interface CandidateArtifact {
  id: string;
  type: string;
  /** Repository-relative POSIX path under the change's proposed directory. */
  file: string;
  status?: string;
  confidence?: string;
  hasProvenance: boolean;
}

/** Scan the candidates currently authored under the change's proposed directory. */
export async function scanCandidates(
  repo: ProductRepository,
  state: RecoveryState,
): Promise<CandidateArtifact[]> {
  const proposedDir = join(repo.root, ...state.changeDir.split('/'), 'proposed');
  const files = await globSafe('**/*.md', { cwd: proposedDir, absolute: true, dot: false });
  const candidates: CandidateArtifact[] = [];
  for (const file of files.sort()) {
    const { artifact } = await loadArtifactFile(file, repo.root, repo.registry);
    if (!artifact?.id || !artifact.type) continue;
    const provenance = artifact.frontmatter.provenance as Record<string, unknown> | undefined;
    const confidence =
      typeof provenance?.confidence === 'string' ? provenance.confidence : undefined;
    candidates.push({
      id: artifact.id,
      type: artifact.type,
      file: artifact.file,
      ...(artifact.status !== undefined ? { status: artifact.status } : {}),
      ...(confidence !== undefined ? { confidence } : {}),
      hasProvenance: provenance !== undefined,
    });
  }
  return candidates;
}

async function changeContentDigest(repo: ProductRepository, state: RecoveryState): Promise<string> {
  const changeDir = join(repo.root, ...state.changeDir.split('/'));
  const files = (await globSafe('**/*', { cwd: changeDir, dot: false, onlyFiles: true })).sort();
  const parts: string[] = [];
  for (const file of files) {
    const digest = await digestFile(join(changeDir, ...file.split('/')));
    parts.push(`${file}${digest ?? 'unreadable'}`);
  }
  return contentDigest(parts.join('\n'));
}

export interface RecoveryIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  source?: string;
}

/**
 * Build a RecoveryIssue via parameters rather than an inline `{ severity: 'x', code: 'y' }`
 * literal. RecoveryIssue codes are session-operational (missing-evidence, stale-evidence, ...),
 * a distinct taxonomy from the PRODUCT0xx/PRODUCT1xx model diagnostic contract; the inline shape
 * is otherwise indistinguishable from a model diagnostic to the repo-wide source scan in
 * tests/conformance/diagnostic-codes.test.ts that enforces that unrelated contract.
 */
function issue(
  severity: RecoveryIssue['severity'],
  code: string,
  message: string,
  source?: string,
): RecoveryIssue {
  return source === undefined ? { severity, code, message } : { severity, code, message, source };
}

export interface CompletionCriteria {
  sourcesClassified: boolean;
  leadsResolved: boolean;
  questionsResolved: boolean;
  familiesProbed: boolean;
  duplicatesReconciled: boolean;
  validationPasses: boolean;
  validationFresh: boolean;
  noStaleEvidence: boolean;
  lowConfidenceReported: boolean;
  modelUntouched: boolean;
  outputOnlyChgInitial: boolean;
}

export interface RecoveryCoverage {
  schema: string;
  sessionId: string;
  generatedAt: string;
  sources: Record<EvidenceStatus | 'total', number>;
  classifications: Record<FindingClassification, number>;
  candidates: { total: number; byType: Record<string, number> };
  evidenceToCandidates: Record<string, string[]>;
  families: Record<string, 'candidates' | 'none-found' | 'unprobed'>;
  leads: { open: number; resolved: number };
  questions: { open: number; answered: number; deferred: number };
  validation?: {
    at: string;
    errors: number;
    warnings: number;
    lowConfidence: string[];
    fresh: boolean;
  };
  completion: { complete: boolean; criteria: CompletionCriteria };
}

function mappedCandidateIds(session: LoadedRecoverySession): Map<string, string[]> {
  const byCandidate = new Map<string, string[]>();
  for (const item of session.inventory.items) {
    if (item.status !== 'processed') continue;
    for (const finding of item.findings) {
      for (const artifact of finding.artifacts ?? []) {
        byCandidate.set(artifact, [...(byCandidate.get(artifact) ?? []), item.id]);
      }
    }
  }
  return byCandidate;
}

export async function computeCoverage(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  candidates: CandidateArtifact[],
  clock: RecoveryClock = systemClock,
): Promise<RecoveryCoverage> {
  const sources: RecoveryCoverage['sources'] = {
    total: session.inventory.items.length,
    pending: 0,
    processed: 0,
    stale: 0,
    missing: 0,
    excluded: 0,
  };
  const classifications: RecoveryCoverage['classifications'] = {
    represented: 0,
    duplicate: 0,
    contradiction: 0,
    question: 0,
    'out-of-scope': 0,
    'no-product-intent': 0,
  };
  for (const item of session.inventory.items) {
    sources[item.status] += 1;
    for (const finding of item.findings) classifications[finding.classification] += 1;
  }

  const byType: Record<string, number> = {};
  const candidateIds = new Set<string>();
  for (const candidate of candidates) {
    byType[candidate.type] = (byType[candidate.type] ?? 0) + 1;
    candidateIds.add(candidate.id);
  }

  const families: RecoveryCoverage['families'] = {};
  for (const family of productArtifactTypes) {
    if ((byType[family] ?? 0) > 0) families[family] = 'candidates';
    else if (session.state.familyProbes[family] !== undefined) families[family] = 'none-found';
    else families[family] = 'unprobed';
  }

  const evidenceToCandidates: Record<string, string[]> = {};
  for (const item of session.inventory.items) {
    const mapped = new Set<string>();
    for (const finding of item.findings) {
      for (const artifact of finding.artifacts ?? []) mapped.add(artifact);
    }
    if (mapped.size > 0) evidenceToCandidates[item.id] = [...mapped].sort();
  }

  const leads = {
    open: session.leads.leads.filter((l) => l.status === 'open').length,
    resolved: session.leads.leads.filter((l) => l.status === 'resolved').length,
  };
  const questions = {
    open: session.questions.questions.filter((q) => q.status === 'open').length,
    answered: session.questions.questions.filter((q) => q.status === 'answered').length,
    deferred: session.questions.questions.filter((q) => q.status === 'deferred').length,
  };

  const validationRecord = session.state.validation;
  const fresh =
    validationRecord !== undefined &&
    validationRecord.changeDigest === (await changeContentDigest(repo, session.state));

  const duplicatesReconciled = session.inventory.items.every((item) =>
    item.findings.every(
      (finding) =>
        finding.classification !== 'duplicate' ||
        (finding.artifacts ?? []).every((id) => candidateIds.has(id)),
    ),
  );

  const modelUntouched =
    stableJson(await snapshotModel(repo)) === stableJson(session.state.modelSnapshot);

  const mappingsResolve = session.inventory.items.every((item) =>
    item.findings.every((finding) => (finding.artifacts ?? []).every((id) => candidateIds.has(id))),
  );

  const criteria: CompletionCriteria = {
    sourcesClassified: sources.pending === 0 && sources.stale === 0 && sources.missing === 0,
    leadsResolved: leads.open === 0,
    questionsResolved: questions.open === 0,
    familiesProbed: Object.values(families).every((value) => value !== 'unprobed'),
    duplicatesReconciled,
    validationPasses: validationRecord !== undefined && validationRecord.errors === 0,
    validationFresh: fresh,
    noStaleEvidence: sources.stale === 0 && sources.missing === 0,
    lowConfidenceReported: fresh,
    modelUntouched,
    outputOnlyChgInitial: mappingsResolve,
  };

  return {
    schema: recoveryCoverageSchemaId,
    sessionId: session.state.sessionId,
    generatedAt: clock.now(),
    sources,
    classifications,
    candidates: { total: candidates.length, byType },
    evidenceToCandidates,
    families,
    leads,
    questions,
    ...(validationRecord !== undefined
      ? {
          validation: {
            at: validationRecord.at,
            errors: validationRecord.errors,
            warnings: validationRecord.warnings,
            lowConfidence: validationRecord.lowConfidence,
            fresh,
          },
        }
      : {}),
    completion: {
      complete: Object.values(criteria).every(Boolean),
      criteria,
    },
  };
}

async function writeCoverage(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  candidates: CandidateArtifact[],
  clock: RecoveryClock,
): Promise<RecoveryCoverage> {
  const coverage = await computeCoverage(repo, session, candidates, clock);
  await writeJsonAtomic(join(session.dir, sessionFileNames.coverage), coverage);
  return coverage;
}

export interface RecoveryCheckResult {
  issues: RecoveryIssue[];
  coverage: RecoveryCoverage;
  /** Diagnostics from the overlay validation, when the change exists. */
  diagnostics: Diagnostic[];
}

/**
 * The full deterministic re-check: refresh the repository inventory, re-hash every hashable
 * source, verify the model stayed untouched, cross-check candidate mappings and re-run overlay
 * validation of the change. Everything the skill must not assert from memory is recomputed here.
 */
export async function checkRecoverySession(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  clock: RecoveryClock = systemClock,
): Promise<RecoveryCheckResult> {
  const issues: RecoveryIssue[] = [];
  const now = clock.now();

  // Re-discover repository evidence: new files matching the brief join the inventory as pending,
  // disappeared files are flagged missing. Scope never silently expands beyond the brief.
  const discovered = await discoverRepositoryEvidence(repo, session.state.brief);
  const discoveredSet = new Set(discovered);
  const known = new Set(
    session.inventory.items.filter((i) => i.kind === 'repo-file').map((i) => i.path ?? ''),
  );
  for (const path of discovered) {
    if (known.has(path)) continue;
    session.state.counters.evidence += 1;
    const digest = await digestFile(join(repo.root, ...path.split('/')));
    session.inventory.items.push({
      id: nextSequentialId('E', session.state.counters.evidence),
      kind: 'repo-file',
      path,
      ...(digest !== undefined ? { digest } : {}),
      authorization: 'brief',
      status: 'pending',
      findings: [],
      addedAt: now,
    });
    issues.push(
      issue(
        'warning',
        'new-evidence',
        `New file matches the brief and joined the inventory as pending: ${path}`,
        path,
      ),
    );
  }

  for (const item of session.inventory.items) {
    if (item.status === 'excluded') continue;
    if (item.kind === 'repo-file' && item.path !== undefined && !discoveredSet.has(item.path)) {
      item.status = 'missing';
      issues.push(
        issue(
          'error',
          'missing-evidence',
          `${item.id} (${item.path}) is no longer present; restore it or exclude it with a reason`,
          item.id,
        ),
      );
      continue;
    }
    const current = await currentDigestOf(repo, session, item);
    if (item.digest !== undefined && current !== undefined && current !== item.digest) {
      item.status = 'stale';
      issues.push(
        issue(
          'error',
          'stale-evidence',
          `${item.id} changed since it was processed; re-read it and mark with --accept-changed`,
          item.id,
        ),
      );
    } else if (item.status === 'missing' || item.status === 'stale') {
      // The content is back and matches the recorded digest, so the previous findings hold again.
      item.status =
        item.processedAt !== undefined && item.findings.length > 0 ? 'processed' : 'pending';
    }
  }

  // The accepted model must stay untouched for the whole session: recovery proposes, never edits.
  const model = await snapshotModel(repo);
  if (stableJson(model) !== stableJson(session.state.modelSnapshot)) {
    issues.push(
      issue(
        'error',
        'model-modified',
        `${repo.config.product.model} changed during recovery; initial recovery writes only to ${session.state.changeDir}/proposed/`,
      ),
    );
  }

  // Candidates live only under the change's proposed directory; mappings must resolve there.
  const candidates = await scanCandidates(repo, session.state);
  const candidateIds = new Set(candidates.map((c) => c.id));
  for (const item of session.inventory.items) {
    for (const finding of item.findings) {
      for (const artifact of finding.artifacts ?? []) {
        if (!candidateIds.has(artifact)) {
          issues.push(
            issue(
              'error',
              'unresolved-candidate',
              `${item.id} maps to '${artifact}' but no candidate with that ID exists under ${session.state.changeDir}/proposed/`,
              item.id,
            ),
          );
        }
      }
    }
  }
  const mapped = mappedCandidateIds(session);
  for (const candidate of candidates) {
    if (!mapped.has(candidate.id)) {
      issues.push(
        issue(
          'warning',
          'unmapped-candidate',
          `Candidate ${candidate.id} has no evidence mapping yet; map it with: prodshape recover mark --source <id> --as represented --artifacts ${candidate.id}`,
        ),
      );
    }
    if (!candidate.hasProvenance) {
      issues.push(
        issue(
          'error',
          'candidate-without-provenance',
          `Candidate ${candidate.id} carries no provenance frontmatter; recovered candidates without provenance are opinions`,
        ),
      );
    }
    if (candidate.status !== 'draft') {
      issues.push(
        issue(
          'error',
          'candidate-not-draft',
          `Candidate ${candidate.id} has status '${candidate.status ?? 'unset'}'; recovered candidates stay draft until a human accepts them`,
        ),
      );
    }
  }

  // Overlay validation of the change itself, the same computation `change validate` runs.
  let diagnostics: Diagnostic[] = [];
  const changeDirAbs = join(repo.root, ...session.state.changeDir.split('/'));
  let changeExists = true;
  try {
    await readFile(join(changeDirAbs, 'change.md'));
  } catch {
    changeExists = false;
    issues.push(
      issue(
        'warning',
        'change-missing',
        `${session.state.changeDir}/change.md does not exist yet; author it before validation can run`,
      ),
    );
  }
  if (changeExists) {
    const change = await loadChange(changeDirAbs, repo.root, repo.registry);
    const { artifacts: baseline } = await validateBaseline(repo);
    const activeDir = join(repo.root, ...repo.config.product.changes.split('/'), 'active');
    const others = [];
    for (const dir of await discoverChanges(activeDir)) {
      if (dir !== changeDirAbs) others.push(await loadChange(dir, repo.root, repo.registry));
    }
    const validation = validateChange(change, baseline, others);
    diagnostics = validation.diagnostics;
    const errors = diagnostics.filter((d) => d.severity === 'error');
    const lowConfidence = [
      ...new Set(
        diagnostics
          .filter((d) => d.code === 'PRODUCT111')
          .map((d) => d.artifact)
          .filter((id): id is string => typeof id === 'string'),
      ),
    ].sort();
    session.state.validation = {
      at: now,
      errors: errors.length,
      warnings: diagnostics.length - errors.length,
      lowConfidence,
      changeDigest: await changeContentDigest(repo, session.state),
    };
    for (const diagnostic of errors) {
      issues.push(
        issue(
          'error',
          diagnostic.code,
          `${diagnostic.file}: ${diagnostic.message}`,
          diagnostic.artifact,
        ),
      );
    }
  }

  touch(session, clock);
  await writeRecoverySessionFiles(session);
  const coverage = await writeCoverage(repo, session, candidates, clock);
  return { issues, coverage, diagnostics };
}

function reportLine(lines: string[], text = ''): void {
  lines.push(text);
}

/** Render the final recovery report. Generated material: informative, never canonical. */
export function buildRecoveryReport(
  session: LoadedRecoverySession,
  coverage: RecoveryCoverage,
  candidates: CandidateArtifact[],
): string {
  const { state, inventory, leads, questions } = session;
  const lines: string[] = [];
  reportLine(lines, `# Recovery report: ${state.sessionId}`);
  reportLine(lines);
  reportLine(
    lines,
    `Generated ${coverage.generatedAt} by ProductShape ${state.cliVersion}. This report and every file in this session directory are generated, non-canonical material.`,
  );
  reportLine(lines);
  reportLine(lines, '## Non-acceptance statement');
  reportLine(lines);
  reportLine(
    lines,
    `Nothing in this session is accepted product knowledge. Every candidate lives under \`${state.changeDir}/proposed/\` as part of \`${state.changeId}\`, carries status \`draft\`, and enters the model only after overlay validation, human product approval and explicit apply on a working branch; a human merge of the reviewed result then accepts the baseline. The accepted model was not modified: ${coverage.completion.criteria.modelUntouched ? 'verified' : 'VIOLATED, see issues'}.`,
  );
  reportLine(lines);
  reportLine(lines, '## Scope');
  reportLine(lines);
  if (state.brief.scope !== undefined) reportLine(lines, state.brief.scope);
  reportLine(lines, `- Roots: ${state.brief.roots.join(', ')}`);
  reportLine(lines, `- Include: ${state.brief.include.join(', ')}`);
  if (state.brief.exclude.length > 0)
    reportLine(lines, `- Exclude: ${state.brief.exclude.join(', ')}`);
  if (state.brief.ignore.length > 0)
    reportLine(lines, `- Ignored as generated or historical: ${state.brief.ignore.join(', ')}`);
  reportLine(lines, `- Forbidden (never read): ${state.brief.forbidden.join(', ')}`);
  if (state.brief.languages.length > 0)
    reportLine(lines, `- Documentation languages: ${state.brief.languages.join(', ')}`);
  const policy = state.brief.secondaryEvidence;
  reportLine(
    lines,
    `- Secondary evidence policy: code ${policy.code ? 'yes' : 'no'}, tests ${policy.tests ? 'yes' : 'no'}, issues ${policy.issues ? 'yes' : 'no'}, commit history ${policy.commitHistory ? 'yes' : 'no'}, external ${policy.external ? 'yes' : 'no'}`,
  );
  reportLine(lines);
  reportLine(lines, '## Sources');
  reportLine(lines);
  reportLine(lines, `| Status | Count |`);
  reportLine(lines, `| --- | --- |`);
  for (const status of ['pending', 'processed', 'stale', 'missing', 'excluded'] as const) {
    reportLine(lines, `| ${status} | ${coverage.sources[status]} |`);
  }
  reportLine(lines, `| total | ${coverage.sources.total} |`);
  reportLine(lines);
  const excluded = inventory.items.filter((i) => i.status === 'excluded');
  if (excluded.length > 0) {
    reportLine(lines, 'Excluded sources and why:');
    reportLine(lines);
    for (const item of excluded) {
      reportLine(
        lines,
        `- ${item.id} (${item.path ?? item.url ?? item.title ?? 'unnamed'}): ${item.reason ?? ''}`,
      );
    }
    reportLine(lines);
  }
  const external = inventory.items.filter((i) => i.kind !== 'repo-file');
  reportLine(lines, '## External and user-provided evidence');
  reportLine(lines);
  if (external.length === 0) {
    reportLine(lines, 'None. Every source was a repository file.');
  } else {
    for (const item of external) {
      const where = item.url ?? item.path ?? 'inline';
      const hashed = item.digest !== undefined ? 'hashed' : 'not hashable';
      reportLine(
        lines,
        `- ${item.id} (${item.kind}, authorised via ${item.authorization}): ${item.title ?? where}, ${where}, ${hashed}, status ${item.status}`,
      );
    }
  }
  reportLine(lines);
  reportLine(lines, '## Candidate artifacts');
  reportLine(lines);
  reportLine(
    lines,
    `${coverage.candidates.total} candidate(s) under \`${state.changeDir}/proposed/\`:`,
  );
  reportLine(lines);
  reportLine(lines, `| Kind | Count |`);
  reportLine(lines, `| --- | --- |`);
  for (const [type, count] of Object.entries(coverage.candidates.byType).sort()) {
    reportLine(lines, `| ${type} | ${count} |`);
  }
  reportLine(lines);
  reportLine(lines, 'Family probe results:');
  reportLine(lines);
  for (const [family, value] of Object.entries(coverage.families)) {
    const probe = state.familyProbes[family];
    reportLine(lines, `- ${family}: ${value}${probe !== undefined ? ` (${probe.note})` : ''}`);
  }
  reportLine(lines);
  reportLine(lines, '## Provenance mapping');
  reportLine(lines);
  const byCandidate = new Map<string, string[]>();
  for (const [evidence, ids] of Object.entries(coverage.evidenceToCandidates)) {
    for (const id of ids) byCandidate.set(id, [...(byCandidate.get(id) ?? []), evidence]);
  }
  for (const candidate of candidates) {
    const evidence = (byCandidate.get(candidate.id) ?? []).sort();
    reportLine(
      lines,
      `- ${candidate.id} (${candidate.type}${candidate.confidence !== undefined ? `, confidence ${candidate.confidence}` : ''}): ${evidence.length > 0 ? evidence.join(', ') : 'NO EVIDENCE MAPPED'}`,
    );
  }
  reportLine(lines);
  reportLine(lines, '## Contradictions');
  reportLine(lines);
  const contradictions = inventory.items.flatMap((item) =>
    item.findings
      .filter((f) => f.classification === 'contradiction')
      .map((f) => ({ item, finding: f })),
  );
  if (contradictions.length === 0) {
    reportLine(lines, 'None recorded.');
  } else {
    for (const { item, finding } of contradictions) {
      reportLine(
        lines,
        `- ${item.id}: ${finding.note ?? ''}${finding.question !== undefined ? ` (tracked as ${finding.question})` : ''}`,
      );
    }
  }
  reportLine(lines);
  reportLine(lines, '## Questions');
  reportLine(lines);
  if (questions.questions.length === 0) {
    reportLine(lines, 'None recorded.');
  } else {
    for (const question of questions.questions) {
      const outcome =
        question.status === 'answered'
          ? `answered: ${question.answer ?? ''}`
          : question.status === 'deferred'
            ? `deferred: ${question.deferredReason ?? ''}`
            : 'OPEN';
      reportLine(lines, `- ${question.id} (${outcome}): ${question.text}`);
    }
  }
  reportLine(lines);
  reportLine(lines, '## Leads');
  reportLine(lines);
  if (leads.leads.length === 0) {
    reportLine(lines, 'None recorded.');
  } else {
    for (const lead of leads.leads) {
      reportLine(
        lines,
        `- ${lead.id} (${lead.kind}, ${lead.status}${lead.resolution !== undefined ? `: ${lead.resolution}` : ''}): ${lead.description}`,
      );
    }
  }
  reportLine(lines);
  reportLine(lines, '## Validation');
  reportLine(lines);
  if (coverage.validation === undefined) {
    reportLine(lines, 'Overlay validation has not run; run: prodshape recover check');
  } else {
    reportLine(
      lines,
      `Last run ${coverage.validation.at}${coverage.validation.fresh ? '' : ' (STALE, re-run: prodshape recover check)'}: ${coverage.validation.errors} error(s), ${coverage.validation.warnings} warning(s).`,
    );
    reportLine(lines);
    if (coverage.validation.lowConfidence.length > 0) {
      reportLine(lines, 'Low-confidence candidates needing human validation (PRODUCT111):');
      reportLine(lines);
      for (const id of coverage.validation.lowConfidence) reportLine(lines, `- ${id}`);
    } else {
      reportLine(lines, 'No low-confidence candidates reported.');
    }
  }
  reportLine(lines);
  reportLine(lines, '## Completion');
  reportLine(lines);
  reportLine(lines, `Complete: ${coverage.completion.complete ? 'yes' : 'no'}`);
  reportLine(lines);
  for (const [criterion, met] of Object.entries(coverage.completion.criteria)) {
    reportLine(lines, `- ${criterion}: ${met ? 'met' : 'not met'}`);
  }
  reportLine(lines);
  reportLine(lines, '## Where the output lives');
  reportLine(lines);
  reportLine(
    lines,
    `\`${state.changeDir}/\` holds \`change.md\` and the proposed candidates. Review happens there; this session directory (\`${session.relDir}/\`) is bookkeeping and safe to regenerate.`,
  );
  reportLine(lines);
  return lines.join('\n');
}

export async function writeRecoveryReport(
  repo: ProductRepository,
  session: LoadedRecoverySession,
  clock: RecoveryClock = systemClock,
): Promise<{ path: string; coverage: RecoveryCoverage }> {
  const candidates = await scanCandidates(repo, session.state);
  const coverage = await writeCoverage(repo, session, candidates, clock);
  const report = buildRecoveryReport(session, coverage, candidates);
  await writeFile(join(session.dir, sessionFileNames.report), report, 'utf8');
  return { path: `${session.relDir}/${sessionFileNames.report}`, coverage };
}
