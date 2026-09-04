/** Spec Kit's PRODUCT lane.  This adapter owns only container paths and lifecycle moves. */
import { mkdir, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  blockingDiagnostics,
  compareCodePoints,
  dedupeDiagnostics,
  executeApply,
  gitHead,
  isNotFound,
  loadChange,
  openRepository,
  planApply,
  preflightApply,
  validateBaseline,
  validateChange,
  startRecoverySession,
  loadRecoverySession,
  resolveSessionId,
  nextBatch,
} from '@prodshape/core';
import type {
  ApplyPlan,
  LoadedChange,
  LoadedRecoverySession,
  ProductRepository,
  RecoveryBrief,
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
  diagnostics: ReturnType<typeof dedupeDiagnostics>;
  blocking: ReturnType<typeof blockingDiagnostics>;
}

async function validate(root: string, name: string): Promise<SpecKitProductValidation> {
  const repo = await openRepository(root);
  const baseline = await validateBaseline(repo);
  const change = await loadSpecKitProductChange(root, name);
  const others: LoadedChange[] = [];
  for (const ref of await listSpecKitProductChanges(root))
    if (ref.name !== name) others.push(await loadChange(ref.dir, repo.root, repo.registry));
  const result = validateChange(change, baseline.artifacts, others);
  const diagnostics = dedupeDiagnostics([
    ...repo.configDiagnostics,
    ...baseline.diagnostics,
    ...result.diagnostics,
  ]);
  return {
    change,
    diagnostics,
    blocking: blockingDiagnostics(diagnostics, repo.config.validation['warnings-as-errors']),
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
  const raw = await planApply({
    repoRoot: root,
    modelRelative: repo.config.product.model,
    changesRelative: SPECKIT_PRODUCT_CHANGES,
    change: checked.change,
    baseline: baseline.artifacts,
    overlayErrors: checked.blocking,
  });
  const plan = { ...raw, actions: raw.actions.filter((action) => action.kind !== 'move-change') };
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
