# @prodshape/distribution

## 0.5.0

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

## 0.4.0

### Minor Changes

- 01303f8: Add `ps:explore` — a product-graph-aware thinking partner before `ps:change`.

  **New skill: `explore-product`.** Before committing to a Product Change, engineers can invoke `/ps:explore` (or `/product:explore`) to clarify a fuzzy idea against the existing product model. The skill reads the full product graph upfront, reasons from a high-altitude structural view to surface gaps, inconsistencies, and affected artifacts, and ends with an explicit offer to hand off to `ps:change`. When the model is absent or minimal it explains ProductShape's artifact vocabulary instead (greenfield mode). If `ps:change` detects that a request is ambiguous, it warns the user and recommends `ps:explore` before proceeding.

  This fills the missing entry point in the ProductShape workflow: product engineers previously had no guided way to explore a fuzzy idea before `ps:change` required a well-formed request.

### Patch Changes

- Updated dependencies [01303f8]
  - @prodshape/integration-claude@0.3.0
  - @prodshape/integration-copilot@0.3.0

## 0.3.0

### Minor Changes

- d8841a0: Improvements from the first adoption outside this repository.

  **Discoverable authoring contract.** Artifacts accept an optional `provenance` object recording the evidence behind recovered knowledge (`source` and `confidence` required, `recovered-from` optional), and a `draft` artifact resting on `confidence: low` reports the new warning `PRODUCT111`. `docs/specification/frontmatter-reference.md` documents every field of all 13 document kinds, generated from the schemas, and `prodshape schema <kind>` prints the same contract without needing a repository. A conformance test fails the build if the document and the schemas drift.

  **`prodshape fix --filenames`** resolves `PRODUCT101` by renaming artifact files to match their ID casing, including on Windows and macOS where a case-only rename is otherwise a silent no-op. `--dry-run` exits non-zero when anything would change, so filename drift finally has a CI gate.

  **`prodshape init --dry-run`** reports what initialization would create, preserve, regenerate or overwrite without writing anything, and exits non-zero on conflicts. Scaffolded directories now carry `.gitkeep` so the recommended layout survives a commit, and `--flat` opts out of it. `doctor` gains model validation and an authoring-templates check.

  **The `ps:*` command shorthand is now opt-in** via `integrations.shorthand-commands` (default `false`); `init --shorthand` sets it. Provider installation now deletes managed files it no longer generates, guarded by digest, so opting out does not strand them.

  Breaking for library consumers: `installProvider` and `updateIntegrations` take an options object instead of positional arguments, and `InstallResult` gains `removed`. The CLI's behaviour is unchanged apart from the new commands and flags.

### Patch Changes

- Updated dependencies [d8841a0]
  - @prodshape/integration-claude@0.2.0
  - @prodshape/integration-copilot@0.2.0

## 0.2.0

### Minor Changes

- 84f6dbf: Conformance fixes for the v0.1 release candidate (fix-v01-conformance):

  - Promotion now requires coverage evidence per completed delivery slice (FR-PROMOTE-001). `planPromotion` accepts a `coverageProvider` port; the OpenSpec adapter discovers handoff sidecars deterministically (`findChangeHandoffDirs`, `checkSliceEvidence`); missing or unverifiable evidence is the new `PRODUCT044`; repositories without an SDD adapter must pass the new `--accept-external-evidence` flag explicitly.
  - `applyPromotion` is two-phase: a preflight that touches nothing on failure, then execution with the change-directory move last, so a failed promotion cannot leave a partially promoted baseline.
  - The CLI package installs the `product-definition` binary alias again (identical to `prodshape`), which generated skills and hooks invoke.
  - Coverage evidence is hardened: covered/partial entries need non-empty `specification` and `verification` arrays, evidence paths cannot be absolute or escape the repository, and entries for requirements outside `handoff.implements` are rejected.
  - `installProvider` preflights every target: files not owned by the installation lock, or owned but hand-edited, block `init --ai`, `integration add` and `integration update` (with the full conflict list) unless `--force`; refusals leave files and lock untouched.
  - `validation.warnings-as-errors` is enforced uniformly via `escalateWarnings` across baseline validate, change validate, handoff generation, graph generation and promotion.
