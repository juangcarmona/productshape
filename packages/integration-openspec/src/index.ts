/**
 * OpenSpec integration for Product Definition as Code.
 *
 * This module configures an existing OpenSpec workspace with PDaC citation rules by merging
 * guidance into `openspec/config.yaml`, and records metadata under `.product/integrations/`.
 * It never creates an OpenSpec plugin, never patches OpenSpec-generated commands or skills, and
 * never forks OpenSpec's default schema. The integration is configuration + deterministic
 * verification: consumer documents cite canonical product artifacts by id + digest, and
 * `prodshape citations verify` checks them.
 *
 * The merge logic is the heart of this module: it preserves every field the user authored
 * (schema, context, rules, operations, githubCopilot, and anything else) and only appends PDaC
 * guidance, deduplicating identical entries so the operation is idempotent.
 */
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parse, stringify } from 'yaml';
import { envWithLocalBin, isOpenSpecWorkspace, pathExists } from './workspace.js';

export { isOpenSpecWorkspace } from './workspace.js';
export {
  enumerateOpenSpecDocuments,
  isOpenSpecCliAvailable,
  openSpecProvider,
} from './population.js';

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
This repository uses Product Definition as Code (PDaC). The canonical product definition lives in docs/product/model (actors, journeys, use cases, business rules, domain terms, requirements) and is the single source of truth for product behaviour. OpenSpec artifacts are downstream consumers of it, never a second source of truth.
Consumers bind to canonical text through the PDaC Citation Contract: a citation records the target artifact id, a sha256 content digest, and an optional verification scenario anchor. Verification reports one status per citation: current, stale, tampered or unresolved.
To cite: run \`npx prodshape inspect <ID>\` to read the current digest, then \`npx prodshape cite --id <ID> --digest <digest>\` to emit the citation record. Place inline citations on their own line directly under the text they ground.
Every current OpenSpec document (proposal, specs, design, tasks and openspec/specs/) has exactly one effective scope state: bound (it carries at least one citation, or declares \`pdac-scope: cited\`), exempt (a human declared \`pdac-scope: none\` because the document has no product-semantic dependency), or unclassified (neither declared — a verification failure). Binding and exemption are human declarations: never declare \`pdac-scope: none\` merely because citations are missing, and a document declared \`pdac-scope: cited\` with zero citations fails. Verify with \`npx prodshape citations verify --provider openspec\`: it enumerates the expected document population, so zero discovered citations is a set of failures, never a pass. The scope gate applies to current documents; archived changes' citations are still verified, with their defects reported as warnings because history is immutable and its drift is information.
The accepted Product Definition changes only through this lifecycle: propose a Product Change under docs/product/changes/, validate its overlay while the baseline remains untouched, obtain human product approval, apply explicitly on a working branch, review the applied result in a pull request, and accept the resulting baseline by human merge. A Product Change is not a pull request. Apply is not acceptance, and neither apply nor merge attests implementation, verification, release or deployment. OpenSpec changes never edit docs/product/model directly. Product-definition work and implementation work have independent cadence: an OpenSpec change may share a pull request with an applied Product Change or follow an accepted definition later, but it remains a downstream implementation concern and never supplies Product Change status.
${PDAC_CONTEXT_END}`;

/** The PDaC citation rules injected per artifact into openspec/config.yaml `rules:`. */
export const PDAC_RULES: Record<string, string[]> = {
  proposal: [
    'State which PDaC artifacts this change touches, each with an inline citation emitted by `npx prodshape cite --id <ID> --digest <digest>`. Never write a citation record by hand.',
    'Identifying the impacted artifacts is a dedicated step before proposal content is written, not a side effect of writing it: run `npx prodshape impact <ID>` on every PDaC artifact this change touches and walk the reported direct and transitive neighbours, deciding for each whether this change derives from or alters it. Cite every impacted artifact from each document that derives from it, and list any examined-but-excluded neighbour in the proposal so the exclusion is visible, never silent.',
    'If the change implements altered product behaviour, name the Product Change (CHG id) whose applied or accepted artifacts it implements. If no overlay-validated and human-approved Product Change exists yet, stop and ask for one instead of proceeding. The OpenSpec change is not the Product Change.',
    'Every document of this change must end up bound or exempt: bind by citing the canonical text it depends on, or declare `pdac-scope: none` on a line of its own (frontmatter or `<!-- pdac-scope: none -->`) when a human judges the document has no product-semantic dependency. Never declare an exemption just because citations are missing.',
  ],
  specs: [
    'Every requirement derived from canonical product text MUST carry a citation to every PDaC artifact it derives from, one citation per line, placed after the requirement text and before the first scenario. A requirement often derives from more than one artifact; citing only the closest one silently hides the other derivations. Never place citations between the requirement heading and the requirement text; OpenSpec reads the first paragraph as the requirement.',
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
      'Before finishing, run `npx prodshape citations verify --provider openspec` and fix every stale, tampered or unresolved citation, every unclassified document and every bound document without citations. Refresh a stale digest by re-running `npx prodshape inspect <ID>`; never delete a citation or declare `pdac-scope: none` to silence a diagnostic.',
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
  installedAt: string;
  configPath: string;
  /** Absent in metadata written before the CI example existed; `integration update` adds it. */
  ciExamplePath?: string;
  /** Absent in metadata written before the field existed; treated as the current guidance. */
  managed?: ManagedStrings;
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
    '# - archived changes are verified too, but every defect found in archived material is',
    '#   reported as a warning: history is immutable, so its drift is information, not a',
    '#   defect this gate can make anyone fix. Pass --include-archived to hold archived',
    '#   documents to the full gate.',
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

function configPath(root: string): string {
  return join(root, ...CONFIG_RELATIVE.split('/'));
}

function metaPath(root: string): string {
  return join(root, ...META_RELATIVE.split('/'));
}

function ciExamplePath(root: string): string {
  return join(root, ...CI_EXAMPLE_RELATIVE.split('/'));
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
function runAtRoot(root: string, command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // Commands are typically .cmd shims on Windows; `shell: true` lets execFile find them on PATH
    // across platforms without callers needing to know the extension.
    execFile(
      command,
      args,
      { cwd: root, shell: true, env: envWithLocalBin(root) },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${command} ${args.join(' ')} failed: ${error.message}`));
          return;
        }
        resolve(`${stdout}${stderr}`);
      },
    );
  });
}

/**
 * Detect the installed OpenSpec CLI version by running `openspec --version`. When a repository
 * root is given, its node_modules/.bin is consulted first, so a devDependency install counts.
 */
export async function detectOpenSpecVersion(
  root?: string,
): Promise<{ version: string } | { error: string }> {
  return new Promise((resolve) => {
    // `openspec` is typically a .cmd shim on Windows; `shell: true` lets execFile find it on PATH
    // across platforms without callers needing to know the extension.
    execFile(
      'openspec',
      ['--version'],
      { shell: true, ...(root ? { env: envWithLocalBin(root) } : {}) },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            error: `OpenSpec CLI not found on PATH (run: npm install -g ${OPENSPEC_NPX_SPEC}). ${error.message}`,
          });
          return;
        }
        const output = `${stdout}${stderr}`.trim();
        // `openspec --version` prints something like "1.3.0" or "openspec/1.3.0 ...".
        const match = output.match(/(\d+\.\d+\.\d+(?:-[^\s]+)?)/);
        if (!match?.[1]) {
          resolve({ error: `Could not parse OpenSpec version from output: ${output}` });
          return;
        }
        resolve({ version: match[1] });
      },
    );
  });
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
 * - Idempotent: running twice produces the same result.
 * - `--dry-run` reports what would change without writing.
 * - `--force` re-merges even if the PDaC block is already present (useful after a PDaC upgrade).
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
  const { force = false, dryRun = false, warningsAsErrors = false } = options;

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

  const meta: OpenSpecIntegrationMeta = {
    provider: 'openspec',
    version: await productshapeVersion(),
    openspecVersion,
    installedAt: new Date().toISOString(),
    configPath: CONFIG_RELATIVE,
    ciExamplePath: CI_EXAMPLE_RELATIVE,
    managed: currentManagedStrings(),
  };

  if (changes.length === 0 && !force) {
    // Already up to date. Still record/refresh metadata.
    if (!dryRun) {
      await writeMeta(root, meta);
    }
    return { written: [], changes: [], meta };
  }

  const written: string[] = [];
  if (!dryRun) {
    if (configChanges.length > 0 || force) {
      const serialized = serializeConfig(config);
      await mkdir(dirname(configPath(root)), { recursive: true });
      await writeFile(configPath(root), serialized, 'utf8');
      written.push(CONFIG_RELATIVE);
    }
    if (ciChanged || force) {
      await mkdir(dirname(ciAbsolute), { recursive: true });
      await writeFile(ciAbsolute, ciDesired, 'utf8');
      written.push(CI_EXAMPLE_RELATIVE);
    }
    await writeMeta(root, meta);
    written.push(META_RELATIVE);
  }

  return { written, changes, meta };
}

/** Write the integration metadata file. */
async function writeMeta(root: string, meta: OpenSpecIntegrationMeta): Promise<void> {
  const path = metaPath(root);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
}

/** Read the integration metadata file, or null if absent. */
async function readMeta(root: string): Promise<OpenSpecIntegrationMeta | null> {
  const path = metaPath(root);
  if (!(await pathExists(path))) return null;
  return JSON.parse(await readFile(path, 'utf8')) as OpenSpecIntegrationMeta;
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
 */
export async function checkOpenSpecIntegration(root: string): Promise<{
  ok: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
}> {
  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // 1. OpenSpec CLI installed and supported.
  const detected = await detectOpenSpecVersion(root);
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
      detail: `Integration recorded (OpenSpec ${meta.openspecVersion}, installed ${meta.installedAt}).`,
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
 * - Deletes `.product/integrations/openspec.json`.
 * - `--dry-run` reports what would be removed without writing.
 */
export async function removeOpenSpecIntegration(
  root: string,
  options: { dryRun?: boolean } = {},
): Promise<{ removed: string[] }> {
  const { dryRun = false } = options;
  const removed: string[] = [];

  // Remove both what the metadata recorded as injected and what the current guidance would
  // inject: the union covers metadata written before the record existed as well as entries left
  // behind by an older ProductShape.
  const recorded = (await readMeta(root))?.managed;
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

  // Remove metadata file.
  if (await pathExists(metaPath(root))) {
    if (!dryRun) {
      await rm(metaPath(root), { force: true });
    }
    removed.push(META_RELATIVE);
  }

  return { removed };
}
