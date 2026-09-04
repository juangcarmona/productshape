/** Spec Kit's PRODUCT lane.  This adapter owns only container paths and lifecycle moves. */
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  compareCodePoints,
  executeApply,
  gitHead,
  isNotFound,
  loadChange,
  openRepository,
  planHostedProductChange,
  preflightApply,
  validateBaseline,
  validateHostedProductChange,
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
  ApplyPlan,
  CandidateArtifact,
  FindingClassification,
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

export async function createSpecKitProductChange(
  root: string,
  name: string,
): Promise<SpecKitProductChangeRef> {
  await openRepository(root);
  const dir = changeDir(root, name);
  if (await pathExists(join(dir, 'change.md')))
    throw new Error(`Spec Kit Product Change '${name}' already exists.`);
  const revision = (await gitHead(root)) ?? '0000000';
  await mkdir(join(dir, 'proposed'), { recursive: true });
  await writeFile(
    join(dir, 'change.md'),
    `---\nid: CHG-${name.toUpperCase().replaceAll('-', '-')}-001\ntype: product-change\ntitle: ${name.replaceAll('-', ' ')}\nstatus: draft\nbase-revision: '${revision}'\noperations:\n  add: []\n  modify: []\n  remove: []\n---\n\n## Problem\n\nDescribe the product problem.\n\n## Intended Product Outcome\n\nDescribe the accepted outcome.\n\n## Rationale\n\nExplain why this change is needed.\n\n## Affected Product Areas\n\nName affected product areas.\n\n## Open Questions\n\nNone.\n\n## Product Acceptance\n\nDescribe how a human accepts the outcome.\n\n## Out of Scope\n\nRecord conscious exclusions.\n`,
    'utf8',
  );
  return { name, dir, file: `${SPECKIT_PRODUCT_CHANGES}/${name}/change.md` };
}

export interface SpecKitProductValidation {
  change: LoadedChange;
  diagnostics: ReturnType<typeof validateHostedProductChange>['diagnostics'];
  blocking: ReturnType<typeof validateHostedProductChange>['blocking'];
}

export interface SpecKitProductRefinement {
  workingMemory?: string;
  rationale?: string;
  openQuestions?: string[];
  outOfScope?: string[];
  checkedArtifactIds?: string[];
  excludedArtifactIds?: string[];
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

export async function refineSpecKitProductChange(
  root: string,
  name: string,
  refinement: SpecKitProductRefinement,
): Promise<{ change: LoadedChange; proposal: string; impact: unknown }> {
  const change = await loadSpecKitProductChange(root, name);
  const proposalPath = join(change.dir, 'proposal.md');
  const currentProposal = (await pathExists(proposalPath))
    ? await readFile(proposalPath, 'utf8')
    : '# Product Change working memory\n\n';
  const workingMemory = refinement.workingMemory?.trim();
  await writeFile(
    proposalPath,
    `${workingMemory !== undefined ? `${currentProposal.trimEnd()}\n\n${workingMemory}` : currentProposal.trimEnd()}\n`,
    'utf8',
  );

  let body = change.body;
  if (refinement.rationale !== undefined)
    body = replaceSection(body, 'Rationale', refinement.rationale);
  if (refinement.openQuestions !== undefined)
    body = replaceSection(
      body,
      'Open Questions',
      refinement.openQuestions.length > 0
        ? refinement.openQuestions.map((q) => `- ${q}`).join('\n')
        : 'None.',
    );
  if (refinement.outOfScope !== undefined)
    body = replaceSection(
      body,
      'Out of Scope',
      refinement.outOfScope.length > 0
        ? refinement.outOfScope.map((q) => `- ${q}`).join('\n')
        : 'None.',
    );
  if (body !== change.body) {
    const changePath = join(change.dir, 'change.md');
    const source = await readFile(changePath, 'utf8');
    await writeFile(changePath, source.replace(change.body, body), 'utf8');
  }

  const repo = await openRepository(root);
  const baseline = await validateBaseline(repo);
  const ids = [
    ...new Set([
      ...change.operations.add,
      ...change.operations.modify,
      ...change.operations.remove,
      ...(refinement.checkedArtifactIds ?? []),
    ]),
  ].sort(compareCodePoints);
  const impacts = Object.fromEntries(
    ids
      .filter((id) => baseline.graph.nodeById.has(id))
      .map((id) => [id, analyzeImpact(baseline.graph, id, { direction: 'both', depth: 2 })]),
  );
  const impact = {
    schema: 'product-definition-as-code/product-change-impact/v1alpha1',
    checked: [...new Set(refinement.checkedArtifactIds ?? ids)].sort(compareCodePoints),
    excluded: [...new Set(refinement.excludedArtifactIds ?? [])].sort(compareCodePoints),
    impacts,
  };
  await writeFile(join(change.dir, 'impact.json'), `${stableJson(impact)}\n`, 'utf8');
  return { change: await loadSpecKitProductChange(root, name), proposal: proposalPath, impact };
}

async function validate(root: string, name: string): Promise<SpecKitProductValidation> {
  const repo = await openRepository(root);
  const baseline = await validateBaseline(repo);
  const change = await loadSpecKitProductChange(root, name);
  const others: LoadedChange[] = [];
  for (const ref of await listSpecKitProductChanges(root))
    if (ref.name !== name) others.push(await loadChange(ref.dir, repo.root, repo.registry));
  const result = validateHostedProductChange(
    repo,
    baseline.artifacts,
    change,
    others,
    baseline.diagnostics,
  );
  const diagnostics = result.diagnostics;
  return {
    change,
    diagnostics,
    blocking: result.blocking,
  };
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
): Promise<{ outcome: 'applied' | 'dry-run' | 'refused'; plan: ApplyPlan; change: LoadedChange }> {
  const repo = await openRepository(root);
  const baseline = await validateBaseline(repo);
  const checked = await validate(root, name);
  const plan = await planHostedProductChange({
    repoRoot: root,
    modelRelative: repo.config.product.model,
    changesRelative: SPECKIT_PRODUCT_CHANGES,
    change: checked.change,
    baseline: baseline.artifacts,
    overlayErrors: checked.blocking,
  });
  if (plan.diagnostics.some((d) => d.severity === 'error'))
    return { outcome: 'refused', plan, change: checked.change };
  if (options.dryRun) {
    await preflightApply(root, plan);
    return { outcome: 'dry-run', plan, change: checked.change };
  }
  await executeApply(root, plan);
  return { outcome: 'applied', plan, change: checked.change };
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
