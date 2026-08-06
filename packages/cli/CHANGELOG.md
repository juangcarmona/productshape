# @prodshape/cli

## 0.7.0

### Minor Changes

- 5c1b1ac: Product Changes: `PRODUCT028`, a `superseded/` archive, and a product diff that names its impact

  The specification's second refinement of RFC 4 determined the five points that previously did not fix an implementation's behaviour. Two of them override the defaults this toolkit chose, and three are confirmed with the behaviour made explicit.

  - **`PRODUCT028`** — applying a Product Change whose status is not `approved` now reports the diagnostic `PRODUCT028` instead of a codeless error. It exits `1` (the invocation is well formed; the finding is about the model), is evaluated before anything is written, and leaves the working tree untouched. `ApplyPlan.blockers` is gone: both apply preconditions are diagnostics now, so there is no second, codeless channel for a refusal.
  - **`changes/superseded/`** — `prodshape change archive` files a `superseded` change under `docs/product/changes/superseded/` rather than alongside refusals in `rejected/`. `superseded` is reachable from `approved`, so filing it as a refusal recorded a decision nobody made. One directory per terminal status; `change list --all` reports the new state, and `prodshape init` scaffolds the directory.
  - **The product diff names its impact** — every entry carries `kind` (`added`, `modified` or `removed`) alongside the artifact and, for an addition or a modification, the resulting digest. A removal leaves no content and so carries no digest. Both the text and the JSON report carry all three facts per entry. The diff is still computed from the applied result rather than read off the declared operations, is still reported rather than written into the archived change, and its determinism is semantic rather than byte-level.
  - **`PRODUCT108`** — the warning is state-based and syntactic, as it already was in substance: it is reported on every validation of a change in status `approved`, not only at the transition. An unresolved question is any Markdown list item under `## Open Questions` at any nesting depth, bullet or ordered, counted regardless of content — task-list checkboxes included, since nothing in the syntax says who checked one. Ordered and `+` markers were previously missed. Prose is not a question, so `None.` and an empty section stay silent.
  - **Baseline drift** — confirmed unchanged: it covers `operations.modify` and `operations.remove` only, and an artifact counts as changed when its normalized content digest differs from its digest at `base-revision`, so a formatting-only commit is not drift and an addition is never drift-checked.

## 0.6.0

### Minor Changes

- 705f623: Retire the delivery pipeline and implement the citation contract (RFC #4). The Product Definition evolves through Product Changes: validated as overlays, approved by a human, materialized by an explicit apply, and accepted when a human merges the pull request carrying the result.

  **Breaking changes:**

  - Removed `prodshape handoff` and `prodshape coverage` commands, and `prodshape change promote` in favour of `prodshape change apply`.
  - Removed `--change` and `--sdd` options from `prodshape validate` and `prodshape init`.
  - Removed core modules: `slices.ts`, `promote.ts`, `handoff.ts`, `references.ts`, `closure.ts`.
  - Removed schemas: `delivery-slice`, `product-handoff`, `product-coverage`.
  - Removed templates: `delivery-slice.yaml`, `product-context.md`, `product-handoff.yaml`.
  - Removed skills: `slice-product-change`, `prepare-sdd-handoff`.
  - Removed hooks: `validate-product-change`, `validate-before-handoff`, `verify-traceability`, `check-handoff-staleness`.
  - Removed config key `integrations.sdd`.
  - `adapter-openspec` reduced to `locateOpenSpecChange` only (removed `checkCoverage`, `checkSliceEvidence`, `findChangeHandoffDirs`).
  - Retired diagnostics PRODUCT030-032, 040, 041, 043, 044, 109 and 110 (codes reserved, never reused).
  - The `product-change` status enum is `draft`, `proposed`, `approved`, `applied`, `rejected`, `superseded`. `in-progress` and `implemented` are gone: whether accepted intent has been built is a fact about delivery, not about the product.
  - Change directories are `changes/active/<chg-id>/` with `proposed/`, archived to `changes/completed/` or `changes/rejected/`.

  **New features:**

  - `prodshape cite` emits a citation record (inline, marker-block, or sidecar-ledger form).
  - `prodshape citations verify` scans consumer documents and reports citation statuses.
  - `prodshape change validate [id]` compiles each live change into an overlay on the baseline and validates the result end to end, touching no baseline file.
  - `prodshape change apply <id> [--dry-run]` materializes an approved change, reports the product diff with each impacted artifact's resulting digest, and archives the change. It creates no commit and merges nothing: applying is not accepting.
  - `prodshape change list [--all]` lists live changes, or the whole change history.
  - `prodshape change archive <id>` files a rejected or superseded change.
  - `verification[].id`: optional stable scenario id on FR and QR artifacts, citable via anchor.
  - New diagnostics: PRODUCT020-027 for Product Changes and their overlays, PRODUCT060 (unresolved citation), PRODUCT061 (stale citation, warning), PRODUCT062 (tampered projection), PRODUCT063 (anchor not found), PRODUCT108 (approved with unresolved open questions, warning). PRODUCT042 generalized to citation digests.
  - Schema vendoring: `pnpm schemas:sync` copies the normative schemas, including `product-change`, from the spec repository.
  - `init` scaffolds `docs/product/changes/{active,completed,rejected}/`.

  See [RFC #4](https://github.com/product-definition-as-code/spec/blob/main/rfcs/0004-delivery-model-reset.md) and [issue #52](https://github.com/juangcarmona/productshape/issues/52) for details.

## 0.5.0

### Minor Changes

- 100b7bc: The Product Snapshot becomes a navigable graph. Every artifact reference on the generated page is now a link in both directions — the declared frontmatter references and the derived reverse views ("referenced by") no authored file states. An inline SVG visualization presents the model's shape: selecting a node highlights its relationships and jumps to the artifact. Client-side search over artifact IDs, titles and content works fully offline. Still one self-contained, read-only, byte-identical file with no external resources and no dependencies.

  This completes `CHG-SNAPSHOT-001` (second and final delivery slice): the full snapshot scope — browse, read, follow, visualize, search — is delivered.

## 0.4.0

### Minor Changes

- e58311c: Add the Product Snapshot: `prodshape graph --format html` generates one static, self-contained, read-only HTML page projecting the whole product model — every artifact rendered and organized by kind with visible status badges, frontmatter metadata, anchor navigation, and the source revision stamped on the page. The file opens from local disk with no server, no network and no scripts, and regenerating from identical model content yields a byte-identical file.

  This is the first delivery slice of `CHG-SNAPSHOT-001`: it introduces the Product Explorer — the person who wants to understand the product deeply without cloning a repository or running a CLI. Relationship links, the graph visualization and client-side search arrive with the second slice.

  `@prodshape/core` gains `buildSnapshotHtml` and a minimal deterministic Markdown renderer (`renderMarkdown`, `escapeHtml`) with no new dependencies.

## 0.3.0

### Minor Changes

- 01303f8: Add `ps:explore` — a product-graph-aware thinking partner before `ps:change`.

  **New skill: `explore-product`.** Before committing to a Product Change, engineers can invoke `/ps:explore` (or `/product:explore`) to clarify a fuzzy idea against the existing product model. The skill reads the full product graph upfront, reasons from a high-altitude structural view to surface gaps, inconsistencies, and affected artifacts, and ends with an explicit offer to hand off to `ps:change`. When the model is absent or minimal it explains ProductShape's artifact vocabulary instead (greenfield mode). If `ps:change` detects that a request is ambiguous, it warns the user and recommends `ps:explore` before proceeding.

  This fills the missing entry point in the ProductShape workflow: product engineers previously had no guided way to explore a fuzzy idea before `ps:change` required a well-formed request.

## 0.2.0

### Minor Changes

- d8841a0: Improvements from the first adoption outside this repository.

  **Discoverable authoring contract.** Artifacts accept an optional `provenance` object recording the evidence behind recovered knowledge (`source` and `confidence` required, `recovered-from` optional), and a `draft` artifact resting on `confidence: low` reports the new warning `PRODUCT111`. `docs/specification/frontmatter-reference.md` documents every field of all 13 document kinds, generated from the schemas, and `prodshape schema <kind>` prints the same contract without needing a repository. A conformance test fails the build if the document and the schemas drift.

  **`prodshape fix --filenames`** resolves `PRODUCT101` by renaming artifact files to match their ID casing, including on Windows and macOS where a case-only rename is otherwise a silent no-op. `--dry-run` exits non-zero when anything would change, so filename drift finally has a CI gate.

  **`prodshape init --dry-run`** reports what initialization would create, preserve, regenerate or overwrite without writing anything, and exits non-zero on conflicts. Scaffolded directories now carry `.gitkeep` so the recommended layout survives a commit, and `--flat` opts out of it. `doctor` gains model validation and an authoring-templates check.

  **The `ps:*` command shorthand is now opt-in** via `integrations.shorthand-commands` (default `false`); `init --shorthand` sets it. Provider installation now deletes managed files it no longer generates, guarded by digest, so opting out does not strand them.

  Breaking for library consumers: `installProvider` and `updateIntegrations` take an options object instead of positional arguments, and `InstallResult` gains `removed`. The CLI's behaviour is unchanged apart from the new commands and flags.

### Patch Changes

- c48d95f: Fix `prodshape fix --filenames --dry-run` writing to disk.

  Recovery of a rename interrupted between its two steps ran before the dry-run check, so asking what the command _would_ do renamed the leftover file and then reported `Dry run: nothing was changed.` That contradicted the command's own contract (`FR-FIX-001`) and the guarantee the sibling `init --dry-run` is built on.

  Recovery is now split into `planFilenameRecovery` (read-only classification) and `applyFilenameRecovery`, matching the plan/apply pairs used elsewhere in the toolkit. A dry run reports `would recover <path>` and performs no rename; a pending recovery still counts toward the non-zero exit code, so the CI gate is unaffected. `--format json` gains a `wouldRecover` field so a planned recovery is distinguishable from a performed one.

## 0.1.0

### Patch Changes

- 84f6dbf: Conformance fixes for the v0.1 release candidate (fix-v01-conformance):

  - Promotion now requires coverage evidence per completed delivery slice (FR-PROMOTE-001). `planPromotion` accepts a `coverageProvider` port; the OpenSpec adapter discovers handoff sidecars deterministically (`findChangeHandoffDirs`, `checkSliceEvidence`); missing or unverifiable evidence is the new `PRODUCT044`; repositories without an SDD adapter must pass the new `--accept-external-evidence` flag explicitly.
  - `applyPromotion` is two-phase: a preflight that touches nothing on failure, then execution with the change-directory move last, so a failed promotion cannot leave a partially promoted baseline.
  - The CLI package installs the `product-definition` binary alias again (identical to `prodshape`), which generated skills and hooks invoke.
  - Coverage evidence is hardened: covered/partial entries need non-empty `specification` and `verification` arrays, evidence paths cannot be absolute or escape the repository, and entries for requirements outside `handoff.implements` are rejected.
  - `installProvider` preflights every target: files not owned by the installation lock, or owned but hand-edited, block `init --ai`, `integration add` and `integration update` (with the full conflict list) unless `--force`; refusals leave files and lock untouched.
  - `validation.warnings-as-errors` is enforced uniformly via `escalateWarnings` across baseline validate, change validate, handoff generation, graph generation and promotion.

- 3bdfce6: Graduate the CLI to a stable release: promote `0.1.0-alpha.1` to `0.1.0` on the `latest` dist-tag. This is the first stable CLI now that the supporting packages (`@prodshape/core`, `distribution`, `adapter-openspec`, `integration-claude`, `integration-copilot`) are published at `0.1.0`.
