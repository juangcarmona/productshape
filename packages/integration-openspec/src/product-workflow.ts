/**
 * The deterministic rails of the OpenSpec-hosted PDaC product workflow.
 *
 * An OpenSpec change created with the `product-change` schema hosts a PDaC Product Change at
 * `openspec/changes/<name>/product-change/` (change.md plus proposed/**, the normative delta format).
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
 * - Authorisation policy stays outside this deterministic mechanism: `status: approved` in the
 *   hosted change.md is the apply-authorised protocol state (PRODUCT028 refuses anything else).
 *   ProductShape's accepted policy keeps product approval human; this rail verifies the recorded
 *   state but cannot identify or judge the actor, and nothing here performs the transition.
 *
 * Everything deterministic comes from `@prodshape/core`. The one lifecycle divergence from the
 * native Product Change flow is the container: the hosted change directory belongs to OpenSpec,
 * so the plan's `move-change` action (ProductShape's `changes/active -> changes/completed`
 * archive move) is filtered out and `openspec archive` moves the container instead, as a separate
 * action after apply. `planApply`'s contract sanctions callers filtering the returned action set.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import {
  analyzeImpact,
  applyHostedProductChange,
  assessHostedProductChange,
  compareCodePoints,
  isNotFound,
  loadChange,
  loadLiveChanges,
  openRepository,
  sortDiagnostics,
  validateBaseline,
} from '@prodshape/core';
import type {
  BaselineValidation,
  Diagnostic,
  HostedProductApplyOutcome,
  HostedProductApplyResult,
  ImpactReport,
  LoadedArtifact,
  LoadedChange,
  ProductGraph,
  ProductRepository,
} from '@prodshape/core';
import { OPENSPEC_PRODUCT_CHANGE_SCHEMA_NAME } from './product-change-schema.js';
import { pathExists } from './workspace.js';

/** The subdirectory of an OpenSpec change that hosts the PDaC Product Change delta. */
export const OPENSPEC_PRODUCT_SUBDIR = 'product-change';

/** OpenSpec 1.11's change-id grammar (`isKebabId`): one folder-safe path segment. */
const OPENSPEC_CHANGE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function assertOpenSpecChangeName(changeName: string): void {
  if (changeName.length > 200 || !OPENSPEC_CHANGE_NAME.test(changeName)) {
    throw new Error(
      `OpenSpec change '${changeName}' is not a valid OpenSpec change name; use kebab-case with lowercase letters, numbers and single hyphen separators.`,
    );
  }
}

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
  /** Absolute path of the hosted PDaC change directory (…/<name>/product-change). */
  dir: string;
  /** Repository-relative POSIX path of the hosted change.md. */
  file: string;
}

/** The result of reading a change's `.openspec.yaml` schema pin. */
type HostedSchemaPin =
  { schema: string } | { problem: 'missing' } | { problem: 'malformed'; detail: string };

const OPEN_SPEC_KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** Validate the OpenSpec 1.11 ChangeMetadataSchema fields without taking a runtime dependency. */
function openSpecChangeMetadataProblem(parsed: unknown): string | undefined {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return 'the document must be an object';
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record['schema'] !== 'string' || record['schema'].length === 0) {
    return 'schema is required';
  }
  const created = record['created'];
  if (
    created !== undefined &&
    (typeof created !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(created))
  ) {
    return 'created must be YYYY-MM-DD format';
  }
  const goal = record['goal'];
  if (goal !== undefined && (typeof goal !== 'string' || goal.length === 0)) {
    return 'goal must be a non-empty string';
  }
  const affectedAreas = record['affected_areas'];
  if (
    affectedAreas !== undefined &&
    (!Array.isArray(affectedAreas) ||
      !affectedAreas.every((area) => typeof area === 'string' && area.length > 0))
  ) {
    return 'affected_areas must be an array of non-empty strings';
  }
  const initiative = record['initiative'];
  if (initiative !== undefined) {
    if (initiative === null || typeof initiative !== 'object' || Array.isArray(initiative)) {
      return 'initiative must be an object';
    }
    const link = initiative as Record<string, unknown>;
    if (
      Object.keys(link).some((key) => key !== 'store' && key !== 'id') ||
      typeof link['store'] !== 'string' ||
      !OPEN_SPEC_KEBAB_ID.test(link['store']) ||
      typeof link['id'] !== 'string' ||
      !OPEN_SPEC_KEBAB_ID.test(link['id'])
    ) {
      return 'initiative must contain only kebab-case store and id fields';
    }
  }
  if (record['skip_specs'] !== undefined && typeof record['skip_specs'] !== 'boolean') {
    return 'skip_specs must be a boolean';
  }
  if (
    record['retire_capabilities'] !== undefined &&
    typeof record['retire_capabilities'] !== 'boolean'
  ) {
    return 'retire_capabilities must be a boolean';
  }
  return undefined;
}

/**
 * Read the schema a change is pinned to. OpenSpec records it in the change's `.openspec.yaml`
 * (`openspec new change <name> --schema product-change` writes it), and the hosted product rail treats
 * that pin as load-bearing: OpenSpec selects the workflow, so a change is a product change
 * because its container says so, never because a `product/` directory happens to exist.
 */
async function readHostedSchemaPin(changeDir: string): Promise<HostedSchemaPin> {
  const metadataPath = join(changeDir, '.openspec.yaml');
  if (!(await pathExists(metadataPath))) return { problem: 'missing' };
  let parsed: unknown;
  try {
    parsed = parse(await readFile(metadataPath, 'utf8'));
  } catch (error) {
    return {
      problem: 'malformed',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  const problem = openSpecChangeMetadataProblem(parsed);
  if (problem !== undefined) return { problem: 'malformed', detail: problem };
  return { schema: (parsed as Record<string, string>)['schema']! };
}

function hostedSchemaPinError(
  changeName: string,
  pin: Exclude<HostedSchemaPin, { schema: string }>,
): Error {
  if (pin.problem === 'missing') {
    return new Error(
      `OpenSpec change '${changeName}' has no .openspec.yaml, so its schema pin is unknown; the hosted product rail refuses it. Create product changes with: openspec new change ${changeName} --schema ${OPENSPEC_PRODUCT_CHANGE_SCHEMA_NAME}.`,
    );
  }
  return new Error(
    `OpenSpec change '${changeName}' has an unreadable .openspec.yaml (${pin.detail}); the hosted product rail refuses it until the metadata is valid under OpenSpec 1.11.`,
  );
}

/**
 * List the OpenSpec changes that host a PDaC Product Change: pinned to `schema: product-change` in
 * `.openspec.yaml` AND carrying `product-change/change.md`. The OpenSpec archive is history and is never
 * listed; a change without a product delta (for example one whose honest intent verdict was "no
 * product delta") is not a product change; and a change pinned to another schema is not one
 * either, whatever directories it contains, so it never enters the product rail or its
 * concurrency input.
 */
export async function listOpenSpecProductChanges(
  root: string,
): Promise<OpenSpecProductChangeRef[]> {
  const changesDir = join(root, 'openspec', 'changes');
  let entries;
  try {
    entries = await readdir(changesDir, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
  const names = entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => entry.name)
    .sort(compareCodePoints);
  const refs: OpenSpecProductChangeRef[] = [];
  for (const name of names) {
    const changeDir = join(changesDir, name);
    const dir = join(changeDir, OPENSPEC_PRODUCT_SUBDIR);
    if (!(await pathExists(join(dir, 'change.md')))) continue;
    assertOpenSpecChangeName(name);
    const pin = await readHostedSchemaPin(changeDir);
    if ('problem' in pin) throw hostedSchemaPinError(name, pin);
    if (pin.schema !== OPENSPEC_PRODUCT_CHANGE_SCHEMA_NAME) continue;
    refs.push({
      name,
      dir,
      file: `openspec/changes/${name}/${OPENSPEC_PRODUCT_SUBDIR}/change.md`,
    });
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
  assertOpenSpecChangeName(changeName);
  const changesDir = join(root, 'openspec', 'changes');
  const changeDir = join(changesDir, changeName);
  const deltaDir = join(changeDir, OPENSPEC_PRODUCT_SUBDIR);
  const hasDelta =
    changeName !== 'archive' &&
    (await pathExists(changeDir)) &&
    (await pathExists(join(deltaDir, 'change.md')));
  if (!hasDelta) {
    const refs = await listOpenSpecProductChanges(root);
    const known = refs.map((candidate) => candidate.name).join(', ') || 'none';
    throw new Error(
      `No OpenSpec product change named '${changeName}' under openspec/changes/ (a product change hosts product-change/change.md; found: ${known}).`,
    );
  }
  // The schema pin is load-bearing and fails closed: without a readable pin naming the product
  // schema, this change never enters the product rail, however product-shaped its contents look.
  const pin = await readHostedSchemaPin(changeDir);
  if ('problem' in pin) {
    throw hostedSchemaPinError(changeName, pin);
  }
  if (pin.schema !== OPENSPEC_PRODUCT_CHANGE_SCHEMA_NAME) {
    throw new Error(
      `OpenSpec change '${changeName}' is pinned to schema '${pin.schema}', not '${OPENSPEC_PRODUCT_CHANGE_SCHEMA_NAME}'; the hosted product rail refuses it. Product intent travels through a change created with: openspec new change <name> --schema ${OPENSPEC_PRODUCT_CHANGE_SCHEMA_NAME}.`,
    );
  }
  return loadChange(deltaDir, repo.root, repo.registry);
}

async function loadAllLiveChanges(root: string, repo: ProductRepository): Promise<LoadedChange[]> {
  const refs = await listOpenSpecProductChanges(root);
  return loadLiveChanges(
    repo,
    refs.map((ref) => ref.dir),
  );
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
  const all = await loadAllLiveChanges(root, repo);
  // An unknown name resolves through the loader, whose error names the known product changes.
  const change =
    all.find((candidate) => hostedName(root, candidate) === changeName) ??
    (await loadHostedChange(root, repo, changeName));
  const assessed = await assessHostedProductChange(repo, change, all);
  return {
    change,
    baseline: assessed.baseline,
    overlayArtifacts: assessed.overlayArtifacts,
    overlayGraph: assessed.overlayGraph,
    diagnostics: assessed.diagnostics,
    blocking: assessed.blocking,
  };
}

/** The hosted OpenSpec change name of a loaded change, or undefined for a native change. */
function hostedName(root: string, change: LoadedChange): string | undefined {
  const normalizedRoot = root.replaceAll('\\', '/');
  const normalizedDir = change.dir.replaceAll('\\', '/');
  const relative = normalizedDir.startsWith(normalizedRoot)
    ? normalizedDir.slice(normalizedRoot.length).replace(/^\//, '')
    : normalizedDir;
  const match = relative.match(/^openspec\/changes\/([^/]+)\/product-change$/);
  return match?.[1];
}

/** How an apply invocation ended. */
export type OpenSpecProductApplyOutcome = HostedProductApplyOutcome;

/** The container move is `openspec archive`, never part of apply. */
export type OpenSpecProductApplyResult = HostedProductApplyResult;

export async function applyOpenSpecProductChange(
  root: string,
  changeName: string,
  options: { dryRun?: boolean } = {},
): Promise<OpenSpecProductApplyResult> {
  const repo = await openRepository(root);
  const all = await loadAllLiveChanges(root, repo);
  const change =
    all.find((candidate) => hostedName(root, candidate) === changeName) ??
    (await loadHostedChange(root, repo, changeName));
  return applyHostedProductChange({
    repo,
    change,
    liveChanges: all,
    dryRun: options.dryRun ?? false,
    excludeDocumentsUnder: [`openspec/changes/${changeName}`, 'openspec/changes/archive'],
  });
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
