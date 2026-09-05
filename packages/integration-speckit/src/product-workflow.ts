/** Spec Kit's PRODUCT lane: container paths and lifecycle moves. Product semantics live in @prodshape/core. */
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  INITIAL_CHANGE_ID,
  NO_BASELINE_REVISION,
  applyHostedProductChange,
  assessHostedProductChange,
  compareCodePoints,
  gitHead,
  isNotFound,
  loadChange,
  loadLiveChanges,
  openRepository,
  scaffoldChangeDocument,
  validateBaseline,
  analyzeImpact,
  stableJson,
  startRecoverySession,
  loadRecoverySession,
  resolveSessionId,
  nextBatch,
  addLead,
  addQuestion,
  checkRecoverySession,
  markEvidence,
  scanCandidates,
  markFamilyProbe,
  unmarkEvidence,
  writeRecoveryReport,
} from '@prodshape/core';
import type {
  CandidateArtifact,
  Diagnostic,
  FindingClassification,
  HostedProductApplyResult,
  ImpactReport,
  LoadedChange,
  LoadedRecoverySession,
  ProductRepository,
  RecoveryBrief,
  RecoveryCoverage,
  RecoveryIssue,
} from '@prodshape/core';
import { resolveInRepository } from '@prodshape/core';
import { pathExists } from './workspace.js';

export const SPECKIT_PRODUCT_ROOT = '.specify/productshape';
export const SPECKIT_PRODUCT_CHANGES = `${SPECKIT_PRODUCT_ROOT}/changes`;
export const SPECKIT_PRODUCT_ARCHIVE = `${SPECKIT_PRODUCT_ROOT}/archive`;
export const SPECKIT_RECOVERY_ROOT = `${SPECKIT_PRODUCT_ROOT}/recoveries`;
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function assertName(name: string): void {
  if (!NAME.test(name) || name.length > 200) {
    throw new Error(`Spec Kit Product Change '${name}' must be lowercase kebab-case.`);
  }
}

function changeDir(root: string, name: string): string {
  assertName(name);
  return resolveInRepository(
    root,
    `${SPECKIT_PRODUCT_CHANGES}/${name}`,
    'the Spec Kit Product lane',
  );
}

function adapterRepo(repo: ProductRepository): ProductRepository {
  return { ...repo, recoveryRoot: SPECKIT_RECOVERY_ROOT };
}

export interface SpecKitProductChangeRef {
  name: string;
  dir: string;
  file: string;
}

export async function listSpecKitProductChanges(root: string): Promise<SpecKitProductChangeRef[]> {
  const base = resolveInRepository(root, SPECKIT_PRODUCT_CHANGES, 'the Spec Kit Product lane');
  let entries;
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
  return entries
    .filter((e) => e.isDirectory() && NAME.test(e.name))
    .map((e) => ({
      name: e.name,
      dir: join(base, e.name),
      file: `${SPECKIT_PRODUCT_CHANGES}/${e.name}/change.md`,
    }))
    .sort((a, b) => compareCodePoints(a.name, b.name));
}

export async function loadSpecKitProductChange(root: string, name: string): Promise<LoadedChange> {
  const dir = changeDir(root, name);
  if (!(await pathExists(join(dir, 'change.md')))) {
    const known = (await listSpecKitProductChanges(root)).map((c) => c.name).join(', ') || 'none';
    throw new Error(
      `No Spec Kit Product Change '${name}' under ${SPECKIT_PRODUCT_CHANGES}/ (found: ${known}).`,
    );
  }
  const repo = await openRepository(root);
  return loadChange(dir, repo.root, repo.registry);
}

function titleFromName(name: string): string {
  const words = name.split('-');
  return [words[0]!.charAt(0).toUpperCase() + words[0]!.slice(1), ...words.slice(1)].join(' ');
}

export async function createSpecKitProductChange(
  root: string,
  name: string,
  options: { initial?: boolean } = {},
): Promise<SpecKitProductChangeRef> {
  await openRepository(root);
  const dir = changeDir(root, name);
  if (await pathExists(join(dir, 'change.md')))
    throw new Error(`Spec Kit Product Change '${name}' already exists.`);
  const id = options.initial ? INITIAL_CHANGE_ID : `CHG-${name.toUpperCase()}-001`;
  const revision = (await gitHead(root)) ?? NO_BASELINE_REVISION;
  await mkdir(join(dir, 'proposed'), { recursive: true });
  await writeFile(
    join(dir, 'change.md'),
    `${scaffoldChangeDocument(id, titleFromName(name), revision)}\n`,
    'utf8',
  );
  return { name, dir, file: `${SPECKIT_PRODUCT_CHANGES}/${name}/change.md` };
}

export interface SpecKitProductValidation {
  change: LoadedChange;
  diagnostics: Diagnostic[];
  blocking: Diagnostic[];
}

export interface SpecKitProductRefinement {
  workingMemory?: string;
  rationale?: string;
  openQuestions?: string[];
  outOfScope?: string[];
  checkedArtifactIds?: string[];
  excludedArtifactIds?: string[];
}

export interface SpecKitProductImpact {
  schema: string;
  checked: string[];
  excluded: string[];
  impacts: Record<string, ImpactReport>;
}

const IMPACT_SCHEMA = 'product-definition-as-code/product-change-impact/v1alpha1';

function unique(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort(compareCodePoints);
}

function listOrNone(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : 'None.';
}

function replaceSection(body: string, heading: string, value: string): string {
  const marker = `## ${heading}`;
  const start = body.indexOf(marker);
  if (start === -1) throw new Error(`Product Change is missing the '${heading}' section.`);
  const contentStart = start + marker.length;
  const next = body.indexOf('\n## ', contentStart);
  const end = next === -1 ? body.length : next;
  return `${body.slice(0, contentStart)}\n\n${value.trim()}\n${body.slice(end)}`;
}

async function appendWorkingMemory(path: string, text: string): Promise<void> {
  const current = (await pathExists(path))
    ? await readFile(path, 'utf8')
    : '# Product Change working memory\n';
  await writeFile(path, `${current.trimEnd()}\n\n${text.trim()}\n`, 'utf8');
}

async function updateSections(
  change: LoadedChange,
  refinement: SpecKitProductRefinement,
): Promise<void> {
  let body = change.body;
  if (refinement.rationale !== undefined) {
    body = replaceSection(body, 'Rationale', refinement.rationale);
  }
  if (refinement.openQuestions !== undefined) {
    body = replaceSection(body, 'Open Questions', listOrNone(refinement.openQuestions));
  }
  if (refinement.outOfScope !== undefined) {
    body = replaceSection(body, 'Out of Scope', listOrNone(refinement.outOfScope));
  }
  if (body === change.body) return;
  const path = join(change.dir, 'change.md');
  await writeFile(path, (await readFile(path, 'utf8')).replace(change.body, body), 'utf8');
}

async function readImpact(path: string): Promise<SpecKitProductImpact | undefined> {
  if (!(await pathExists(path))) return undefined;
  return JSON.parse(await readFile(path, 'utf8')) as SpecKitProductImpact;
}

async function refreshImpact(
  root: string,
  change: LoadedChange,
  refinement: SpecKitProductRefinement,
): Promise<SpecKitProductImpact> {
  const path = join(change.dir, 'impact.json');
  const previous = await readImpact(path);
  const operationIds = [
    ...change.operations.add,
    ...change.operations.modify,
    ...change.operations.remove,
  ];
  const checked = unique([
    ...operationIds,
    ...(refinement.checkedArtifactIds ?? previous?.checked ?? []),
  ]);
  const excluded = unique(refinement.excludedArtifactIds ?? previous?.excluded ?? []);
  const { graph } = await validateBaseline(await openRepository(root));
  const impacts = Object.fromEntries(
    checked
      .filter((id) => graph.nodeById.has(id))
      .map((id) => [id, analyzeImpact(graph, id, { direction: 'both', depth: 2 })]),
  );
  const impact = { schema: IMPACT_SCHEMA, checked, excluded, impacts };
  await writeFile(path, `${stableJson(impact)}\n`, 'utf8');
  return impact;
}

export async function refineSpecKitProductChange(
  root: string,
  name: string,
  refinement: SpecKitProductRefinement = {},
): Promise<{ change: LoadedChange; proposal: string; impact: SpecKitProductImpact }> {
  const change = await loadSpecKitProductChange(root, name);
  const proposal = join(change.dir, 'proposal.md');
  if (refinement.workingMemory?.trim())
    await appendWorkingMemory(proposal, refinement.workingMemory);
  await updateSections(change, refinement);
  const impact = await refreshImpact(root, change, refinement);
  return { change: await loadSpecKitProductChange(root, name), proposal, impact };
}

async function liveChanges(root: string, repo: ProductRepository): Promise<LoadedChange[]> {
  const refs = await listSpecKitProductChanges(root);
  return loadLiveChanges(
    repo,
    refs.map((ref) => ref.dir),
  );
}

async function validate(root: string, name: string): Promise<SpecKitProductValidation> {
  const repo = await openRepository(root);
  const change = await loadSpecKitProductChange(root, name);
  const assessed = await assessHostedProductChange(repo, change, await liveChanges(root, repo));
  return { change, diagnostics: assessed.diagnostics, blocking: assessed.blocking };
}

export async function validateSpecKitProductChange(
  root: string,
  name: string,
): Promise<SpecKitProductValidation> {
  return validate(root, name);
}

export async function applySpecKitProductChange(
  root: string,
  name: string,
  options: { dryRun?: boolean } = {},
): Promise<HostedProductApplyResult> {
  const repo = await openRepository(root);
  const change = await loadSpecKitProductChange(root, name);
  return applyHostedProductChange({
    repo,
    change,
    liveChanges: await liveChanges(root, repo),
    dryRun: options.dryRun,
  });
}

export async function archiveSpecKitProductChange(root: string, name: string): Promise<string> {
  const change = await loadSpecKitProductChange(root, name);
  if (change.status !== 'applied')
    throw new Error(`Cannot archive '${name}': status must be 'applied'.`);
  const from = changeDir(root, name);
  const to = resolveInRepository(
    root,
    `${SPECKIT_PRODUCT_ARCHIVE}/${name}`,
    'the Spec Kit Product lane',
  );
  if (await pathExists(to))
    throw new Error(`Archive destination already exists: ${SPECKIT_PRODUCT_ARCHIVE}/${name}`);
  await mkdir(dirname(to), { recursive: true });
  await rename(from, to);
  return `${SPECKIT_PRODUCT_ARCHIVE}/${name}`;
}

export async function startSpecKitRecovery(
  root: string,
  sessionId: string,
  brief?: RecoveryBrief,
): Promise<LoadedRecoverySession> {
  const repo = adapterRepo(await openRepository(root));
  return startRecoverySession(repo, {
    sessionId,
    brief,
    cliVersion: 'speckit-adapter',
    changeDir: `${SPECKIT_RECOVERY_ROOT}/${sessionId}/product`,
  });
}

export async function startOrResumeSpecKitRecovery(
  root: string,
  sessionId: string,
  brief?: RecoveryBrief,
): Promise<LoadedRecoverySession> {
  const repo = adapterRepo(await openRepository(root));
  const dir = resolveInRepository(
    root,
    `${SPECKIT_RECOVERY_ROOT}/${sessionId}`,
    'the Spec Kit recovery session',
  );
  if (await pathExists(dir)) return loadRecoverySession(repo, sessionId);
  return startRecoverySession(repo, {
    sessionId,
    brief,
    cliVersion: 'speckit-adapter',
    changeDir: `${SPECKIT_RECOVERY_ROOT}/${sessionId}/product`,
  });
}

export interface SpecKitRecoveryFinding {
  source: string;
  classification?: FindingClassification;
  artifacts?: string[];
  question?: string;
  reason?: string;
  note?: string;
  complete?: boolean;
  exclude?: boolean;
  acceptChanged?: boolean;
}

export interface SpecKitRecoveryRoundInput {
  findings?: SpecKitRecoveryFinding[];
  retractions?: { source: string; last?: boolean; index?: number; all?: boolean }[];
  leads?: { description: string; source?: string; kind: 'repo' | 'external' | 'user' }[];
  questions?: {
    text: string;
    context?: string;
    options?: string[];
    recommendation?: string;
  }[];
  familyProbes?: { family: string; note: string }[];
}

export async function recordSpecKitRecoveryBatch(
  root: string,
  sessionId: string,
  input: SpecKitRecoveryRoundInput,
): Promise<LoadedRecoverySession> {
  const repo = adapterRepo(await openRepository(root));
  const session = await loadRecoverySession(repo, sessionId);
  for (const question of input.questions ?? []) await addQuestion(repo, session, question);
  for (const lead of input.leads ?? []) await addLead(repo, session, lead);
  for (const finding of input.findings ?? []) await markEvidence(repo, session, finding);
  for (const retraction of input.retractions ?? []) await unmarkEvidence(repo, session, retraction);
  for (const probe of input.familyProbes ?? [])
    await markFamilyProbe(repo, session, probe.family, probe.note);
  return session;
}

export async function writeSpecKitRecoveryCandidate(
  root: string,
  sessionId: string,
  relativePath: string,
  content: string,
): Promise<string> {
  const repo = adapterRepo(await openRepository(root));
  const session = await loadRecoverySession(repo, sessionId);
  if (!relativePath.toLowerCase().endsWith('.md'))
    throw new Error('Recovery candidates must be Markdown files.');
  const path = resolveInRepository(
    root,
    `${session.state.changeDir}/proposed/${relativePath}`,
    'the Spec Kit recovery candidate',
  );
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
  return `${session.state.changeDir}/proposed/${relativePath.replaceAll('\\', '/')}`;
}

export interface SpecKitRecoveryRoundResult {
  session: LoadedRecoverySession;
  batch: ReturnType<typeof nextBatch>;
  candidates: CandidateArtifact[];
  coverage: RecoveryCoverage;
  issues: RecoveryIssue[];
  outcome: 'insufficient-evidence' | 'needs-work' | 'ready-for-review';
  recommendation: string;
}

export async function completeSpecKitRecoveryRound(
  root: string,
  sessionId: string,
  limit?: number,
): Promise<SpecKitRecoveryRoundResult> {
  const repo = adapterRepo(await openRepository(root));
  const session = await loadRecoverySession(repo, sessionId);
  const checked = await checkRecoverySession(repo, session);
  const candidates = await scanCandidates(repo, session.state);
  const report = await writeRecoveryReport(repo, session);
  const batch = nextBatch(session, limit);
  const recommendation = checked.issues.some((item) => item.severity === 'error')
    ? 'Resolve the reported drift or validation errors before processing another batch.'
    : report.coverage.completion.complete
      ? 'Recovery is complete enough for human review of the CHG-INITIAL overlay.'
      : batch.length > 0
        ? `Process the next bounded batch of ${batch.length} evidence source(s).`
        : 'Record the remaining questions, leads, probes or candidate mappings, then re-check.';
  const outcome = checked.issues.some((item) => item.severity === 'error')
    ? 'needs-work'
    : report.coverage.completion.complete
      ? 'ready-for-review'
      : 'insufficient-evidence';
  return {
    session,
    batch,
    candidates,
    coverage: report.coverage,
    issues: checked.issues,
    outcome,
    recommendation,
  };
}

export async function nextSpecKitRecoveryBatch(
  root: string,
  session?: string,
  limit?: number,
): Promise<{ session: LoadedRecoverySession; batch: ReturnType<typeof nextBatch> }> {
  const repo = adapterRepo(await openRepository(root));
  const id = await resolveSessionId(repo, session);
  const loaded = await loadRecoverySession(repo, id);
  return { session: loaded, batch: nextBatch(loaded, limit) };
}
