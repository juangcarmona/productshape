/**
 * OpenSpec integration for Product Definition as Code, in two lanes.
 *
 * The citation lane configures OpenSpec's spec-driven delivery workflow: PDaC citation rules are
 * merged into `openspec/config.yaml`, metadata is recorded under `.product/integrations/`, and
 * consumer documents cite canonical product artifacts by id + digest for
 * `prodshape citations verify` to check.
 *
 * The product lane hosts the PDaC product workflow inside OpenSpec: the integration installs a
 * project-local `product-change` schema at `openspec/schemas/product-change/`, OpenSpec's official project
 * extension surface, whose changes host a Product Change delta that `product-workflow.ts`
 * validates as an overlay and applies deterministically.
 *
 * Both lanes write only official OpenSpec surfaces plus ProductShape's own integration metadata.
 * The integration never patches OpenSpec-generated commands or skills, never modifies OpenSpec's
 * built-in schemas, and never writes into a native spec-driven change's documents.
 *
 * The merge logic is the heart of the citation lane: it preserves every field the user authored
 * (schema, context, rules, operations, githubCopilot, and anything else) and only appends PDaC
 * guidance, deduplicating identical entries so the operation is idempotent.
 */
import { mkdir, readdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  contentDigest,
  isNotFound,
  isRepositoryRelativePath,
  resolveInRepository,
} from '@prodshape/core';
import { parse, stringify } from 'yaml';
import {
  loadProductChangeSchemaAssets,
  OPENSPEC_PRODUCT_CHANGE_SCHEMA_NAME,
  OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE,
  PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC,
  loadProductRecoverySchemaAssets,
  OPENSPEC_PRODUCT_RECOVERY_SCHEMA_NAME,
  OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE,
} from './product-change-schema.js';
import { runCommand } from './process.js';
import { envWithLocalBin, isOpenSpecWorkspace, pathExists } from './workspace.js';

export { isOpenSpecWorkspace } from './workspace.js';
export {
  enumerateOpenSpecDocuments,
  isOpenSpecCliAvailable,
  openSpecProvider,
} from './population.js';
export {
  loadProductChangeSchemaAssets,
  OPENSPEC_PRODUCT_CHANGE_SCHEMA_NAME,
  OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE,
  PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC,
  loadProductRecoverySchemaAssets,
  OPENSPEC_PRODUCT_RECOVERY_SCHEMA_NAME,
  OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE,
} from './product-change-schema.js';
export type { ProductChangeSchemaAsset } from './product-change-schema.js';
export {
  applyOpenSpecProductChange,
  deriveDeliveryContext,
  inspectProductModel,
  listOpenSpecProductChanges,
  loadOpenSpecProductChange,
  OPENSPEC_PRODUCT_SUBDIR,
  validateOpenSpecProductChange,
} from './product-workflow.js';
export type {
  DeliveryContextBundle,
  DeliveryContextEntry,
  OpenSpecProductApplyOutcome,
  OpenSpecProductApplyResult,
  OpenSpecProductChangeRef,
  OpenSpecProductChangeValidation,
  ProductModelInspection,
} from './product-workflow.js';

/** The minimum supported OpenSpec CLI version. */
export const MIN_SUPPORTED_OPENSPEC = '1.0.0';

/**
 * The npm spec used when bootstrapping OpenSpec through npx. Pinned to the supported major:
 * MIN_SUPPORTED_OPENSPEC guards the floor, the pin guards the ceiling, so a future OpenSpec 2.x
 * cannot silently change what `init --tools none` does for new adopters.
 */
export const OPENSPEC_NPX_SPEC = '@fission-ai/openspec@1';

/**
 * Sentinel markers that bracket the PDaC-injected context block. They let `mergeConfig` find
 * and replace exactly the PDaC portion without touching user-authored context lines.
 */
const PDAC_CONTEXT_BEGIN = '<!-- pdac:context begin -->';
const PDAC_CONTEXT_END = '<!-- pdac:context end -->';

/** The PDaC authority context block injected into openspec/config.yaml `context:`. */
export const PDAC_CONTEXT_BLOCK = `${PDAC_CONTEXT_BEGIN}
This repository uses Product Definition as Code (PDaC). The canonical product definition lives in docs/product/model (actors, journeys, use cases, business rules, domain terms, bounded contexts, structured behaviours, and functional, quality and constraint requirements). OpenSpec artifacts consume it and are never a second source of truth.
A citation binds consumer text to a canonical artifact: it records the artifact id, a sha256 content digest and an optional verification scenario anchor. Verification reports one status per citation: current, stale, tampered or unresolved.
To cite: run \`npx prodshape inspect <ID>\` to read the current digest, then \`npx prodshape cite --id <ID> --digest <digest>\` to emit the canonical payload. Wrap it in the document's native comment (\`<!-- ... -->\` in Markdown) on its own line directly under the text it grounds.
To find which artifacts a change impacts, compare the change's intent with the whole product definition first, then widen the result with \`npx prodshape impact <ID>\`. When the intent contradicts or goes beyond the definition, record that drift in the proposal with the marker \`<!-- pdac-drift ids="..." summary="..." -->\` (listed by \`npx prodshape drift\`) and let humans decide — never fix it quietly.
Every current OpenSpec document (proposal, specs, design, tasks and openspec/specs/) carries exactly one explicit scope declaration: \`pdac-scope: cited\` for a bound document that carries at least one citation, or \`pdac-scope: none\` with a non-empty human-authored reason (\`pdac-scope-reason: <why>\` in frontmatter, or \`<!-- pdac-scope: none reason=\"<why>\" -->\`) for an exempt one. Citations alone never bind: a document without a declaration is unclassified and fails verification, a bound document with zero citations fails, and an exemption without a reason or contradicted by citations fails. Binding and exemption are human declarations: never declare an exemption merely because citations are missing. Verify with \`npx prodshape citations verify --provider openspec\`: it enumerates the expected current documents, so zero discovered citations is a set of failures, never a pass. Archived changes are excluded by default; \`--include-archived\` also verifies the citations history carries, reported as warnings, because archived history cannot be edited.
The accepted Product Definition changes only through a Product Change: validate it as an overlay while the baseline stays untouched, obtain human product approval (represented by status: approved; the integration verifies the state but cannot identify or judge the actor), apply explicitly on a working branch, and let a human accept the resulting baseline by merging its pull request. A Product Change is not a pull request; apply is not acceptance; neither apply nor merge attests implementation, verification, release or deployment. A Product Change lives under docs/product/changes/ or hosted inside a valid OpenSpec change created with the product schema (product-change/change.md plus product-change/proposed/**); its deterministically validated, apply-authorised apply is the only write path into docs/product/model. A spec-driven OpenSpec delivery change never edits docs/product/model directly: it may share a pull request with an applied Product Change or follow later, but it never supplies Product Change status.
${PDAC_CONTEXT_END}`;

/** The PDaC citation rules injected per artifact into openspec/config.yaml `rules:`. */
export const PDAC_RULES: Record<string, string[]> = {
  proposal: [
    'State which PDaC artifacts this change touches, each with a citation payload emitted by `npx prodshape cite --id <ID> --digest <digest>` and wrapped in the document native comment (`<!-- ... -->` in Markdown). Never write a citation record by hand.',
    'Find the impacted artifacts as a separate step, before writing any proposal content. Read the whole product definition (docs/product/model by default), compare it with what this change wants — the backlog item behind it, if there is one — and list every artifact the change depends on, alters or contradicts. Then widen the list: run `npx prodshape impact <ID>` on each artifact you found and check its direct and indirect neighbours. Put the resulting list in the proposal, cite every impacted artifact from each document that uses it (proposal, specs, design, tasks), and name any neighbour you checked and left out.',
    'If this change\'s goals contradict the product definition, or need behaviour it does not describe, that is product-definition drift. Record it in the proposal under a \'Product definition drift\' note naming the artifacts involved, with the marker `<!-- pdac-drift ids="<ID>[, <ID>...]" summary="<one line>" -->` on its own line so `npx prodshape drift` can list it. The decision is human: the developer and the product owner agree whether to propose a Product Change or adjust this change. Never fix drift quietly, drop or weaken a citation to hide it, or write around the conflict.',
    'If the change implements altered product behaviour, name the Product Change (CHG id) whose applied or accepted artifacts it implements. If no overlay-validated, apply-authorised Product Change exists yet, stop and ask for one instead of proceeding. A spec-driven OpenSpec change is not the Product Change; product intent travels through a Product Change, under docs/product/changes or hosted by a product-change OpenSpec change.',
    'Every document of this change must end up bound or exempt, each with an explicit declaration: declare `pdac-scope: cited` on a line of its own and cite the canonical text the document depends on, or declare `pdac-scope: none` with a non-empty reason (`pdac-scope-reason: <why>` in frontmatter, or `<!-- pdac-scope: none reason="<why>" -->`) when a human judges the document has no product-semantic dependency. Citations alone never bind, and never declare an exemption just because citations are missing.',
  ],
  specs: [
    'Every requirement derived from canonical product text MUST carry a citation to every PDaC artifact it derives from — not only the closest one — one citation per line, placed after the requirement text and before the first scenario. Never place citations between the requirement heading and the requirement text; OpenSpec reads the first paragraph as the requirement.',
    'Cite a specific verification scenario with an anchor when the requirement maps to one (anchor="<scenario id>").',
    'Never paraphrase canonical text as if it were new; either cite it inline or embed it in a marker-block citation (<!-- pdac:cite ... --> canonical text <!-- /pdac:cite -->).',
    'Never invent artifact ids or digests. Read them with `npx prodshape inspect <ID>`.',
  ],
  design: [
    'When a design decision depends on canonical product text, cite the artifact it depends on.',
  ],
  tasks: [
    'A task that changes cited behaviour must include a follow-up task to refresh the affected citations.',
    'Never infer implementation, verification, release or deployment from Product Change status; record that evidence in the delivery workflow.',
  ],
};

/** The PDaC operation guidance injected into openspec/config.yaml `operations:`. */
export const PDAC_OPERATIONS: {
  apply: { guidance: string[] };
  archive: { guidance: string[] };
} = {
  apply: {
    guidance: [
      'Before finishing, run `npx prodshape citations verify --provider openspec` and fix every stale, tampered or unresolved citation, every unclassified document, every bound document without citations and every exemption without a reason. Refresh a stale digest by re-running `npx prodshape inspect <ID>`; never delete a citation or declare `pdac-scope: none` to silence a diagnostic.',
    ],
  },
  archive: {
    guidance: [
      'Run `npx prodshape citations verify --provider openspec` one final time. Archive only when every document is bound or exempt and every citation is current.',
    ],
  },
};

/**
 * The exact strings PDaC injected into openspec/config.yaml, recorded so a later update can
 * remove entries whose wording has since changed instead of appending duplicates alongside them.
 * The context block needs no record: its sentinels already identify it in place.
 */
export interface ManagedStrings {
  rules: Record<string, string[]>;
  operations: Record<string, string[]>;
}

/** The managed strings the current PDaC guidance injects. */
export function currentManagedStrings(): ManagedStrings {
  return {
    rules: Object.fromEntries(Object.entries(PDAC_RULES).map(([key, list]) => [key, [...list]])),
    operations: Object.fromEntries(
      Object.entries(PDAC_OPERATIONS).map(([key, op]) => [key, [...op.guidance]]),
    ),
  };
}

/** Metadata recorded under .product/integrations/openspec.json. */
export interface OpenSpecIntegrationMeta {
  provider: 'openspec';
  version: string;
  openspecVersion: string;
  /**
   * When the integration was first installed. Preserved across every later add, update and no-op:
   * an install date that moves on each invocation records nothing, and rewriting it made every
   * no-op command dirty the working tree.
   */
  installedAt: string;
  /**
   * When managed content last actually changed. Absent until the first change after installation;
   * written only when the merged configuration or the CI example differed, so a no-op leaves this
   * file byte-identical. It answers the question `installedAt` cannot: whether this installation
   * has been regenerated since a ProductShape upgrade.
   */
  updatedAt?: string;
  configPath: string;
  /** Absent in metadata written before the CI example existed; `integration update` adds it. */
  ciExamplePath?: string;
  /** Absent in metadata written before the field existed; treated as the current guidance. */
  managed?: ManagedStrings;
  /**
   * The installed OpenSpec product schema: its name, the OpenSpec floor the product workflow
   * needs, and every managed file it consists of, each with the content digest it was installed
   * at. The per-file record and digest are the ownership proof (ADR 0008): update replaces and
   * remove deletes a file only when that exact path was recorded and its bytes still match the
   * recorded digest (legacy path-only records additionally require the current asset bytes). A
   * diverged or unrecorded file is preserved and reported, never overwritten or deleted. Absent in metadata written before the
   * schema existed; `integration update` installs the schema and adds the record. Metadata
   * written by earlier spike revisions carried a plain path array; it is read as paths with no
   * recorded digest, so ownership then rests on matching the current assets.
   */
  productSchema?: { name: string; requiresOpenspec: string; files: Record<string, string> };
  recoverySchema?: { name: string; requiresOpenspec: string; files: Record<string, string> };
}

/** The pre-#227 schema location accepted only for safe, ownership-proven migration. */
const LEGACY_OPENSPEC_PRODUCT_SCHEMA_NAME = 'product';
const LEGACY_OPENSPEC_PRODUCT_SCHEMA_RELATIVE = 'openspec/schemas/product';

/** The recorded product-schema files as path-to-digest, tolerating the earlier array shape. */
function recordedProductSchemaFiles(
  meta: OpenSpecIntegrationMeta | null,
): Record<string, string> | undefined {
  const record = meta?.productSchema;
  if (!record) return undefined;
  if (
    typeof record !== 'object' ||
    record === null ||
    (record.name !== OPENSPEC_PRODUCT_CHANGE_SCHEMA_NAME &&
      record.name !== LEGACY_OPENSPEC_PRODUCT_SCHEMA_NAME &&
      record.name !== OPENSPEC_PRODUCT_RECOVERY_SCHEMA_NAME) ||
    typeof record.requiresOpenspec !== 'string'
  ) {
    throw new Error(
      "'productSchema' must name the product schema and carry a string 'requiresOpenspec'",
    );
  }
  const files = record.files as unknown;
  const validatePath = (file: unknown): file is string =>
    typeof file === 'string' &&
    (file.startsWith(`${OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE}/`) ||
      file.startsWith(`${LEGACY_OPENSPEC_PRODUCT_SCHEMA_RELATIVE}/`) ||
      file.startsWith(`${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}/`)) &&
    isRepositoryRelativePath(file);
  if (Array.isArray(files)) {
    if (!files.every(validatePath)) {
      throw new Error(
        `'productSchema.files' contains a path outside the managed OpenSpec schema locations`,
      );
    }
    return Object.fromEntries(files.map((file) => [file, '']));
  }
  if (files !== null && typeof files === 'object') {
    const entries = Object.entries(files as Record<string, unknown>);
    if (!entries.every(([file]) => validatePath(file))) {
      throw new Error(
        `'productSchema.files' contains a path outside the managed OpenSpec schema locations`,
      );
    }
    if (
      !entries.every(
        ([, digest]) => typeof digest === 'string' && /^sha256:[0-9a-f]{64}$/.test(digest),
      )
    ) {
      throw new Error("'productSchema.files' contains an invalid content digest");
    }
    return Object.fromEntries(entries as [string, string][]);
  }
  throw new Error("'productSchema.files' must be a path-to-digest object or legacy path array");
}

function recordedRecoverySchemaFiles(
  meta: OpenSpecIntegrationMeta | null,
): Record<string, string> | undefined {
  const record = meta?.recoverySchema;
  if (!record) return undefined;
  if (record.name !== OPENSPEC_PRODUCT_RECOVERY_SCHEMA_NAME || typeof record.requiresOpenspec !== 'string') {
    throw new Error("'recoverySchema' must name the product-recovery schema and carry a string 'requiresOpenspec'");
  }
  if (!record.files || typeof record.files !== 'object' || Array.isArray(record.files)) {
    throw new Error("'recoverySchema.files' must be a path-to-digest object");
  }
  return record.files;
}

/** Repository-relative paths used by this integration. */
const CONFIG_RELATIVE = 'openspec/config.yaml';
const META_RELATIVE = '.product/integrations/openspec.json';
const CI_EXAMPLE_RELATIVE = '.product/integrations/openspec.ci.yml';

/** The repository-relative path of the integration metadata file, for callers that probe it. */
export const OPENSPEC_META_RELATIVE = META_RELATIVE;

/** The repository-relative path of the installed CI-ready example workflow. */
export const OPENSPEC_CI_EXAMPLE_RELATIVE = CI_EXAMPLE_RELATIVE;

/** The exact provider-aware verification command the integration stands behind. */
export const OPENSPEC_VERIFY_COMMAND = 'npx prodshape citations verify --provider openspec';

/**
 * Render the CI-ready example workflow installed at {@link OPENSPEC_CI_EXAMPLE_RELATIVE}.
 *
 * The gate always blocks unresolved citations, tampered embedded projections, unclassified
 * current documents and bound documents with zero citations. Stale citations follow the
 * repository's configured warning policy (`validation.warnings-as-errors` in
 * `.product/config.yaml`); the example never changes that policy, but it states explicitly what
 * the repository's current choice means and how to escalate it, so the blocking behaviour is a
 * deliberate decision rather than a silent default.
 */
export function renderCiExample(options: { warningsAsErrors: boolean }): string {
  const stalePolicy = options.warningsAsErrors
    ? [
        '# - stale citations BLOCK this gate: .product/config.yaml sets',
        '#   `validation.warnings-as-errors: true`, escalating the PRODUCT061 warning to an error.',
        '#   The integration never changes that policy; relax it by setting the key to false.',
      ]
    : [
        '# - stale citations DO NOT block this gate: .product/config.yaml sets',
        '#   `validation.warnings-as-errors: false`, so PRODUCT061 stays a warning. To make stale',
        '#   citations block the merge, set `validation.warnings-as-errors: true` in',
        '#   .product/config.yaml. The integration never changes that policy for you.',
      ];
  return [
    '# PDaC citation gate for OpenSpec consumer documents (CI-ready example).',
    '# Managed by `prodshape integration add openspec`; copy it into your pipeline',
    '# (e.g. .github/workflows/) and adapt the triggers.',
    '#',
    '# The gate runs ProductShape citation and scope verification only. It never invokes',
    "# `openspec validate`; keep OpenSpec's own verdict a separate step so a native-spec defect",
    '# and a grounding defect stay distinguishable.',
    '#',
    '# Blocking behaviour:',
    '# - unresolved citations, tampered embedded projections, unclassified current documents',
    '#   and bound documents with zero citations always fail the gate;',
    ...stalePolicy,
    '# - citations in archived changes are checked too, but their problems are reported as',
    '#   warnings: archived history cannot be edited, so a problem there is information,',
    '#   not something this gate can make anyone fix. Pass --include-archived to apply the',
    '#   full gate to archived documents as well.',
    'name: pdac-citations',
    'on:',
    '  pull_request:',
    'jobs:',
    '  verify:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-node@v4',
    '        with:',
    "          node-version: '22'",
    '      # The OpenSpec CLI ships as @fission-ai/openspec; population discovery runs',
    '      # `openspec list`, so the gate needs it installed.',
    `      - run: npm install -g ${OPENSPEC_NPX_SPEC}`,
    `      - run: ${OPENSPEC_VERIFY_COMMAND}`,
    '',
  ].join('\n');
}

/**
 * Every path this integration writes is one of its own module-level literals, resolved through the
 * repository-containment resolver rather than joined directly, so the contract is enforced by the
 * same code that enforces it for repository-supplied paths instead of by inspection of this file.
 */
function configPath(root: string): string {
  return resolveInRepository(root, CONFIG_RELATIVE, 'the OpenSpec integration');
}

function metaPath(root: string): string {
  return resolveInRepository(root, META_RELATIVE, 'the OpenSpec integration');
}

function ciExamplePath(root: string): string {
  return resolveInRepository(root, CI_EXAMPLE_RELATIVE, 'the OpenSpec integration');
}

/**
 * Compare two semver-like version strings (major.minor.patch, ignoring pre-release suffixes).
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
function compareVersions(a: string, b: string): number {
  const parseParts = (v: string): [number, number, number] => {
    const core = v.split('-')[0]?.split('+')[0] ?? '';
    const segments = core.split('.').map((s) => Number.parseInt(s, 10));
    return [segments[0] ?? 0, segments[1] ?? 0, segments[2] ?? 0];
  };
  const [aMaj, aMin, aPatch] = parseParts(a);
  const [bMaj, bMin, bPatch] = parseParts(b);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPatch - bPatch;
}

/** Run a command at the repository root, resolving stdout+stderr or rejecting on failure. */
async function runAtRoot(root: string, command: string, args: string[]): Promise<string> {
  const { stdout, stderr } = await runCommand(command, args, {
    cwd: root,
    env: envWithLocalBin(root),
  });
  return `${stdout}${stderr}`;
}

/**
 * Detect the installed OpenSpec CLI version by running `openspec --version`. When a repository
 * root is given, its node_modules/.bin is consulted first, so a devDependency install counts.
 */
export async function detectOpenSpecVersion(
  root?: string,
): Promise<{ version: string } | { error: string }> {
  try {
    const { stdout, stderr } = await runCommand('openspec', ['--version'], {
      ...(root ? { cwd: root, env: envWithLocalBin(root) } : {}),
    });
    const output = `${stdout}${stderr}`.trim();
    // `openspec --version` prints something like "1.3.0" or "openspec/1.3.0 ...".
    const match = output.match(/(\d+\.\d+\.\d+(?:-[^\s]+)?)/);
    if (!match?.[1]) {
      return { error: `Could not parse OpenSpec version from output: ${output}` };
    }
    return { version: match[1] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: `OpenSpec CLI not found on PATH (run: npm install -g ${OPENSPEC_NPX_SPEC}). ${message}`,
    };
  }
}

/**
 * Create an OpenSpec workspace at the root. Uses the installed CLI when one is on PATH (or in
 * node_modules/.bin); otherwise runs the pinned OpenSpec major through npx, which downloads
 * nothing permanent and never mutates the global environment. `--tools none` keeps the
 * framework's own initializer non-interactive.
 *
 * Returns the CLI version that ran and whether it came through npx, so callers can pass the
 * version on to `addOpenSpecIntegration` (nothing may be on PATH afterwards) and recommend a
 * permanent install.
 */
export async function bootstrapOpenSpecWorkspace(
  root: string,
): Promise<{ version: string; viaNpx: boolean; command: string }> {
  if (await isOpenSpecWorkspace(root)) {
    throw new Error('An OpenSpec workspace already exists at this root.');
  }
  const detected = await detectOpenSpecVersion(root);
  if (!('error' in detected)) {
    if (compareVersions(detected.version, MIN_SUPPORTED_OPENSPEC) < 0) {
      throw new Error(
        `OpenSpec CLI version ${detected.version} is below the minimum supported ${MIN_SUPPORTED_OPENSPEC}. Please upgrade OpenSpec.`,
      );
    }
    const command = 'openspec init --tools none';
    await runAtRoot(root, 'openspec', ['init', '--tools', 'none']);
    return { version: detected.version, viaNpx: false, command };
  }
  const command = `npx -y ${OPENSPEC_NPX_SPEC} init --tools none`;
  await runAtRoot(root, 'npx', ['-y', OPENSPEC_NPX_SPEC, 'init', '--tools', 'none']);
  // A second npx call resolves from the cache the first one populated.
  const output = await runAtRoot(root, 'npx', ['-y', OPENSPEC_NPX_SPEC, '--version']);
  const match = output.trim().match(/(\d+\.\d+\.\d+(?:-[^\s]+)?)/);
  if (!match?.[1]) {
    throw new Error(`Could not parse OpenSpec version from npx output: ${output.trim()}`);
  }
  return { version: match[1], viaNpx: true, command };
}

/** Check if the OpenSpec integration is installed (its metadata file is present). */
export async function isOpenSpecIntegrationInstalled(root: string): Promise<boolean> {
  return pathExists(metaPath(root));
}

/** Read and parse the existing openspec/config.yaml, or null if it does not exist. */
export async function readOpenSpecConfig(root: string): Promise<Record<string, unknown> | null> {
  const path = configPath(root);
  if (!(await pathExists(path))) return null;
  const text = await readFile(path, 'utf8');
  const parsed = parse(text);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    // An empty or non-mapping file: treat as an empty config so we can merge into it.
    return {};
  }
  return parsed as Record<string, unknown>;
}

/**
 * Extract the PDaC context block (between sentinels) from a context string, or null if absent.
 */
function extractPdacContext(context: string | undefined): string | null {
  if (!context) return null;
  const begin = context.indexOf(PDAC_CONTEXT_BEGIN);
  const end = context.indexOf(PDAC_CONTEXT_END);
  if (begin === -1 || end === -1 || end < begin) return null;
  return context.slice(begin, end + PDAC_CONTEXT_END.length);
}

/**
 * Merge PDaC guidance into the OpenSpec config, preserving existing content.
 *
 * - `schema` is preserved as-is.
 * - `context`: if the existing context already contains the PDaC block, it is replaced in place
 *   (idempotent); otherwise the PDaC block is appended after a separator. User-authored context
 *   lines are never lost.
 * - `rules`: for each PDaC artifact (proposal, specs, design, tasks), PDaC rules are appended to
 *   existing rules, deduplicating identical entries. Entries recorded as previously managed whose
 *   wording is no longer current are removed first, so a guidance change replaces the old string
 *   instead of accumulating next to it. User-authored entries are never removed.
 * - `operations`: PDaC apply/archive guidance is appended to existing guidance, deduplicating,
 *   with the same previously-managed replacement.
 * - Any other fields (githubCopilot, etc.) are preserved untouched.
 *
 * Returns the merged config and a list of human-readable change descriptions.
 */
export function mergeConfig(
  existing: Record<string, unknown> | null,
  previouslyManaged?: ManagedStrings,
): {
  config: Record<string, unknown>;
  changes: string[];
} {
  const config: Record<string, unknown> = { ...(existing ?? {}) };
  const changes: string[] = [];

  // Strings PDaC injected in the past but no longer injects verbatim: remove before appending.
  const staleManaged = (recorded: string[] | undefined, current: string[]): string[] =>
    (recorded ?? []).filter((entry) => !current.includes(entry));

  // --- context ---
  const existingContext =
    typeof config['context'] === 'string' ? (config['context'] as string) : undefined;
  const existingPdacBlock = extractPdacContext(existingContext);
  if (existingPdacBlock !== null) {
    // Replace the existing PDaC block in place (keeps it idempotent and up to date).
    if (existingPdacBlock !== PDAC_CONTEXT_BLOCK) {
      const replaced = existingContext!.replace(existingPdacBlock, PDAC_CONTEXT_BLOCK);
      if (replaced !== existingContext) {
        config['context'] = replaced;
        changes.push('Updated PDaC context block in openspec/config.yaml (context:).');
      }
    }
    // If identical, no change recorded — idempotent.
  } else if (existingContext) {
    // User has their own context: append the PDaC block after a blank-line separator.
    const separator = existingContext.endsWith('\n') ? '\n' : '\n\n';
    config['context'] = `${existingContext}${separator}${PDAC_CONTEXT_BLOCK}`;
    changes.push('Appended PDaC context block to existing openspec/config.yaml context:.');
  } else {
    config['context'] = PDAC_CONTEXT_BLOCK;
    changes.push('Added PDaC context block to openspec/config.yaml (context:).');
  }

  // --- rules ---
  const existingRules =
    config['rules'] && typeof config['rules'] === 'object' && !Array.isArray(config['rules'])
      ? { ...(config['rules'] as Record<string, unknown>) }
      : {};
  let rulesChanged = false;
  let staleRulesRemoved = false;
  const ruleArtifacts = new Set([
    ...Object.keys(PDAC_RULES),
    ...Object.keys(previouslyManaged?.rules ?? {}),
  ]);
  for (const artifact of ruleArtifacts) {
    const pdacRules = PDAC_RULES[artifact] ?? [];
    const stale = staleManaged(previouslyManaged?.rules[artifact], pdacRules);
    const existingList = Array.isArray(existingRules[artifact])
      ? [...(existingRules[artifact] as string[])]
      : [];
    const merged = existingList.filter((entry) => !stale.includes(entry));
    if (merged.length !== existingList.length) {
      staleRulesRemoved = true;
      rulesChanged = true;
    }
    for (const rule of pdacRules) {
      if (!merged.includes(rule)) {
        merged.push(rule);
        rulesChanged = true;
      }
    }
    if (merged.length === 0) {
      delete existingRules[artifact];
    } else {
      existingRules[artifact] = merged;
    }
  }
  if (rulesChanged) {
    if (Object.keys(existingRules).length === 0) {
      delete config['rules'];
    } else {
      config['rules'] = existingRules;
    }
    changes.push(
      staleRulesRemoved
        ? 'Merged PDaC citation rules into openspec/config.yaml (rules:), replacing outdated PDaC entries.'
        : 'Merged PDaC citation rules into openspec/config.yaml (rules:).',
    );
  }

  // --- operations ---
  const existingOperations =
    config['operations'] &&
    typeof config['operations'] === 'object' &&
    !Array.isArray(config['operations'])
      ? { ...(config['operations'] as Record<string, unknown>) }
      : {};
  let opsChanged = false;
  let staleOpsRemoved = false;
  for (const opKey of ['apply', 'archive'] as const) {
    const pdacGuidance = PDAC_OPERATIONS[opKey].guidance;
    const stale = staleManaged(previouslyManaged?.operations[opKey], pdacGuidance);
    const existingOp =
      existingOperations[opKey] &&
      typeof existingOperations[opKey] === 'object' &&
      !Array.isArray(existingOperations[opKey])
        ? { ...(existingOperations[opKey] as Record<string, unknown>) }
        : {};
    const existingGuidance = Array.isArray(existingOp['guidance'])
      ? [...(existingOp['guidance'] as string[])]
      : [];
    const merged = existingGuidance.filter((entry) => !stale.includes(entry));
    if (merged.length !== existingGuidance.length) {
      staleOpsRemoved = true;
      opsChanged = true;
    }
    for (const guidance of pdacGuidance) {
      if (!merged.includes(guidance)) {
        merged.push(guidance);
        opsChanged = true;
      }
    }
    existingOp['guidance'] = merged;
    existingOperations[opKey] = existingOp;
  }
  if (opsChanged) {
    config['operations'] = existingOperations;
    changes.push(
      staleOpsRemoved
        ? 'Merged PDaC operation guidance into openspec/config.yaml (operations:), replacing outdated PDaC entries.'
        : 'Merged PDaC operation guidance into openspec/config.yaml (operations:).',
    );
  }

  return { config, changes };
}

/** Serialize config back to YAML with a trailing newline. */
export function serializeConfig(config: Record<string, unknown>): string {
  return `${stringify(config).trimEnd()}\n`;
}

/** Read the ProductShape version from the integration-openspec package.json. */
async function productshapeVersion(): Promise<string> {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version: string };
  return packageJson.version;
}

/**
 * Add the OpenSpec integration to a repository.
 *
 * - Detects the OpenSpec CLI version; rejects if not found or below MIN_SUPPORTED_OPENSPEC.
 *   A caller that already ran the CLI (the init bootstrap) can pass `cliVersion` to skip the
 *   probe: after an npx bootstrap nothing is on PATH, yet the version is known.
 * - Requires an existing `openspec/` workspace (run `openspec init` first).
 * - Merges PDaC guidance into `openspec/config.yaml`, preserving existing user configuration.
 * - Records metadata under `.product/integrations/openspec.json`, including the exact strings
 *   injected, so a later update replaces outdated PDaC entries instead of accumulating them.
 * - Byte-idempotent: running twice produces the same result, reports no changes and rewrites
 *   nothing at all — not the merged configuration, not the CI example, not the metadata.
 * - `--dry-run` reports what would change without writing.
 */
export async function addOpenSpecIntegration(
  root: string,
  options: {
    force?: boolean;
    dryRun?: boolean;
    cliVersion?: string;
    /**
     * The repository's configured `validation.warnings-as-errors` policy, reflected verbatim in
     * the installed CI example so its blocking behaviour is stated, never silently changed.
     */
    warningsAsErrors?: boolean;
  } = {},
): Promise<{ written: string[]; changes: string[]; meta: OpenSpecIntegrationMeta }> {
  // `force` is accepted for signature compatibility with the other integrations and deliberately
  // ignored: every managed surface here is compared by content, so there is nothing a forced run
  // could regenerate that a normal one does not. It used to mean "rewrite even when identical",
  // which is exactly the byte-churn this integration must not produce.
  const { dryRun = false, warningsAsErrors = false } = options;

  let openspecVersion = options.cliVersion;
  if (!openspecVersion) {
    const detected = await detectOpenSpecVersion(root);
    if ('error' in detected) {
      throw new Error(detected.error);
    }
    openspecVersion = detected.version;
  }
  if (compareVersions(openspecVersion, MIN_SUPPORTED_OPENSPEC) < 0) {
    throw new Error(
      `OpenSpec CLI version ${openspecVersion} is below the minimum supported ${MIN_SUPPORTED_OPENSPEC}. Please upgrade OpenSpec.`,
    );
  }

  if (!(await isOpenSpecWorkspace(root))) {
    throw new Error('No OpenSpec workspace found. Run `openspec init` first.');
  }

  const existing = await readOpenSpecConfig(root);
  const previousMeta = await readMeta(root);

  const { config, changes: configChanges } = mergeConfig(existing, previousMeta?.managed);

  const ciDesired = renderCiExample({ warningsAsErrors });
  const ciAbsolute = ciExamplePath(root);
  const ciExisting = (await pathExists(ciAbsolute)) ? await readFile(ciAbsolute, 'utf8') : null;
  const ciChanged = ciExisting !== ciDesired;

  const changes = [...configChanges];
  if (ciChanged) {
    changes.push(
      ciExisting === null
        ? `Installed CI-ready verification example at ${CI_EXAMPLE_RELATIVE}.`
        : `Updated CI-ready verification example at ${CI_EXAMPLE_RELATIVE}.`,
    );
  }

  // The OpenSpec product schema: managed files under openspec/schemas/product-change, the framework's
  // official project-local schema surface. The files are version-independent data, so they are
  // installed regardless of the detected CLI version; whether the product workflow is USABLE on
  // this CLI is a separate, capability-specific report (`checkOpenSpecIntegration`), never a
  // different set of bytes.
  //
  // Ownership is proven per file, never inferred from the schema path or byte equality (ADR
  // 0008): a file may be replaced only when the metadata recorded that exact path and its bytes
  // still match the recorded digest. Any pre-existing unrecorded file is a collision, even when
  // byte-identical to the asset; on update a diverged managed file is preserved and reported, and
  // an obsolete still-managed file is removed only while its digest continues to match.
  const schemaAssets = await loadProductChangeSchemaAssets();
  const recordedSchema = recordedProductSchemaFiles(previousMeta);
  const currentSchemaPaths = new Set(
    schemaAssets.map((asset) => `${OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE}/${asset.relative}`),
  );
  const schemaFileDigests: Record<string, string> = {};
  const schemaWrites: { relative: string; absolute: string; content: string }[] = [];
  const schemaDeletes: { relative: string; absolute: string }[] = [];
  const schemaCollisions: string[] = [];
  const schemaPreserved: string[] = [];
  let schemaInstalledAnything = false;
  for (const asset of schemaAssets) {
    const relative = `${OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE}/${asset.relative}`;
    const absolute = resolveInRepository(root, relative, 'the OpenSpec integration');
    const existing = (await pathExists(absolute)) ? await readFile(absolute, 'utf8') : null;
    const assetDigest = contentDigest(asset.content);
    if (existing === null) {
      schemaWrites.push({ relative, absolute, content: asset.content });
      schemaFileDigests[relative] = assetDigest;
      schemaInstalledAnything = true;
      continue;
    }
    const recordedDigest = recordedSchema?.[relative];
    if (recordedDigest === undefined) {
      // Ownership is per file. Byte equality proves compatibility, not authorship: adopting an
      // identical user file on a fresh install or when a later release adds a new asset would let
      // a subsequent remove delete content the integration never installed.
      schemaCollisions.push(relative);
      continue;
    }
    if (existing === asset.content) {
      // A recorded managed path is already byte-identical to the current asset: nothing to write.
      schemaFileDigests[relative] = assetDigest;
      continue;
    }
    if (recordedDigest !== '' && contentDigest(existing) === recordedDigest) {
      // Proven managed at an older recorded version: replace with the current assets.
      schemaWrites.push({ relative, absolute, content: asset.content });
      schemaFileDigests[relative] = assetDigest;
      continue;
    }
    // Managed path whose content diverged from both the record and the current assets: a hand
    // edit. Preserve it, keep its recorded digest (restoring the recorded content re-enables
    // management), and report it.
    schemaPreserved.push(relative);
    if (recordedDigest !== '') schemaFileDigests[relative] = recordedDigest;
  }
  for (const [relative, recordedDigest] of Object.entries(recordedSchema ?? {})) {
    if (currentSchemaPaths.has(relative)) continue;
    const absolute = resolveInRepository(root, relative, 'the OpenSpec integration');
    if (!(await pathExists(absolute))) continue;
    const existing = await readFile(absolute, 'utf8');
    if (recordedDigest !== '' && contentDigest(existing) === recordedDigest) {
      schemaDeletes.push({ relative, absolute });
      continue;
    }
    // Ownership extends to absence, but deletion still requires the recorded digest proof. A
    // diverged obsolete file stays user-visible and remains recorded so check/remove can continue
    // reporting it; a digest-less legacy record is preserved but cannot become ownership proof.
    schemaPreserved.push(relative);
    if (recordedDigest !== '') schemaFileDigests[relative] = recordedDigest;
  }
  if (schemaCollisions.length > 0) {
    throw new Error(
      `Refusing to install the OpenSpec product schema: ${OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE} already contains files this integration does not manage (${schemaCollisions.join(', ')}). Move them aside or delete them, then run: prodshape integration add openspec. The integration never overwrites user-authored files.`,
    );
  }
  if (schemaWrites.length > 0) {
    changes.push(
      recordedSchema !== undefined || !schemaInstalledAnything
        ? `Updated the OpenSpec product schema at ${OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE} (${schemaWrites.length} file${schemaWrites.length === 1 ? '' : 's'}).`
        : `Installed the OpenSpec product schema at ${OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE}.`,
    );
    if (compareVersions(openspecVersion, PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC) < 0) {
      changes.push(
        `Product workflow unavailable until OpenSpec >= ${PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC} (detected ${openspecVersion}); the citation lane is unaffected.`,
      );
    }
  }
  for (const { relative } of schemaDeletes) {
    changes.push(`Removed obsolete managed file ${relative}.`);
  }
  for (const relative of schemaPreserved) {
    changes.push(
      `Preserved hand-edited managed file ${relative}; restore or delete it, then run: prodshape integration update.`,
    );
  }

  // The recovery workload has its own schema and ownership record. It is intentionally kept
  // beside, rather than inside, product-change: recovery starts without an accepted baseline.
  const recoveryAssets = await loadProductRecoverySchemaAssets();
  const previousRecovery = recordedRecoverySchemaFiles(previousMeta);
  const recoveryDigests: Record<string, string> = {};
  const recoveryWrites: { relative: string; absolute: string; content: string }[] = [];
  const recoveryCollisions: string[] = [];
  for (const asset of recoveryAssets) {
    const relative = `${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}/${asset.relative}`;
    const absolute = resolveInRepository(root, relative, 'the OpenSpec integration');
    const existing = (await pathExists(absolute)) ? await readFile(absolute, 'utf8') : null;
    const digest = contentDigest(asset.content);
    const recorded = previousRecovery?.[relative];
    if (existing === null) {
      recoveryWrites.push({ relative, absolute, content: asset.content });
      recoveryDigests[relative] = digest;
    } else if (recorded === undefined) {
      recoveryCollisions.push(relative);
    } else if (existing === asset.content) {
      recoveryDigests[relative] = digest;
    } else if (recorded !== '' && contentDigest(existing) === recorded) {
      recoveryWrites.push({ relative, absolute, content: asset.content });
      recoveryDigests[relative] = digest;
    } else {
      recoveryDigests[relative] = recorded;
      changes.push(`Preserved hand-edited managed file ${relative}; restore or delete it, then run: prodshape integration update.`);
    }
  }
  if (recoveryCollisions.length > 0) {
    throw new Error(`Refusing to install the OpenSpec product-recovery schema: unrecorded files exist (${recoveryCollisions.join(', ')}). The integration never overwrites user-authored files.`);
  }
  if (recoveryWrites.length > 0) {
    changes.push(
      previousRecovery === undefined
        ? `Installed the OpenSpec product-recovery schema at ${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}.`
        : `Updated the OpenSpec product-recovery schema at ${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE} (${recoveryWrites.length} files).`,
    );
  }

  // `installedAt` records when this integration was first installed, and is preserved from here
  // on. Stamping a fresh timestamp on every invocation is what made a no-op `add` — and every
  // `integration update` — rewrite this file, so a command that reported "already up to date"
  // still left the working tree dirty. `updatedAt` carries the moving fact instead, and moves
  // only when managed content actually changed.
  const now = new Date().toISOString();
  const meta: OpenSpecIntegrationMeta = {
    provider: 'openspec',
    version: await productshapeVersion(),
    openspecVersion,
    installedAt: previousMeta?.installedAt ?? now,
    configPath: CONFIG_RELATIVE,
    ciExamplePath: CI_EXAMPLE_RELATIVE,
    managed: currentManagedStrings(),
    productSchema: {
      name: OPENSPEC_PRODUCT_CHANGE_SCHEMA_NAME,
      requiresOpenspec: PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC,
      files: schemaFileDigests,
    },
    recoverySchema: {
      name: OPENSPEC_PRODUCT_RECOVERY_SCHEMA_NAME,
      requiresOpenspec: PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC,
      files: recoveryDigests,
    },
  };
  const updatedAt =
    changes.length > 0 && previousMeta !== null ? now : (previousMeta?.updatedAt ?? undefined);
  if (updatedAt !== undefined) meta.updatedAt = updatedAt;

  const written: string[] = [];
  if (!dryRun) {
    // Every write below is conditional on the bytes actually differing. `force` re-derives the
    // content; it does not license rewriting a file that already carries exactly that content,
    // because a byte-identical rewrite is invisible in a diff and visible everywhere else — in
    // Git's stat cache, in file watchers, and in every build that keys off modification times.
    if (configChanges.length > 0) {
      const serialized = serializeConfig(config);
      await mkdir(dirname(configPath(root)), { recursive: true });
      await writeFile(configPath(root), serialized, 'utf8');
      written.push(CONFIG_RELATIVE);
    }
    if (ciChanged) {
      await mkdir(dirname(ciAbsolute), { recursive: true });
      await writeFile(ciAbsolute, ciDesired, 'utf8');
      written.push(CI_EXAMPLE_RELATIVE);
    }
    for (const deletion of schemaDeletes) {
      await rm(deletion.absolute, { force: true });
    }
    for (const write of schemaWrites) {
      await mkdir(dirname(write.absolute), { recursive: true });
      await writeFile(write.absolute, write.content, 'utf8');
      written.push(write.relative);
    }
    for (const write of recoveryWrites) {
      await mkdir(dirname(write.absolute), { recursive: true });
      await writeFile(write.absolute, write.content, 'utf8');
      written.push(write.relative);
    }
    if (await writeMetaIfChanged(root, meta)) {
      written.push(META_RELATIVE);
    }
  }

  return { written, changes, meta };
}

/**
 * Write the integration metadata file, but only when its bytes would change. Reports whether it
 * was written, so a caller never claims a write that did not happen.
 */
async function writeMetaIfChanged(root: string, meta: OpenSpecIntegrationMeta): Promise<boolean> {
  const path = metaPath(root);
  const desired = `${JSON.stringify(meta, null, 2)}\n`;
  let existing: string | undefined;
  try {
    existing = await readFile(path, 'utf8');
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  if (existing === desired) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, desired, 'utf8');
  return true;
}

/**
 * An integration metadata file that exists but cannot be read or parsed.
 *
 * Absent metadata means the integration is not installed, which is a supported state. A metadata
 * file that is present and unreadable is not: continuing as though it were absent would discard
 * the record of exactly which guidance strings were injected, and the next update would append
 * duplicates alongside the entries it should have replaced.
 */
export class OpenSpecMetaError extends Error {
  constructor(detail: string, options?: { cause?: unknown }) {
    super(
      `OpenSpec integration metadata ${META_RELATIVE} cannot be trusted: ${detail}` +
        '\nReconcile it by hand, or remove it and re-run: prodshape integration add openspec',
      options,
    );
    this.name = 'OpenSpecMetaError';
  }
}

/** Read the integration metadata file, or null if absent. Unreadable or malformed is an error. */
async function readMeta(root: string): Promise<OpenSpecIntegrationMeta | null> {
  const path = metaPath(root);
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if (isNotFound(error)) return null;
    throw new OpenSpecMetaError(
      `it exists but could not be read (${error instanceof Error ? error.message : String(error)})`,
      { cause: error },
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new OpenSpecMetaError(
      `it is not valid JSON (${error instanceof Error ? error.message : String(error)})`,
      { cause: error },
    );
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new OpenSpecMetaError('the document is not a JSON object');
  }
  const record = parsed as Record<string, unknown>;
  if (record.provider !== 'openspec' || typeof record.installedAt !== 'string') {
    throw new OpenSpecMetaError(
      "it does not match the metadata schema ('provider' must be 'openspec' and 'installedAt' a string)",
    );
  }
  const meta = record as unknown as OpenSpecIntegrationMeta;
  try {
    recordedProductSchemaFiles(meta);
  } catch (error) {
    throw new OpenSpecMetaError(
      `it does not match the product schema ownership record (${error instanceof Error ? error.message : String(error)})`,
      { cause: error },
    );
  }
  return meta;
}

/**
 * Update (re-merge) the OpenSpec integration. Re-runs the merge so that a PDaC upgrade that
 * changed the context block or rules is reflected. Idempotent.
 */
export async function updateOpenSpecIntegration(
  root: string,
  options: { force?: boolean; dryRun?: boolean; warningsAsErrors?: boolean } = {},
): Promise<{ written: string[]; changes: string[] }> {
  // `add` already re-merges idempotently; `force` ensures the metadata is refreshed even when
  // the config content did not change.
  const result = await addOpenSpecIntegration(root, {
    force: true,
    dryRun: options.dryRun,
    warningsAsErrors: options.warningsAsErrors,
  });
  return { written: result.written, changes: result.changes };
}

/**
 * Check the OpenSpec integration health. Verifies:
 * - OpenSpec CLI is installed and the version is supported.
 * - `openspec/config.yaml` exists and contains the PDaC context block.
 * - `.product/integrations/openspec.json` metadata exists.
 * - The config's PDaC block matches the current PDaC guidance (not removed or altered).
 * - The product schema's managed files are installed and intact, with the product workflow's
 *   availability reported per capability: an OpenSpec CLI below the product floor leaves the
 *   citation lane usable and states the product workflow UNAVAILABLE instead of failing it.
 */
export async function checkOpenSpecIntegration(root: string): Promise<{
  ok: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
}> {
  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // 1. OpenSpec CLI installed and supported.
  const detected = await detectOpenSpecVersion(root);
  const detectedVersion = 'error' in detected ? undefined : detected.version;
  if ('error' in detected) {
    checks.push({ name: 'openspec CLI', ok: false, detail: detected.error });
  } else if (compareVersions(detected.version, MIN_SUPPORTED_OPENSPEC) < 0) {
    checks.push({
      name: 'openspec CLI',
      ok: false,
      detail: `OpenSpec ${detected.version} is below minimum supported ${MIN_SUPPORTED_OPENSPEC}.`,
    });
  } else {
    checks.push({
      name: 'openspec CLI',
      ok: true,
      detail: `OpenSpec ${detected.version} detected.`,
    });
  }

  // 2. openspec/config.yaml exists and contains PDaC context.
  const config = await readOpenSpecConfig(root);
  if (config === null) {
    checks.push({
      name: 'config.yaml',
      ok: false,
      detail: 'openspec/config.yaml not found. Run: prodshape integration add openspec',
    });
  } else {
    const context =
      typeof config['context'] === 'string' ? (config['context'] as string) : undefined;
    const pdacBlock = extractPdacContext(context);
    if (pdacBlock === null) {
      checks.push({
        name: 'config.yaml',
        ok: false,
        detail:
          'PDaC context block missing from openspec/config.yaml. Run: prodshape integration add openspec',
      });
    } else if (pdacBlock !== PDAC_CONTEXT_BLOCK) {
      checks.push({
        name: 'config.yaml',
        ok: false,
        detail:
          'PDaC context block in openspec/config.yaml is outdated. Run: prodshape integration update',
      });
    } else {
      checks.push({
        name: 'config.yaml',
        ok: true,
        detail: 'PDaC context block present and current.',
      });
    }
  }

  // 3. Metadata file exists.
  const meta = await readMeta(root);
  if (meta === null) {
    checks.push({
      name: 'metadata',
      ok: false,
      detail:
        '.product/integrations/openspec.json not found. Run: prodshape integration add openspec',
    });
  } else {
    checks.push({
      name: 'metadata',
      ok: true,
      detail:
        `Integration recorded (OpenSpec ${meta.openspecVersion}, installed ${meta.installedAt}` +
        `${meta.updatedAt ? `, updated ${meta.updatedAt}` : ''}).`,
    });
  }

  // 3b. CI-ready verification example present.
  if (await pathExists(ciExamplePath(root))) {
    checks.push({
      name: 'ci example',
      ok: true,
      detail: `CI-ready verification example present at ${CI_EXAMPLE_RELATIVE}.`,
    });
  } else {
    checks.push({
      name: 'ci example',
      ok: false,
      detail: `CI-ready verification example missing (${CI_EXAMPLE_RELATIVE}). Run: prodshape integration update`,
    });
  }

  // 4. PDaC rules present.
  if (config) {
    const rules =
      config['rules'] && typeof config['rules'] === 'object' && !Array.isArray(config['rules'])
        ? (config['rules'] as Record<string, unknown>)
        : {};
    const missingRules: string[] = [];
    for (const [artifact, pdacRules] of Object.entries(PDAC_RULES)) {
      const list = Array.isArray(rules[artifact]) ? (rules[artifact] as string[]) : [];
      for (const rule of pdacRules) {
        if (!list.includes(rule)) missingRules.push(artifact);
      }
    }
    if (missingRules.length > 0) {
      checks.push({
        name: 'rules',
        ok: false,
        detail: `PDaC rules missing for: ${[...new Set(missingRules)].join(', ')}. Run: prodshape integration update`,
      });
    } else {
      checks.push({ name: 'rules', ok: true, detail: 'All PDaC citation rules present.' });
    }
  }

  // 5. Product workflow: managed schema state plus capability-specific availability. The schema
  // files are inert data valid under any CLI, so a floor-violating CLI is not a managed-state
  // defect; it makes the product workflow UNAVAILABLE, stated as the check's verdict rather than
  // buried as a footnote, while the citation lane stays independently usable.
  const schemaAssets = await loadProductChangeSchemaAssets();
  if (meta === null || meta.productSchema === undefined) {
    checks.push({
      name: 'product workflow',
      ok: false,
      detail: `OpenSpec product schema not installed (${OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE}). Run: prodshape integration update`,
    });
  } else {
    const recordedSchema = recordedProductSchemaFiles(meta) ?? {};
    const currentSchemaPaths = new Set(
      schemaAssets.map((asset) => `${OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE}/${asset.relative}`),
    );
    const missing: string[] = [];
    const unrecorded: string[] = [];
    const outdated: string[] = [];
    const diverged: string[] = [];
    const obsolete = Object.keys(recordedSchema)
      .filter((relative) => !currentSchemaPaths.has(relative))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const asset of schemaAssets) {
      const relative = `${OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE}/${asset.relative}`;
      const absolute = resolveInRepository(root, relative, 'the OpenSpec integration');
      const existing = (await pathExists(absolute)) ? await readFile(absolute, 'utf8') : null;
      const recordedDigest = recordedSchema[relative];
      if (recordedDigest === undefined) {
        unrecorded.push(relative);
      } else if (existing === null) {
        missing.push(relative);
      } else if (existing !== asset.content) {
        if (recordedDigest !== '' && contentDigest(existing) === recordedDigest) {
          outdated.push(relative);
        } else {
          diverged.push(relative);
        }
      }
    }
    if (
      missing.length > 0 ||
      unrecorded.length > 0 ||
      outdated.length > 0 ||
      diverged.length > 0 ||
      obsolete.length > 0
    ) {
      const parts: string[] = [];
      if (missing.length > 0) {
        parts.push(`missing: ${missing.join(', ')} (run: prodshape integration update)`);
      }
      if (unrecorded.length > 0) {
        parts.push(
          `unrecorded: ${unrecorded.join(', ')} (move user files aside, then run: prodshape integration update)`,
        );
      }
      if (outdated.length > 0) {
        parts.push(
          `outdated managed content: ${outdated.join(', ')} (run: prodshape integration update)`,
        );
      }
      if (diverged.length > 0) {
        parts.push(
          `hand-edited and preserved: ${diverged.join(', ')} (restore or delete them, then run: prodshape integration update)`,
        );
      }
      if (obsolete.length > 0) {
        parts.push(
          `obsolete managed content: ${obsolete.join(', ')} (run: prodshape integration update)`,
        );
      }
      checks.push({
        name: 'product workflow',
        ok: false,
        detail: `Product schema files need attention. ${parts.join(' ')}`,
      });
    } else if (detectedVersion === undefined) {
      checks.push({
        name: 'product workflow',
        ok: true,
        detail:
          'Product workflow UNAVAILABLE: the OpenSpec CLI was not detected. The schema is installed and intact; the openspec CLI check carries the remedy.',
      });
    } else if (compareVersions(detectedVersion, PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC) < 0) {
      checks.push({
        name: 'product workflow',
        ok: true,
        detail: `Product workflow UNAVAILABLE: requires OpenSpec >= ${PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC}, detected ${detectedVersion}. The citation lane is unaffected; upgrade OpenSpec to use the product schema.`,
      });
    } else {
      checks.push({
        name: 'product workflow',
        ok: true,
        detail: `Product workflow available: schema installed and OpenSpec ${detectedVersion} meets the ${PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC} floor.`,
      });
    }
  }

  // 6. Hosted recovery schema ownership is checked independently from product-change because
  // the two workloads have different preconditions and may evolve on different cadences.
  const recoveryAssets = await loadProductRecoverySchemaAssets();
  const recoveryRecord = recordedRecoverySchemaFiles(meta);
  if (recoveryRecord === undefined) {
    checks.push({
      name: 'product recovery workflow',
      ok: false,
      detail: `OpenSpec product-recovery schema not installed (${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}). Run: prodshape integration update`,
    });
  } else {
    const defects: string[] = [];
    for (const asset of recoveryAssets) {
      const relative = `${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}/${asset.relative}`;
      const absolute = resolveInRepository(root, relative, 'the OpenSpec integration');
      const expected = recoveryRecord[relative];
      if (expected === undefined) defects.push(`unrecorded: ${relative}`);
      else if (!(await pathExists(absolute))) defects.push(`missing: ${relative}`);
      else {
        const actual = await readFile(absolute, 'utf8');
        if (actual !== asset.content && contentDigest(actual) !== expected) {
          defects.push(`hand-edited and preserved: ${relative}`);
        } else if (actual !== asset.content) defects.push(`outdated managed content: ${relative}`);
      }
    }
    checks.push({
      name: 'product recovery workflow',
      ok: defects.length === 0,
      detail:
        defects.length === 0
          ? `Product recovery workflow available: schema installed at ${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}.`
          : `Product-recovery schema files need attention. ${defects.join(' ')}`,
    });
  }

  const ok = checks.every((c) => c.ok);
  return { ok, checks };
}

/**
 * Remove the PDaC-injected content from openspec/config.yaml, preserving user-authored content,
 * and delete the metadata file.
 *
 * - Removes the PDaC context block (between sentinels) from `context:`.
 * - Removes PDaC rules from each artifact (keeps user-authored rules).
 * - Removes PDaC operation guidance (keeps user-authored guidance).
 * - Deletes the installed product schema files still proven managed (recorded digest or current
 *   asset bytes); hand-edited managed files are preserved and reported in `preserved`, and with
 *   no recorded product schema nothing under openspec/schemas is touched.
 * - Deletes `.product/integrations/openspec.json`.
 * - `--dry-run` reports what would be removed and preserved without writing.
 */
export async function removeOpenSpecIntegration(
  root: string,
  options: { dryRun?: boolean } = {},
): Promise<{ removed: string[]; preserved: string[] }> {
  const { dryRun = false } = options;
  const removed: string[] = [];
  const preserved: string[] = [];

  // Remove both what the metadata recorded as injected and what the current guidance would
  // inject: the union covers metadata written before the record existed as well as entries left
  // behind by an older ProductShape.
  const previousMeta = await readMeta(root);
  const recorded = previousMeta?.managed;
  const current = currentManagedStrings();
  const managedRules: Record<string, string[]> = {};
  for (const key of new Set([
    ...Object.keys(current.rules),
    ...Object.keys(recorded?.rules ?? {}),
  ])) {
    managedRules[key] = [
      ...new Set([...(current.rules[key] ?? []), ...(recorded?.rules[key] ?? [])]),
    ];
  }
  const managedOperations: Record<string, string[]> = {};
  for (const key of new Set([
    ...Object.keys(current.operations),
    ...Object.keys(recorded?.operations ?? {}),
  ])) {
    managedOperations[key] = [
      ...new Set([...(current.operations[key] ?? []), ...(recorded?.operations[key] ?? [])]),
    ];
  }

  const config = await readOpenSpecConfig(root);
  if (config !== null) {
    let configChanged = false;

    // Remove PDaC context block.
    const context =
      typeof config['context'] === 'string' ? (config['context'] as string) : undefined;
    if (context) {
      const pdacBlock = extractPdacContext(context);
      if (pdacBlock !== null) {
        const cleaned = context
          .replace(pdacBlock, '')
          .replace(/\n{3,}/g, '\n\n')
          .trimEnd();
        if (cleaned === '') {
          delete config['context'];
        } else {
          config['context'] = cleaned;
        }
        configChanged = true;
      }
    }

    // Remove PDaC rules from each artifact.
    const rules =
      config['rules'] && typeof config['rules'] === 'object' && !Array.isArray(config['rules'])
        ? (config['rules'] as Record<string, unknown>)
        : null;
    if (rules) {
      let rulesChanged = false;
      for (const [artifact, pdacRules] of Object.entries(managedRules)) {
        if (!Array.isArray(rules[artifact])) continue;
        const list = rules[artifact] as string[];
        const filtered = list.filter((r) => !pdacRules.includes(r));
        if (filtered.length !== list.length) {
          if (filtered.length === 0) {
            delete rules[artifact];
          } else {
            rules[artifact] = filtered;
          }
          rulesChanged = true;
        }
      }
      if (rulesChanged) {
        if (Object.keys(rules).length === 0) {
          delete config['rules'];
        }
        configChanged = true;
      }
    }

    // Remove PDaC operation guidance.
    const operations =
      config['operations'] &&
      typeof config['operations'] === 'object' &&
      !Array.isArray(config['operations'])
        ? (config['operations'] as Record<string, unknown>)
        : null;
    if (operations) {
      let opsChanged = false;
      for (const opKey of ['apply', 'archive'] as const) {
        const pdacGuidance = managedOperations[opKey] ?? [];
        const op =
          operations[opKey] &&
          typeof operations[opKey] === 'object' &&
          !Array.isArray(operations[opKey])
            ? (operations[opKey] as Record<string, unknown>)
            : null;
        if (!op || !Array.isArray(op['guidance'])) continue;
        const list = op['guidance'] as string[];
        const filtered = list.filter((g) => !pdacGuidance.includes(g));
        if (filtered.length !== list.length) {
          if (filtered.length === 0) {
            delete op['guidance'];
          } else {
            op['guidance'] = filtered;
          }
          opsChanged = true;
        }
        if (Object.keys(op).length === 0) {
          delete operations[opKey];
        }
      }
      if (opsChanged) {
        if (Object.keys(operations).length === 0) {
          delete config['operations'];
        }
        configChanged = true;
      }
    }

    if (configChanged && !dryRun) {
      const serialized = serializeConfig(config);
      await writeFile(configPath(root), serialized, 'utf8');
      removed.push(CONFIG_RELATIVE);
    } else if (configChanged && dryRun) {
      removed.push(CONFIG_RELATIVE);
    }
  }

  // Remove the installed CI example.
  if (await pathExists(ciExamplePath(root))) {
    if (!dryRun) {
      await rm(ciExamplePath(root), { force: true });
    }
    removed.push(CI_EXAMPLE_RELATIVE);
  }

  // Remove the installed product schema, deleting only paths with a per-file ownership record and
  // bytes still proven managed by the recorded digest (or, for a legacy path-only record, the
  // current asset). A diverged or unrecorded file is preserved and reported, and with no recorded
  // product schema at all nothing under openspec/schemas is touched. Directories are pruned only
  // when the removal emptied them, so adjacent schemas and user files inside ours survive.
  const recordedSchema = recordedProductSchemaFiles(previousMeta);
  if (recordedSchema !== undefined) {
    const assetContentByRelative = new Map(
      (await loadProductChangeSchemaAssets()).map((asset) => [
        `${OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE}/${asset.relative}`,
        asset.content,
      ]),
    );
    const schemaFileSet = Object.keys(recordedSchema).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const pruneCandidates = new Set<string>();
    for (const relative of schemaFileSet) {
      const absolute = resolveInRepository(root, relative, 'the OpenSpec integration');
      if (!(await pathExists(absolute))) continue;
      const existing = await readFile(absolute, 'utf8');
      const recordedDigest = recordedSchema[relative];
      const proven =
        existing === assetContentByRelative.get(relative) ||
        (recordedDigest !== undefined &&
          recordedDigest !== '' &&
          contentDigest(existing) === recordedDigest);
      if (!proven) {
        preserved.push(relative);
        continue;
      }
      if (!dryRun) {
        await rm(absolute, { force: true });
        let parent = dirname(relative);
        while (
          parent.startsWith('openspec/schemas') &&
          parent !== 'openspec/schemas' &&
          parent !== 'openspec'
        ) {
          pruneCandidates.add(parent);
          parent = parent.split('/').slice(0, -1).join('/');
        }
        pruneCandidates.add('openspec/schemas');
      }
      removed.push(relative);
    }
    // A schema-level record is not ownership of every current asset path. If a path is absent
    // from the per-file record, preserve and report it even when its bytes equal today's asset.
    for (const relative of [...assetContentByRelative.keys()].sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    )) {
      if (recordedSchema[relative] !== undefined) continue;
      const absolute = resolveInRepository(root, relative, 'the OpenSpec integration');
      if (await pathExists(absolute)) preserved.push(relative);
    }
    if (!dryRun) {
      // Deepest first, so a directory is only considered after its children were.
      const ordered = [...pruneCandidates].sort((a, b) => b.length - a.length);
      for (const relative of ordered) {
        const absolute = resolveInRepository(root, relative, 'the OpenSpec integration');
        try {
          const entries = await readdir(absolute);
          if (entries.length === 0) await rmdir(absolute);
        } catch (error) {
          if (!isNotFound(error)) throw error;
        }
      }
    }
  }

  const recordedRecovery = recordedRecoverySchemaFiles(previousMeta);
  if (recordedRecovery !== undefined) {
    const recoveryAssets = new Map(
      (await loadProductRecoverySchemaAssets()).map((asset) => [
        `${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}/${asset.relative}`,
        asset.content,
      ]),
    );
    for (const relative of Object.keys(recordedRecovery).sort()) {
      const absolute = resolveInRepository(root, relative, 'the OpenSpec integration');
      if (!(await pathExists(absolute))) continue;
      const existing = await readFile(absolute, 'utf8');
      const recordedDigest = recordedRecovery[relative];
      const proven =
        existing === recoveryAssets.get(relative) ||
        (recordedDigest !== '' && contentDigest(existing) === recordedDigest);
      if (!proven) {
        preserved.push(relative);
      } else {
        if (!dryRun) await rm(absolute, { force: true });
        removed.push(relative);
      }
    }
    if (!dryRun) {
      for (const relative of [
        `${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}/templates`,
        OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE,
        'openspec/schemas',
      ]) {
        const absolute = resolveInRepository(root, relative, 'the OpenSpec integration');
        try {
          if ((await readdir(absolute)).length === 0) await rmdir(absolute);
        } catch (error) {
          if (!isNotFound(error)) throw error;
        }
      }
    }
  }

  // Remove metadata file.
  if (await pathExists(metaPath(root))) {
    if (!dryRun) {
      await rm(metaPath(root), { force: true });
    }
    removed.push(META_RELATIVE);
  }

  return { removed, preserved };
}
