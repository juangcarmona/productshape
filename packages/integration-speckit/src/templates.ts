/**
 * Managed PDaC blocks for Spec Kit's project templates.
 *
 * This is the generation-time half of the integration. Spec Kit's specify, plan and tasks
 * commands resolve the project's templates (`.specify/templates/{spec,plan,tasks}-template.md`),
 * copy them into the feature directory and fill them "preserving section order and headings", so
 * a section merged into a template lands verbatim in every generated document and its
 * instructions are read by the generating agent at exactly the moment canonical text would
 * otherwise be paraphrased. Templates are project-owned customization surfaces (Spec Kit ships
 * them with "ACTION REQUIRED" placeholders and resolves overrides through presets), so merging a
 * sentinel-delimited block preserves the same ownership rules as the OpenSpec config merge:
 * user content is never touched, the block is replaced in place on update and stripped on
 * removal.
 *
 * The block texts deliberately never contain a parseable citation (`{pdac:cite ...}` or a
 * pdac:cite marker comment), a scope-declaration comment or a drift-marker comment: the blocks
 * are copied into enumerated consumer documents, and a literal example would classify or cite by
 * accident. The exact syntaxes live in the guidance memory file the blocks point to.
 */

/** Sentinels that bracket a managed PDaC template block. */
export const PDAC_TEMPLATE_BEGIN = '<!-- pdac:template begin -->';
export const PDAC_TEMPLATE_END = '<!-- pdac:template end -->';

function block(lines: string[]): string {
  return [PDAC_TEMPLATE_BEGIN, ...lines, PDAC_TEMPLATE_END].join('\n');
}

/** The managed block merged into `spec-template.md`, and thus into every generated spec.md. */
export const PDAC_SPEC_TEMPLATE_BLOCK = block([
  '## Product Grounding (PDaC)',
  '',
  '<!--',
  '  ACTION REQUIRED: this repository keeps its accepted product definition as code',
  '  (docs/product/model). Ground this specification in it instead of restating it:',
  '  1. Identify the product artifacts this feature implements or constrains. Start from',
  '     `npx prodshape context <ID> [<ID>...]` when the IDs are known; explore with',
  '     `npx prodshape impact <ID>` and `npx prodshape inspect <ID>`.',
  '  2. Under every requirement derived from canonical product text, place a citation line',
  '     emitted by `npx prodshape cite --id <ID> --digest <digest>`. Never write a citation',
  '     record by hand, never invent ids or digests, and never paraphrase canonical text as if',
  '     it were new.',
  '  3. If this feature has no product-semantic dependency, a human replaces this section with',
  '     the reasoned exemption declaration `pdac-scope: none` (see .specify/memory/pdac.md for the exact',
  '     form). Never declare the exemption just because citations are missing.',
  '  4. If the feature needs behaviour the product definition does not describe, or contradicts',
  '     it, record the divergence here as a "Product definition drift" note carrying the',
  '     pdac-drift marker (exact form in .specify/memory/pdac.md). Humans resolve drift through',
  '     a Product Change; never fix it quietly.',
  '  Verification: `npx prodshape citations verify --provider speckit` must report this document',
  '  bound or exempt, with every citation current, before the feature is considered specified.',
  '-->',
  '',
  '[List the cited product artifacts this specification derives from]',
]);

/** The managed block merged into `plan-template.md`, and thus into every generated plan.md. */
export const PDAC_PLAN_TEMPLATE_BLOCK = block([
  '## Product Grounding Check (PDaC)',
  '',
  '<!--',
  '  GATE, alongside the Constitution Check: a plan decision that depends on canonical product',
  '  text cites the artifact it depends on (emit with `npx prodshape cite --id <ID> --digest',
  '  <digest>`); it never restates the product definition. Before Phase 0, confirm the feature',
  "  spec's citations are current with `npx prodshape citations verify --provider speckit`;",
  '  planning against a stale citation builds on meaning that has already moved. If this plan',
  '  has no product-semantic dependency, a human replaces this section with the exemption',
  '  reasoned declaration `pdac-scope: none` (exact form in .specify/memory/pdac.md).',
  '-->',
  '',
  '[List the cited product artifacts this plan depends on, or the exemption]',
]);

/** The managed block merged into `tasks-template.md`, and thus into every generated tasks.md. */
export const PDAC_TASKS_TEMPLATE_BLOCK = block([
  '## Product Grounding (PDaC)',
  '',
  '<!--',
  '  A task that implements or changes behaviour derived from canonical product text carries a',
  '  citation to that artifact (emit with `npx prodshape cite --id <ID> --digest <digest>`). A',
  '  task that changes cited behaviour includes a follow-up task to refresh the affected',
  '  citations. Never infer implementation, verification, release or deployment from Product',
  '  Change status. If this task list has no product-semantic dependency, a human replaces this',
  '  section with the reasoned exemption declaration `pdac-scope: none` (exact form in',
  '  .specify/memory/pdac.md).',
  '-->',
  '',
  '[List the cited product artifacts these tasks touch, or the exemption]',
]);

/** The Spec Kit template files this integration manages a block in, with their blocks. */
export const MANAGED_TEMPLATES: ReadonlyArray<{ relative: string; block: string }> = [
  { relative: '.specify/templates/spec-template.md', block: PDAC_SPEC_TEMPLATE_BLOCK },
  { relative: '.specify/templates/plan-template.md', block: PDAC_PLAN_TEMPLATE_BLOCK },
  { relative: '.specify/templates/tasks-template.md', block: PDAC_TASKS_TEMPLATE_BLOCK },
];

/** Extract the managed block (between sentinels) from template content, or null if absent. */
export function extractTemplateBlock(content: string): string | null {
  const begin = content.indexOf(PDAC_TEMPLATE_BEGIN);
  const end = content.indexOf(PDAC_TEMPLATE_END);
  if (begin === -1 || end === -1 || end < begin) return null;
  return content.slice(begin, end + PDAC_TEMPLATE_END.length);
}

/**
 * Merge the managed block into template content: replace an existing block in place, otherwise
 * append after a blank line. User-authored content is never modified. Returns the merged content
 * and whether anything changed (idempotent when the current block is already present).
 */
export function mergeTemplateBlock(
  content: string,
  desiredBlock: string,
): { content: string; changed: boolean } {
  const existing = extractTemplateBlock(content);
  if (existing !== null) {
    if (existing === desiredBlock) return { content, changed: false };
    return { content: content.replace(existing, desiredBlock), changed: true };
  }
  const separator = content.endsWith('\n') ? '\n' : '\n\n';
  return { content: `${content}${separator}${desiredBlock}\n`, changed: true };
}

/**
 * Strip the managed block from template content. Returns the cleaned content and whether
 * anything was removed.
 */
export function removeTemplateBlock(content: string): { content: string; changed: boolean } {
  const existing = extractTemplateBlock(content);
  if (existing === null) return { content, changed: false };
  const cleaned = content.replace(existing, '').replace(/\n{3,}/g, '\n\n');
  return { content: cleaned, changed: true };
}
