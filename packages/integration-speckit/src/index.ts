/**
 * Spec Kit integration for Product Definition as Code.
 *
 * This module configures an existing Spec Kit workspace on two surfaces, both official
 * customization points, and records metadata under `.product/integrations/`:
 *
 * - One fully managed memory file (`.specify/memory/pdac.md`) carrying the complete PDaC
 *   guidance and the exact citation, scope and drift syntaxes.
 * - A sentinel-delimited PDaC block merged into each project template
 *   (`.specify/templates/{spec,plan,tasks}-template.md`). Spec Kit's commands copy the resolved
 *   template into every generated document, so the block reaches the generating agent at
 *   authoring time — the moment canonical text would otherwise be paraphrased. User-authored
 *   template content is preserved; removal strips exactly the block.
 *
 * It never touches `.specify/memory/constitution.md` (the constitution governs how software is
 * built and must not carry product intent; a citation-discipline principle there is the human's
 * to add), never patches Spec Kit's scripts or generated agent command definitions, and never
 * writes into `specs/` feature directories. The hard gate stays deterministic verification:
 * consumer documents cite canonical product artifacts by id + digest, and
 * `prodshape citations verify --provider speckit` checks them over the enumerated population.
 *
 * Spec Kit installs through its own tooling (`specify init`); this integration requires the
 * workspace to exist and never creates it.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isNotFound, resolveInRepository } from '@prodshape/core';
import {
  MANAGED_TEMPLATES,
  extractTemplateBlock,
  mergeTemplateBlock,
  removeTemplateBlock,
} from './templates.js';
import { isSpecKitWorkspace, pathExists } from './workspace.js';

export { isSpecKitWorkspace } from './workspace.js';
export {
  SPECKIT_PRODUCT_ROOT,
  SPECKIT_PRODUCT_CHANGES,
  SPECKIT_PRODUCT_ARCHIVE,
  SPECKIT_RECOVERY_ROOT,
  archiveSpecKitProductChange,
  applySpecKitProductChange,
  createSpecKitProductChange,
  listSpecKitProductChanges,
  loadSpecKitProductChange,
  nextSpecKitRecoveryBatch,
  startSpecKitRecovery,
  validateSpecKitProductChange,
} from './product-workflow.js';
export { enumerateSpecKitDocuments, specKitProvider } from './population.js';
export {
  MANAGED_TEMPLATES,
  PDAC_PLAN_TEMPLATE_BLOCK,
  PDAC_SPEC_TEMPLATE_BLOCK,
  PDAC_TASKS_TEMPLATE_BLOCK,
  PDAC_TEMPLATE_BEGIN,
  PDAC_TEMPLATE_END,
  extractTemplateBlock,
  mergeTemplateBlock,
  removeTemplateBlock,
} from './templates.js';

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
docs/product/model (actors, journeys, use cases, business rules, domain terms, bounded contexts,
structured behaviours, and functional, quality and constraint requirements). Spec Kit artifacts
consume it and are never a second source of truth. The constitution
(.specify/memory/constitution.md) governs how software is built here; it never carries product
intent, and this file never modifies it.

## Citations bind

A citation binds consumer text to a canonical artifact: it records the artifact id, a sha256
content digest and an optional verification scenario anchor. Verification reports one status per
citation: current, stale, tampered or unresolved.

To cite: run \`npx prodshape inspect <ID>\` to read the current digest, then
\`npx prodshape cite --id <ID> --digest <digest>\` to emit the canonical payload. Wrap it in the
document's native comment (\`<!-- ... -->\` in Markdown) on its own line directly under the text
it grounds. Never write a citation record by hand, and never invent artifact ids or digests.

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
- Every gated document (spec.md, plan.md, tasks.md) of a feature must end up bound or exempt,
  each with an explicit declaration. A declaration is only read from one of two carriers: an HTML
  comment on a line of its own, or a key in the document's YAML frontmatter. A bare
  \`pdac-scope: cited\` line in the body is not a declaration and leaves the document
  unclassified. Spec Kit's generated documents have no frontmatter, so the HTML comment is the
  form to write:
  - Bound: \`<!-- pdac-scope: cited -->\`, plus a citation of the canonical text the document
    depends on. Citations alone never bind, and the declaration alone never binds either.
  - Exempt: \`<!-- pdac-scope: none reason="<why>" -->\` with a non-empty reason, when a human
    judges the document has no product-semantic dependency. Never declare an exemption just
    because citations are missing.
  In a document that does carry frontmatter, \`pdac-scope: <value>\` with \`pdac-scope-reason:
  <why>\` as frontmatter keys is equivalent.

## Drift

If a feature's goals contradict the product definition, or need behaviour it does not describe,
that is product-definition drift. Record it in spec.md under a 'Product definition drift' note
naming the artifacts involved, with the marker
\`<!-- pdac-drift ids="<ID>[, <ID>...]" summary="<one line>" -->\` on its own line so
\`npx prodshape drift --provider speckit\` can list it. The decision is human: propose a Product
Change or adjust the feature. Never fix drift quietly, drop or weaken a citation to hide it, or
write around the conflict. Spec Kit never edits docs/product/model: the accepted definition
changes only through a Product Change under docs/product/changes/.

## The Product Grounding sections

The integration merges a managed "Product Grounding (PDaC)" section into this workspace's spec,
plan and tasks templates, so every generated document carries it. Fill it: replace its
placeholder with the citations the document depends on, or (a human decision only) with the
exemption declaration. Never delete the section without doing one of the two; a gated document
with neither is unclassified and fails verification.

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
  /**
   * When the integration was first installed. Preserved across every later add, update and no-op:
   * an install date that moves on each invocation records nothing, and rewriting it made every
   * no-op command dirty the working tree.
   */
  installedAt: string;
  /**
   * When managed content last actually changed. Absent until the first change after installation;
   * written only when a managed file or the merged template blocks differed, so a no-op leaves
   * this file byte-identical. It answers the question `installedAt` cannot: whether this
   * installation has been regenerated since a ProductShape upgrade.
   */
  updatedAt?: string;
  memoryPath: string;
  ciExamplePath: string;
  /** The Spec Kit template files a managed PDaC block was merged into (repository-relative). */
  templatePaths: string[];
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

/**
 * Every path this integration writes is one of its own module-level literals, resolved through the
 * repository-containment resolver rather than joined directly, so the contract is enforced by the
 * same code that enforces it for repository-supplied paths instead of by inspection of this file.
 */
function memoryPath(root: string): string {
  return resolveInRepository(root, MEMORY_RELATIVE, 'the Spec Kit integration');
}

function metaPath(root: string): string {
  return resolveInRepository(root, META_RELATIVE, 'the Spec Kit integration');
}

function ciExamplePath(root: string): string {
  return resolveInRepository(root, CI_EXAMPLE_RELATIVE, 'the Spec Kit integration');
}

function templatePath(root: string, relative: string): string {
  return resolveInRepository(root, relative, 'the Spec Kit integration');
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

/**
 * Write the integration metadata file, but only when its bytes would change. Reports whether it
 * was written, so a caller never claims a write that did not happen.
 */
async function writeMetaIfChanged(root: string, meta: SpecKitIntegrationMeta): Promise<boolean> {
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
 * file that is present and unreadable is not: continuing as though it were absent would reinstall
 * over an installation whose recorded history was just discarded.
 */
export class SpecKitMetaError extends Error {
  constructor(detail: string, options?: { cause?: unknown }) {
    super(
      `Spec Kit integration metadata ${META_RELATIVE} cannot be trusted: ${detail}` +
        '\nReconcile it by hand, or remove it and re-run: prodshape integration add speckit',
      options,
    );
    this.name = 'SpecKitMetaError';
  }
}

/** Read the integration metadata file, or null if absent. Unreadable or malformed is an error. */
export async function readSpecKitIntegrationMeta(
  root: string,
): Promise<SpecKitIntegrationMeta | null> {
  const path = metaPath(root);
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if (isNotFound(error)) return null;
    throw new SpecKitMetaError(
      `it exists but could not be read (${error instanceof Error ? error.message : String(error)})`,
      { cause: error },
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new SpecKitMetaError(
      `it is not valid JSON (${error instanceof Error ? error.message : String(error)})`,
      { cause: error },
    );
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new SpecKitMetaError('the document is not a JSON object');
  }
  const record = parsed as Record<string, unknown>;
  if (record.provider !== 'speckit' || typeof record.installedAt !== 'string') {
    throw new SpecKitMetaError(
      "it does not match the metadata schema ('provider' must be 'speckit' and 'installedAt' a string)",
    );
  }
  return record as unknown as SpecKitIntegrationMeta;
}

/**
 * Add the Spec Kit integration to a repository.
 *
 * - Requires an existing `.specify/` workspace (run `specify init` first); never creates one.
 * - Writes the fully managed guidance file at `.specify/memory/pdac.md`.
 * - Merges the managed PDaC block into each project template the workspace has
 *   (`.specify/templates/{spec,plan,tasks}-template.md`), preserving user-authored content.
 * - Installs the CI-ready example at `.product/integrations/speckit.ci.yml`.
 * - Records metadata under `.product/integrations/speckit.json`.
 * - Byte-idempotent: running twice produces the same result, reports no changes and rewrites
 *   nothing at all — not the managed files, not the templates, not the metadata.
 * - `--dry-run` reports what would change without writing.
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
  // `force` is accepted for signature compatibility with the other integrations and deliberately
  // ignored: every managed surface here is compared by content, so there is nothing a forced run
  // could regenerate that a normal one does not. It used to mean "rewrite even when identical",
  // which is exactly the byte-churn this integration must not produce.
  const { dryRun = false, warningsAsErrors = false } = options;

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

  // Generation-time enforcement: merge the managed PDaC block into each Spec Kit template the
  // workspace has. Spec Kit copies the resolved template into every generated document, so the
  // block reaches the generating agent at authoring time. A template the workspace lacks is
  // simply not applicable; a template Spec Kit later restores (e.g. `specify init --force`)
  // loses the block, which `check` reports and `update` re-merges.
  const templateMerges: Array<{ relative: string; absolute: string; content: string }> = [];
  const templatePaths: string[] = [];
  for (const managed of MANAGED_TEMPLATES) {
    const absolute = templatePath(root, managed.relative);
    if (!(await pathExists(absolute))) continue;
    templatePaths.push(managed.relative);
    const merged = mergeTemplateBlock(await readFile(absolute, 'utf8'), managed.block);
    if (merged.changed) {
      templateMerges.push({ relative: managed.relative, absolute, content: merged.content });
    }
  }

  const changes: string[] = [];
  if (memoryChanged) {
    changes.push(
      memoryExisting === null
        ? `Installed PDaC guidance at ${MEMORY_RELATIVE}.`
        : `Updated PDaC guidance at ${MEMORY_RELATIVE}.`,
    );
  }
  for (const merge of templateMerges) {
    changes.push(`Merged the PDaC block into ${merge.relative}.`);
  }
  if (ciChanged) {
    changes.push(
      ciExisting === null
        ? `Installed CI-ready verification example at ${CI_EXAMPLE_RELATIVE}.`
        : `Updated CI-ready verification example at ${CI_EXAMPLE_RELATIVE}.`,
    );
  }

  // `installedAt` records when this integration was first installed, and is preserved from here
  // on. Stamping a fresh timestamp on every invocation is what made a no-op `add` — and every
  // `integration update` — rewrite this file, so a command that reported "already up to date"
  // still left the working tree dirty. `updatedAt` carries the moving fact instead, and moves
  // only when managed content actually changed.
  const previous = await readSpecKitIntegrationMeta(root);
  const now = new Date().toISOString();
  const meta: SpecKitIntegrationMeta = {
    provider: 'speckit',
    version: await productshapeVersion(),
    installedAt: previous?.installedAt ?? now,
    memoryPath: MEMORY_RELATIVE,
    ciExamplePath: CI_EXAMPLE_RELATIVE,
    templatePaths,
  };
  const updatedAt =
    changes.length > 0 && previous !== null ? now : (previous?.updatedAt ?? undefined);
  if (updatedAt !== undefined) meta.updatedAt = updatedAt;

  const written: string[] = [];
  if (!dryRun) {
    // Every write below is conditional on the bytes actually differing. `force` re-derives the
    // content; it does not license rewriting a file that already carries exactly that content,
    // because a byte-identical rewrite is invisible in a diff and visible everywhere else — in
    // Git's stat cache, in file watchers, and in every build that keys off modification times.
    if (memoryChanged) {
      await mkdir(dirname(memoryAbsolute), { recursive: true });
      await writeFile(memoryAbsolute, PDAC_SPECKIT_GUIDANCE, 'utf8');
      written.push(MEMORY_RELATIVE);
    }
    for (const merge of templateMerges) {
      await writeFile(merge.absolute, merge.content, 'utf8');
      written.push(merge.relative);
    }
    if (ciChanged) {
      await mkdir(dirname(ciAbsolute), { recursive: true });
      await writeFile(ciAbsolute, ciDesired, 'utf8');
      written.push(CI_EXAMPLE_RELATIVE);
    }
    if (await writeMetaIfChanged(root, meta)) {
      written.push(META_RELATIVE);
    }
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

  for (const managed of MANAGED_TEMPLATES) {
    const absolute = templatePath(root, managed.relative);
    if (!(await pathExists(absolute))) {
      checks.push({
        name: `template: ${managed.relative}`,
        ok: true,
        detail: 'Template not present in this workspace; PDaC block not applicable.',
      });
      continue;
    }
    const existing = extractTemplateBlock(await readFile(absolute, 'utf8'));
    if (existing === managed.block) {
      checks.push({
        name: `template: ${managed.relative}`,
        ok: true,
        detail: 'PDaC block present and current.',
      });
    } else if (existing === null) {
      checks.push({
        name: `template: ${managed.relative}`,
        ok: false,
        detail:
          'PDaC block missing (was the template regenerated by Spec Kit?). Run: prodshape integration update',
      });
    } else {
      checks.push({
        name: `template: ${managed.relative}`,
        ok: false,
        detail: 'PDaC block outdated or edited. Run: prodshape integration update',
      });
    }
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
      detail:
        `Integration recorded (ProductShape ${meta.version}, installed ${meta.installedAt}` +
        `${meta.updatedAt ? `, updated ${meta.updatedAt}` : ''}).`,
    });
  }

  const ok = checks.every((c) => c.ok);
  return { ok, checks };
}

/**
 * Remove the Spec Kit integration: strip the managed PDaC block from each template that carries
 * one, and delete the managed guidance file, the CI example and the metadata file. User-authored
 * template content, other native Spec Kit files and feature directories are never touched.
 * `--dry-run` reports what would be removed without writing.
 */
export async function removeSpecKitIntegration(
  root: string,
  options: { dryRun?: boolean } = {},
): Promise<{ removed: string[] }> {
  const { dryRun = false } = options;
  const removed: string[] = [];

  for (const managed of MANAGED_TEMPLATES) {
    const absolute = templatePath(root, managed.relative);
    if (!(await pathExists(absolute))) continue;
    const stripped = removeTemplateBlock(await readFile(absolute, 'utf8'));
    if (stripped.changed) {
      if (!dryRun) {
        await writeFile(absolute, stripped.content, 'utf8');
      }
      removed.push(managed.relative);
    }
  }

  for (const relativePath of [MEMORY_RELATIVE, CI_EXAMPLE_RELATIVE, META_RELATIVE]) {
    const absolute = resolveInRepository(root, relativePath, 'the Spec Kit integration');
    if (await pathExists(absolute)) {
      if (!dryRun) {
        await rm(absolute, { force: true });
      }
      removed.push(relativePath);
    }
  }

  return { removed };
}
