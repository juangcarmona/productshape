/**
 * The deterministic rails of the OpenSpec-hosted PDaC product workflow.
 *
 * An OpenSpec change created with the `product` schema hosts a PDaC Product Change at
 * `openspec/changes/<name>/product/` (change.md plus proposed/**, the normative delta format).
 * OpenSpec owns the workflow orchestration (`/opsx:new`, `/opsx:continue`, `/opsx:apply`,
 * `/opsx:archive`); this module owns what OpenSpec cannot provide: reading the accepted model,
 * compiling the semantic graph in memory, validating the hosted delta as an overlay on the
 * untouched baseline, applying a valid delta deterministically, and deriving fresh context for a
 * later delivery workflow.
 *
 * Two boundaries are deliberate:
 * - Validation is mandatory and happens AT APPLY TIME: `applyOpenSpecProductChange` performs its
 *   own full validation immediately before planning, so a stale earlier validate call can never
 *   authorise a write (no time-of-check to time-of-use gap). `validateOpenSpecProductChange`
 *   exists for explicit preflight, wrappers, diagnostics and tests; it is never a precondition
 *   token.
 * - Authorisation is policy, not mechanism: `status: approved` in the hosted change.md is the
 *   apply-authorised protocol state (PRODUCT028 refuses anything else), the transition into it
 *   belongs to the caller's policy (a human, a command, an agentic wrapper, an automated
 *   workflow), and nothing here performs or judges that transition.
 *
 * Everything deterministic comes from `@prodshape/core`. The one lifecycle divergence from the
 * native Product Change flow is the container: the hosted change directory belongs to OpenSpec,
 * so the plan's `move-change` action (ProductShape's `changes/active -> changes/completed`
 * archive move) is filtered out and `openspec archive` moves the container instead, as a separate
 * action after apply. `planApply`'s contract sanctions callers filtering the returned action set.
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  analyzeImpact,
  blockingDiagnostics,
  compareCodePoints,
  dedupeDiagnostics,
  discoverChanges,
  executeApply,
  loadChange,
  openRepository,
  planApply,
  preflightApply,
  sortDiagnostics,
  validateBaseline,
  validateChange,
} from '@prodshape/core';
import type {
  ApplyPlan,
  BaselineValidation,
  Diagnostic,
  ImpactReport,
  LoadedArtifact,
  LoadedChange,
  ProductGraph,
  ProductRepository,
} from '@prodshape/core';
import { pathExists } from './workspace.js';

/** The subdirectory of an OpenSpec change that hosts the PDaC Product Change delta. */
export const OPENSPEC_PRODUCT_SUBDIR = 'product';

/** The accepted product model, read directly from disk and validated, with its in-memory graph. */
export interface ProductModelInspection {
  repo: ProductRepository;
  artifacts: LoadedArtifact[];
  graph: ProductGraph;
  /** Configuration diagnostics plus full baseline validation, sorted. */
  diagnostics: Diagnostic[];
}

/**
 * Read the accepted model at the repository's product root (default docs/product), compile the
 * semantic graph in memory and validate. Needs no `.product/generated` output and no
 * configuration file: kernel defaults apply when `.product/config.yaml` is absent.
 */
export async function inspectProductModel(root: string): Promise<ProductModelInspection> {
  const repo = await openRepository(root);
  const baseline = await validateBaseline(repo);
  return {
    repo,
    artifacts: baseline.artifacts,
    graph: baseline.graph,
    diagnostics: sortDiagnostics([...repo.configDiagnostics, ...baseline.diagnostics]),
  };
}

/** One OpenSpec change hosting a PDaC Product Change delta. */
export interface OpenSpecProductChangeRef {
  /** The OpenSpec change name (the directory under openspec/changes/). */
  name: string;
  /** Absolute path of the hosted PDaC change directory (…/<name>/product). */
  dir: string;
  /** Repository-relative POSIX path of the hosted change.md. */
  file: string;
}

/**
 * List the OpenSpec changes that host a PDaC Product Change (a `product/change.md` inside the
 * change directory). The OpenSpec archive is history and is never listed; a change without a
 * product delta (for example one whose honest intent verdict was "no product delta") is not a
 * product change and is not listed either.
 */
export async function listOpenSpecProductChanges(
  root: string,
): Promise<OpenSpecProductChangeRef[]> {
  const changesDir = join(root, 'openspec', 'changes');
  let entries;
  try {
    entries = await readdir(changesDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const names = entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => entry.name)
    .sort(compareCodePoints);
  const refs: OpenSpecProductChangeRef[] = [];
  for (const name of names) {
    const dir = join(changesDir, name, OPENSPEC_PRODUCT_SUBDIR);
    if (await pathExists(join(dir, 'change.md'))) {
      refs.push({
        name,
        dir,
        file: `openspec/changes/${name}/${OPENSPEC_PRODUCT_SUBDIR}/change.md`,
      });
    }
  }
  return refs;
}

/** Load one hosted Product Change through core's loader (change.md plus proposed/**). */
export async function loadOpenSpecProductChange(
  root: string,
  changeName: string,
): Promise<LoadedChange> {
  const repo = await openRepository(root);
  return loadHostedChange(root, repo, changeName);
}

async function loadHostedChange(
  root: string,
  repo: ProductRepository,
  changeName: string,
): Promise<LoadedChange> {
  const refs = await listOpenSpecProductChanges(root);
  const ref = refs.find((candidate) => candidate.name === changeName);
  if (!ref) {
    const known = refs.map((candidate) => candidate.name).join(', ') || 'none';
    throw new Error(
      `No OpenSpec product change named '${changeName}' under openspec/changes/ (a product change hosts product/change.md; found: ${known}).`,
    );
  }
  return loadChange(ref.dir, repo.root, repo.registry);
}

/**
 * A hosted change in a terminal status is change history awaiting its container move: the native
 * lifecycle expresses that state by location (changes/completed, rejected, superseded), while the
 * hosted container keeps the directory in place until `openspec archive` moves it, so status is
 * the lifecycle carrier here.
 */
const TERMINAL_CHANGE_STATUSES = new Set(['applied', 'rejected', 'superseded']);

/**
 * Every live change the concurrency rule (PRODUCT025) must see: hosted OpenSpec product changes
 * that are not in a terminal status, plus every native change under `<changes>/active`.
 * Concurrency spans BOTH containers, so a hosted change and a native change touching the same
 * artifact report against each other; a terminal hosted change is inert exactly like the native
 * archives.
 */
async function loadAllLiveChanges(root: string, repo: ProductRepository): Promise<LoadedChange[]> {
  const changes: LoadedChange[] = [];
  for (const ref of await listOpenSpecProductChanges(root)) {
    const loaded = await loadChange(ref.dir, repo.root, repo.registry);
    if (loaded.status !== undefined && TERMINAL_CHANGE_STATUSES.has(loaded.status)) continue;
    changes.push(loaded);
  }
  for (const dir of await discoverChanges(join(repo.changesDir, 'active'))) {
    changes.push(await loadChange(dir, repo.root, repo.registry));
  }
  return changes;
}

/** The result of validating a hosted Product Change as an overlay on the untouched baseline. */
export interface OpenSpecProductChangeValidation {
  change: LoadedChange;
  baseline: BaselineValidation;
  overlayArtifacts: LoadedArtifact[];
  overlayGraph: ProductGraph;
  /** Configuration, baseline and change diagnostics, deduplicated and sorted. */
  diagnostics: Diagnostic[];
  /** The diagnostics that block, under the repository's warnings-as-errors policy. */
  blocking: Diagnostic[];
}

/**
 * Validate one hosted Product Change: the accepted baseline stays untouched, the delta is
 * compiled over it into an overlay, and the overlay is validated end to end (operation checks,
 * cross-container concurrency, open-questions state, full structural validation with the
 * PRODUCT023/PRODUCT024 overlay recodes). Useful as explicit preflight and for wrappers and
 * tests; apply never trusts it and revalidates on its own.
 */
export async function validateOpenSpecProductChange(
  root: string,
  changeName: string,
): Promise<OpenSpecProductChangeValidation> {
  const repo = await openRepository(root);
  const baseline = await validateBaseline(repo);
  const all = await loadAllLiveChanges(root, repo);
  // An unknown name resolves through the loader, whose error names the known product changes.
  const change =
    all.find((candidate) => hostedName(root, candidate) === changeName) ??
    (await loadHostedChange(root, repo, changeName));
  const validation = validateChange(change, baseline.artifacts, all);
  const diagnostics = sortDiagnostics(
    dedupeDiagnostics([
      ...repo.configDiagnostics,
      ...baseline.diagnostics,
      ...validation.diagnostics,
    ]),
  );
  return {
    change,
    baseline,
    overlayArtifacts: validation.overlayArtifacts,
    overlayGraph: validation.overlayGraph,
    diagnostics,
    blocking: blockingDiagnostics(diagnostics, repo.config.validation['warnings-as-errors']),
  };
}

/** The hosted OpenSpec change name of a loaded change, or undefined for a native change. */
function hostedName(root: string, change: LoadedChange): string | undefined {
  const normalizedRoot = root.replaceAll('\\', '/');
  const normalizedDir = change.dir.replaceAll('\\', '/');
  const relative = normalizedDir.startsWith(normalizedRoot)
    ? normalizedDir.slice(normalizedRoot.length).replace(/^\//, '')
    : normalizedDir;
  const match = relative.match(/^openspec\/changes\/([^/]+)\/product$/);
  return match?.[1];
}

/** How an apply invocation ended. */
export type OpenSpecProductApplyOutcome = 'applied' | 'dry-run' | 'refused';

export interface OpenSpecProductApplyResult {
  outcome: OpenSpecProductApplyOutcome;
  /**
   * The executed (or refused) plan. The ProductShape lifecycle's `move-change` action is already
   * filtered out: the hosted change directory belongs to OpenSpec and only `openspec archive`
   * moves it, as a separate action after apply.
   */
  plan: ApplyPlan;
  change: LoadedChange;
  /** Fresh read and validation of the accepted model after a real apply. */
  resultingModel?: BaselineValidation;
}

/**
 * Apply one hosted Product Change to the accepted model, deterministically and fail closed.
 *
 * The sequence mirrors the native apply: full revalidation of the overlay at apply time, the
 * apply-authorised state gate (PRODUCT028; the integration never performs the authorising
 * transition), base-revision drift by content digest (PRODUCT027), write and delete actions named
 * by lowercase id, the product diff computed from the result, and the hosted change.md status
 * flipped to applied in place. Any blocking diagnostic refuses with `docs/product/model`
 * untouched. A dry run still preflights every action. Nothing is committed and nothing is
 * archived: verification and the container move remain separate, later actions.
 */
export async function applyOpenSpecProductChange(
  root: string,
  changeName: string,
  options: { dryRun?: boolean } = {},
): Promise<OpenSpecProductApplyResult> {
  const { dryRun = false } = options;
  const repo = await openRepository(root);
  const baseline = await validateBaseline(repo);
  const all = await loadAllLiveChanges(root, repo);
  const change =
    all.find((candidate) => hostedName(root, candidate) === changeName) ??
    (await loadHostedChange(root, repo, changeName));

  const validation = validateChange(change, baseline.artifacts, all);
  const overlayErrors = blockingDiagnostics(
    sortDiagnostics(dedupeDiagnostics([...repo.configDiagnostics, ...validation.diagnostics])),
    repo.config.validation['warnings-as-errors'],
  );

  const rawPlan = await planApply({
    repoRoot: repo.root,
    modelRelative: repo.config.product.model,
    changesRelative: repo.config.product.changes,
    change,
    baseline: baseline.artifacts,
    overlayErrors,
  });
  const plan: ApplyPlan = {
    ...rawPlan,
    actions: rawPlan.actions.filter((action) => action.kind !== 'move-change'),
  };

  if (plan.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    return { outcome: 'refused', plan, change };
  }
  if (dryRun) {
    await preflightApply(repo.root, plan);
    return { outcome: 'dry-run', plan, change };
  }
  await executeApply(repo.root, plan);
  const resultingModel = await validateBaseline(repo);
  return { outcome: 'applied', plan, change, resultingModel };
}

/** One artifact carried into delivery context, with the digest of its current accepted content. */
export interface DeliveryContextEntry {
  id: string;
  type?: string;
  title?: string;
  status?: string;
  file: string;
  digest: string;
}

/** Context derived from a fresh read of the accepted model, for a later delivery workflow. */
export interface DeliveryContextBundle {
  ids: string[];
  /** The requested artifacts, from the freshly read accepted model. */
  artifacts: DeliveryContextEntry[];
  /** Impact around each requested artifact (direction both, depth 2). */
  impacts: Record<string, ImpactReport>;
  /** Direct neighbours of the requested artifacts, deduplicated, requested ids excluded. */
  neighbours: DeliveryContextEntry[];
  /** Whether the freshly read accepted model validates with zero errors. */
  modelErrorFree: boolean;
}

/**
 * Derive delivery context from the accepted model as it exists on disk NOW: a fresh read and a
 * fresh graph, never state carried over from a product workflow. This is the handoff boundary a
 * future delivery workflow starts from.
 */
export async function deriveDeliveryContext(
  root: string,
  ids: string[],
): Promise<DeliveryContextBundle> {
  const inspection = await inspectProductModel(root);
  const byId = new Map(
    inspection.artifacts
      .filter((artifact) => artifact.id !== undefined)
      .map((artifact) => [artifact.id as string, artifact]),
  );
  const entryOf = (artifact: LoadedArtifact): DeliveryContextEntry => {
    const entry: DeliveryContextEntry = {
      id: artifact.id as string,
      file: artifact.file,
      digest: artifact.digest,
    };
    if (artifact.type !== undefined) entry.type = artifact.type;
    if (artifact.title !== undefined) entry.title = artifact.title;
    if (artifact.status !== undefined) entry.status = artifact.status;
    return entry;
  };

  const sortedIds = [...ids].sort(compareCodePoints);
  const artifacts: DeliveryContextEntry[] = [];
  const impacts: Record<string, ImpactReport> = {};
  const neighbourIds = new Set<string>();
  for (const id of sortedIds) {
    const artifact = byId.get(id);
    if (!artifact) {
      throw new Error(`Unknown artifact id '${id}' in the accepted model at ${root}.`);
    }
    artifacts.push(entryOf(artifact));
    const report = analyzeImpact(inspection.graph, id, { direction: 'both', depth: 2 });
    impacts[id] = report;
    for (const item of report.direct) neighbourIds.add(item.id);
  }
  for (const id of sortedIds) neighbourIds.delete(id);
  const neighbours = [...neighbourIds]
    .sort(compareCodePoints)
    .map((id) => byId.get(id))
    .filter((artifact): artifact is LoadedArtifact => artifact !== undefined)
    .map(entryOf);

  return {
    ids: sortedIds,
    artifacts,
    impacts,
    neighbours,
    modelErrorFree: inspection.diagnostics.every((diagnostic) => diagnostic.severity !== 'error'),
  };
}
