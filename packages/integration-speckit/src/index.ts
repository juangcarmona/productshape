/**
 * Spec Kit integration for Product Definition as Code.
 *
 * This module configures an existing Spec Kit workspace with PDaC citation guidance by writing
 * one fully managed memory file (`.specify/memory/pdac.md`) and recording metadata under
 * `.product/integrations/`. It never touches `.specify/memory/constitution.md` (the constitution
 * governs how software is built and must not carry product intent), never patches Spec Kit's
 * templates or scripts, and never writes into `specs/` feature directories. The integration is
 * configuration + deterministic verification: consumer documents cite canonical product
 * artifacts by id + digest, and `prodshape citations verify --provider speckit` checks them.
 *
 * Spec Kit installs through its own tooling (`specify init`); this integration requires the
 * workspace to exist and never creates it.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isSpecKitWorkspace, pathExists } from './workspace.js';

export { isSpecKitWorkspace } from './workspace.js';
export { enumerateSpecKitDocuments, specKitProvider } from './population.js';

/** Repository-relative paths used by this integration. */
const MEMORY_RELATIVE = '.specify/memory/pdac.md';
const META_RELATIVE = '.product/integrations/speckit.json';
const CI_EXAMPLE_RELATIVE = '.product/integrations/speckit.ci.yml';

/** The repository-relative path of the managed guidance memory file. */
export const SPECKIT_MEMORY_RELATIVE = MEMORY_RELATIVE;

/** The repository-relative path of the integration metadata file, for callers that probe it. */
export const SPECKIT_META_RELATIVE = META_RELATIVE;

/** The repository-relative path of the installed CI-ready example workflow. */
export const SPECKIT_CI_EXAMPLE_RELATIVE = CI_EXAMPLE_RELATIVE;

/** The exact provider-aware verification command the integration stands behind. */
export const SPECKIT_VERIFY_COMMAND = 'npx prodshape citations verify --provider speckit';

/**
 * The managed PDaC guidance memory file, written verbatim at {@link SPECKIT_MEMORY_RELATIVE}.
 * The whole file is managed: it carries no user content, so add/update compare and rewrite it as
 * one unit. It instructs the agents that execute the Spec Kit specify, plan and tasks commands;
 * it is workflow instruction, never product intent — intent stays in the canonical model and
 * reaches a feature through citations.
 */
export const PDAC_SPECKIT_GUIDANCE = `# Product Definition as Code (PDaC) guidance for this Spec Kit workspace

<!-- Managed by \`prodshape integration add speckit\`. Do not edit; changes are overwritten by \`prodshape integration update\`. -->

This repository uses Product Definition as Code. The canonical product definition lives in
docs/product/model (actors, journeys, use cases, business rules, domain terms, requirements).
Spec Kit artifacts consume it and are never a second source of truth. The constitution
(.specify/memory/constitution.md) governs how software is built here; it never carries product
intent, and this file never modifies it.

## Citations bind

A citation binds consumer text to a canonical artifact: it records the artifact id, a sha256
content digest and an optional verification scenario anchor. Verification reports one status per
citation: current, stale, tampered or unresolved.

To cite: run \`npx prodshape inspect <ID>\` to read the current digest, then
\`npx prodshape cite --id <ID> --digest <digest>\` to emit the citation record. Place inline
citations on their own line directly under the text they ground. Never write a citation record by
hand, and never invent artifact ids or digests.

## Before specifying a feature

Start from cited product context, not from paraphrase. Run
\`npx prodshape context <ID> [<ID>...]\` for the product artifacts the feature implements; the
projection carries the relevant canonical excerpts with their citation records attached. Feed it
to the Spec Kit specify command and keep the citations in the generated spec.md. To find which
artifacts a feature depends on, compare its intent with the whole product definition first, then
widen the result with \`npx prodshape impact <ID>\`.

## While writing spec.md, plan.md and tasks.md

- Every requirement derived from canonical product text carries a citation to every PDaC artifact
  it derives from, not only the closest one, one citation per line under the text it grounds.
- When a plan decision depends on canonical product text, cite the artifact it depends on.
- A task that changes cited behaviour includes a follow-up task to refresh the affected citations.
- Every gated document (spec.md, plan.md, tasks.md) of a feature must end up bound or exempt:
  bind by citing the canonical text it depends on, or declare \`pdac-scope: none\` on a line of its
  own (frontmatter or \`<!-- pdac-scope: none -->\`) when a human judges the document has no
  product-semantic dependency. Never declare an exemption just because citations are missing.

## Drift

If a feature's goals contradict the product definition, or need behaviour it does not describe,
that is product-definition drift. Record it in spec.md under a 'Product definition drift' note
naming the artifacts involved, with the marker
\`<!-- pdac-drift ids="<ID>[, <ID>...]" summary="<one line>" -->\` on its own line so
\`npx prodshape drift --provider speckit\` can list it. The decision is human: propose a Product
Change or adjust the feature. Never fix drift quietly, drop or weaken a citation to hide it, or
write around the conflict. Spec Kit never edits docs/product/model: the accepted definition
changes only through a Product Change under docs/product/changes/.

## Before finishing a feature

Run \`${SPECKIT_VERIFY_COMMAND}\` and fix every stale, tampered or unresolved citation, every
unclassified document and every bound document without citations. Refresh a stale digest by
re-running \`npx prodshape inspect <ID>\`; never delete a citation or declare \`pdac-scope: none\`
to silence a diagnostic.
`;

/** Metadata recorded under .product/integrations/speckit.json. */
export interface SpecKitIntegrationMeta {
  provider: 'speckit';
  version: string;
  installedAt: string;
  memoryPath: string;
  ciExamplePath: string;
}

/**
 * Render the CI-ready example workflow installed at {@link SPECKIT_CI_EXAMPLE_RELATIVE}.
 *
 * The gate always blocks unresolved citations, tampered embedded projections, unclassified
 * gated documents and bound documents with zero citations. Stale citations follow the
 * repository's configured warning policy (`validation.warnings-as-errors` in
 * `.product/config.yaml`); the example never changes that policy, but it states explicitly what
 * the repository's current choice means and how to escalate it.
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
    '# PDaC citation gate for Spec Kit consumer documents (CI-ready example).',
    '# Managed by `prodshape integration add speckit`; copy it into your pipeline',
    '# (e.g. .github/workflows/) and adapt the triggers.',
    '#',
    '# The gate runs ProductShape citation and scope verification only, enumerating the',
    '# spec.md, plan.md and tasks.md of every feature directory under specs/. Spec Kit has no',
    '# enumeration CLI, so nothing beyond Node.js needs installing here.',
    '#',
    '# Blocking behaviour:',
    '# - unresolved citations, tampered embedded projections, unclassified gated documents',
    '#   and bound documents with zero citations always fail the gate;',
    ...stalePolicy,
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
    `      - run: ${SPECKIT_VERIFY_COMMAND}`,
    '',
  ].join('\n');
}

function memoryPath(root: string): string {
  return join(root, ...MEMORY_RELATIVE.split('/'));
}

function metaPath(root: string): string {
  return join(root, ...META_RELATIVE.split('/'));
}

function ciExamplePath(root: string): string {
  return join(root, ...CI_EXAMPLE_RELATIVE.split('/'));
}

/** Read the ProductShape version from the integration-speckit package.json. */
async function productshapeVersion(): Promise<string> {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version: string };
  return packageJson.version;
}

/** Check if the Spec Kit integration is installed (its metadata file is present). */
export async function isSpecKitIntegrationInstalled(root: string): Promise<boolean> {
  return pathExists(metaPath(root));
}

/** Write the integration metadata file. */
async function writeMeta(root: string, meta: SpecKitIntegrationMeta): Promise<void> {
  const path = metaPath(root);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
}

/** Read the integration metadata file, or null if absent. */
export async function readSpecKitIntegrationMeta(
  root: string,
): Promise<SpecKitIntegrationMeta | null> {
  const path = metaPath(root);
  if (!(await pathExists(path))) return null;
  return JSON.parse(await readFile(path, 'utf8')) as SpecKitIntegrationMeta;
}

/**
 * Add the Spec Kit integration to a repository.
 *
 * - Requires an existing `.specify/` workspace (run `specify init` first); never creates one.
 * - Writes the fully managed guidance file at `.specify/memory/pdac.md`.
 * - Installs the CI-ready example at `.product/integrations/speckit.ci.yml`.
 * - Records metadata under `.product/integrations/speckit.json`.
 * - Idempotent: running twice produces the same result and reports no changes.
 * - `--dry-run` reports what would change without writing.
 * - `--force` rewrites managed files even when their content already matches.
 */
export async function addSpecKitIntegration(
  root: string,
  options: {
    force?: boolean;
    dryRun?: boolean;
    /**
     * The repository's configured `validation.warnings-as-errors` policy, reflected verbatim in
     * the installed CI example so its blocking behaviour is stated, never silently changed.
     */
    warningsAsErrors?: boolean;
  } = {},
): Promise<{ written: string[]; changes: string[]; meta: SpecKitIntegrationMeta }> {
  const { force = false, dryRun = false, warningsAsErrors = false } = options;

  if (!(await isSpecKitWorkspace(root))) {
    throw new Error(
      'No Spec Kit workspace found (.specify/ missing). Run `specify init` first; see https://github.com/github/spec-kit.',
    );
  }

  const memoryAbsolute = memoryPath(root);
  const memoryExisting = (await pathExists(memoryAbsolute))
    ? await readFile(memoryAbsolute, 'utf8')
    : null;
  const memoryChanged = memoryExisting !== PDAC_SPECKIT_GUIDANCE;

  const ciDesired = renderCiExample({ warningsAsErrors });
  const ciAbsolute = ciExamplePath(root);
  const ciExisting = (await pathExists(ciAbsolute)) ? await readFile(ciAbsolute, 'utf8') : null;
  const ciChanged = ciExisting !== ciDesired;

  const changes: string[] = [];
  if (memoryChanged) {
    changes.push(
      memoryExisting === null
        ? `Installed PDaC guidance at ${MEMORY_RELATIVE}.`
        : `Updated PDaC guidance at ${MEMORY_RELATIVE}.`,
    );
  }
  if (ciChanged) {
    changes.push(
      ciExisting === null
        ? `Installed CI-ready verification example at ${CI_EXAMPLE_RELATIVE}.`
        : `Updated CI-ready verification example at ${CI_EXAMPLE_RELATIVE}.`,
    );
  }

  const meta: SpecKitIntegrationMeta = {
    provider: 'speckit',
    version: await productshapeVersion(),
    installedAt: new Date().toISOString(),
    memoryPath: MEMORY_RELATIVE,
    ciExamplePath: CI_EXAMPLE_RELATIVE,
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
    if (memoryChanged || force) {
      await mkdir(dirname(memoryAbsolute), { recursive: true });
      await writeFile(memoryAbsolute, PDAC_SPECKIT_GUIDANCE, 'utf8');
      written.push(MEMORY_RELATIVE);
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

/**
 * Update (rewrite) the Spec Kit integration so a PDaC upgrade that changed the guidance or the
 * CI example is reflected. Idempotent.
 */
export async function updateSpecKitIntegration(
  root: string,
  options: { force?: boolean; dryRun?: boolean; warningsAsErrors?: boolean } = {},
): Promise<{ written: string[]; changes: string[] }> {
  const result = await addSpecKitIntegration(root, {
    force: true,
    dryRun: options.dryRun,
    warningsAsErrors: options.warningsAsErrors,
  });
  return { written: result.written, changes: result.changes };
}

/**
 * Check the Spec Kit integration health. Verifies:
 * - the `.specify/` workspace exists;
 * - the managed guidance file exists and matches the current PDaC guidance;
 * - the CI-ready example is present;
 * - the `.product/integrations/speckit.json` metadata exists.
 */
export async function checkSpecKitIntegration(root: string): Promise<{
  ok: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
}> {
  const checks: { name: string; ok: boolean; detail: string }[] = [];

  if (await isSpecKitWorkspace(root)) {
    checks.push({ name: 'workspace', ok: true, detail: 'Spec Kit workspace (.specify/) present.' });
  } else {
    checks.push({
      name: 'workspace',
      ok: false,
      detail: 'No Spec Kit workspace (.specify/ missing). Run `specify init` first.',
    });
  }

  const memoryAbsolute = memoryPath(root);
  if (!(await pathExists(memoryAbsolute))) {
    checks.push({
      name: 'guidance',
      ok: false,
      detail: `PDaC guidance missing (${MEMORY_RELATIVE}). Run: prodshape integration add speckit`,
    });
  } else if ((await readFile(memoryAbsolute, 'utf8')) !== PDAC_SPECKIT_GUIDANCE) {
    checks.push({
      name: 'guidance',
      ok: false,
      detail: `PDaC guidance at ${MEMORY_RELATIVE} is outdated or edited. Run: prodshape integration update`,
    });
  } else {
    checks.push({ name: 'guidance', ok: true, detail: 'PDaC guidance present and current.' });
  }

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

  const meta = await readSpecKitIntegrationMeta(root);
  if (meta === null) {
    checks.push({
      name: 'metadata',
      ok: false,
      detail: `${META_RELATIVE} not found. Run: prodshape integration add speckit`,
    });
  } else {
    checks.push({
      name: 'metadata',
      ok: true,
      detail: `Integration recorded (ProductShape ${meta.version}, installed ${meta.installedAt}).`,
    });
  }

  const ok = checks.every((c) => c.ok);
  return { ok, checks };
}

/**
 * Remove the Spec Kit integration: the managed guidance file, the CI example and the metadata
 * file. Native Spec Kit files and feature directories are never touched. `--dry-run` reports
 * what would be removed without deleting.
 */
export async function removeSpecKitIntegration(
  root: string,
  options: { dryRun?: boolean } = {},
): Promise<{ removed: string[] }> {
  const { dryRun = false } = options;
  const removed: string[] = [];

  for (const relativePath of [MEMORY_RELATIVE, CI_EXAMPLE_RELATIVE, META_RELATIVE]) {
    const absolute = join(root, ...relativePath.split('/'));
    if (await pathExists(absolute)) {
      if (!dryRun) {
        await rm(absolute, { force: true });
      }
      removed.push(relativePath);
    }
  }

  return { removed };
}
