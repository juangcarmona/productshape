# @prodshape/distribution

## 0.16.0-alpha.2

### Patch Changes

- Updated dependencies [d0381f5]
- Updated dependencies [7be7c61]
- Updated dependencies [5baaea2]
  - @prodshape/core@0.21.0-alpha.1

## 0.16.0-alpha.1

### Patch Changes

- Updated dependencies [f1a1612]
  - @prodshape/core@0.21.0-alpha.0
  - @prodshape/integration-copilot@0.4.0-alpha.0

## 0.16.0-alpha.0

### Minor Changes

- 1c38d4e: Strengthen the hosted `product-change` workflow with proportional graph-guided clarification, resumable refinement notes, explicit `/product:refine` continuation and packed-consumer coverage. Keep Changesets Action v1 aligned with the repository's Changesets CLI v2 release workflow.

## 0.15.0

### Minor Changes

- 3e44e9c: Repository mutation is now contained, planned before it acts, drift-safe and fails closed (the safety phase of #208).

  Six defects are fixed. A path recorded in `.product/installation.lock.json` could name a target outside the repository and have it deleted: the lock is now validated in full before any entry is used, every recorded path is held to the normalized repository-relative contract, and every read, write, rename and deletion resolves through one containment-checked resolver. `integration add --dry-run` wrote every managed file and then reported that nothing had been written: installation is planned first, a dry run is the plan without the apply, and a dry run predicts a refusal instead of reporting a success the real run would not deliver. `integration remove` deleted managed files a human had edited: removal now compares each file against the digest recorded for it, preserves and reports what has diverged, keeps that file's lock entry so it stays covered by drift detection, and deletes it only under the new `--force`. `extensions.prodshape.generated.root` could resolve outside the repository: it is now held to the same contract as `product-root` and an escaping value is rejected as `PRODUCT050` before command-specific work begins. A malformed, unreadable or off-contract lock was read as "nothing installed": only the not-found condition means absence now, `integration check` and `doctor` fail when a lock exists but cannot be trusted, and configuration that exists but cannot be read is reported instead of silently replaced with defaults. Integration operations are byte-idempotent: a no-op add or update rewrites no managed file, no template, no installation lock and no integration metadata, `installedAt` is preserved as the first-installation moment, and a new optional `updatedAt` records when managed content last actually changed.

  `CHG-MUTATION-SAFETY-001` adds `BR-MUTATION-001` and amends `FR-DISTRIBUTION-001`, `FR-OPENSPEC-001` and `FR-SPECKIT-001` with the report, preservation, fail-closed and idempotence obligations. `@prodshape/core` gains the repository-relative path contract and its resolver; `@prodshape/distribution` gains `src/mutation.ts`, the one module that owns managed-file mutation, and depends on `@prodshape/core` for the resolver so there is exactly one.

  Consumer document roots are deliberately unaffected: they are read-only scan targets, may point outside the repository, and are now documented and tested as such.

  Normative diagnostics, deterministic ordering and the documented exit codes are unchanged.

### Patch Changes

- Updated dependencies [3e44e9c]
  - @prodshape/core@0.20.0

## 0.14.0

### Minor Changes

- f0d4a86: The recover UX wave, from the first external recovery run (#196-#206, one change per lesson the run taught).

  Recovery sessions grow the operations the run had to improvise: `recover unmark` retracts a wrong finding instead of leaving hand-editing session state as the only repair (#197); `recover mark --glob` / `--sources` applies one identical finding to a whole pending selection in a single state write, all or nothing (#198); the brief's ordered `tiers` drive inventory order so SDD specs and product documentation are served before source code instead of relying on path order (#199); and the brief's `git.branch` opts into checkpoint discipline, where the CLI creates the dedicated recovery branch, refuses a dirty tracked tree, and records one `recover(CHG-INITIAL): <step>` commit per state-mutating command (#205, with FR-RECOVER-001 amended by CHG-RECOVER-GIT-001 to permit exactly that and nothing more).

  Artifact id lists are now validated when they are recorded: `mark --artifacts` splits on commas and whitespace and rejects anything that is not a plausible artifact id, with a hint to quote the list, because the npm PowerShell shim turns an unquoted comma list into one space-joined argument that used to be stored silently and only explode later in `recover check` (#196). `prodshape cite` accepts `SB-` ids: `emitCitation` still carried a pre-RFC-0084 pattern, and the id grammar is now derived from the canonical kind-prefix map so a future kind cannot be forgotten again (#206).

  Two new canonical skills ship with their `/product:bind` and `/product:refine` commands: `bind-consumers` backfills scope declarations and citations into existing SDD consumer documents after an initial baseline, recording drift instead of fixing it, and `refine-product` runs the question-driven refinement interview whose answers become an ordinary Product Change (#202, #203). The recover-product skill is hardened where the external run stumbled (author candidates by copying templates, check after the first candidate, quote artifact lists, `SB-` in the prefix list, map evidence in the same step as creating a candidate) and its handover now offers the next moves: checkpoint commit, snapshot preview, the exact lifecycle commands, and the consumer-binding follow-up (#200, #204).

  Both SDD context blocks now enumerate the whole model, bounded contexts and structured behaviours included; already-integrated repositories pick the wording up through `prodshape integration update` (#201).

  The canonical skills also went through a refinement pass: each SKILL.md is the compressed view and its references own the depth (the authoring chain, the finding classifications, the exploration heuristics, the change template contract, the provenance contract each live in exactly one place), the two H1s that hardcoded shorthand aliases stop doing so (the `/ps:` shorthand itself stays opt-in and configured), the role noun is uniformly "the engineer", and every skill's "When to use" names its neighbouring skills so requests route without a router. `pnpm sync:assets` replaces the manual mirror step between the canonical `skills/`, `commands/` and `templates/` directories and the bundled distribution assets; the byte-identity test remains the gate.

## 0.13.0

### Minor Changes

- 1e6d965: `uses-terms` can be authored by every permitted semantic source per RFC 0072: Business Rules, Domain Terms, Functional Requirements, Quality Requirements and Constraints join Use Cases (Structured Behaviour arrives with its artifact kind). The relationship stays canonical from the consuming artifact to a Domain Term, reverse views stay derived, and `PRODUCT106` now reads "Domain term has no incoming uses-terms relationship", which is exactly what the graph checks; a prose mention still never counts. The new edges join the spec's undirected reachability definition, so `PRODUCT103` outcomes can change where unrelated artifacts share vocabulary (the specification defines reachability over every canonical relationship; raised upstream as spec#106), while a constraint's product-wide exemption now keys on `applies-to` edges alone so a term dependency never costs it. The vendored schemas track spec v0.2.0 (`5faef0e`): until the Structured Behaviour kind lands, a `verification[].scenario-ref` entry passes schema validation but creates no graph edge and no reference diagnostics. The authoring templates show the field on the five new kinds, and the frontmatter reference documents a `oneOf` field by its forms (the FR and QR `verification` entries) instead of as `unknown`.
- 6ef7709: Structured Behaviour lands per RFC 0084: the tenth artifact kind (`SB-`, `structured-behaviour`, under `model/behaviours/`) carries one implementation-independent example with required `illustrates` (use cases, business rules or constraints), one `when`, one or more `then` outcomes, optional `given` context and `uses-terms`, required `Intent` and `Boundaries` body sections, and a schema-level ban on a leading GIVEN, WHEN, THEN or AND keyword in any letter case. Functional and Quality Requirement `verification[]` entries accept a `scenario-ref` alongside the unchanged inline form; the new relationships ride the existing diagnostics with the exact `verification[].scenario-ref` attribution, and the journey step relationship now reports its canonical `steps[].use-case` spelling everywhere an edge kind appears. The PRODUCT105 and PRODUCT106 relationship sets are exact: counting relationships must be authored by non-retired artifacts, an incoming `illustrates` never consumes a rule, and retired rules and terms leave the warning populations. Anchors into a Structured Behaviour do not resolve (`PRODUCT063`); direct citations use the whole-artifact digest. Every validation command now reports the whole repository's verdict: `validate` includes live-change overlay diagnostics, `citations verify` includes them too, and the new `--consumers <path>` option on `validate` and `change validate` brings a consumer scope's citation defects into the exit code, which is how the pinned conformance harness invokes them. The snapshot renders the new kind with its own hue and SB token, `prodshape template structured-behaviour` prints the authoring template, `init --full` scaffolds `behaviours/`, and the recovery flow treats structured behaviours as a probeable family.

## 0.12.0

### Minor Changes

- da2a96c: Make first adoption a minimal citation-first workflow. `prodshape init` now installs the kernel only: the configuration, the model home, the live-change home and a README, four files before the first artifact. The full reference profile (per-kind model layout, change archives, template library) installs with `prodshape init --full`, and selecting an AI integration implies it because the installed skills author from the templates. Templates stay discoverable on demand through the new `prodshape template <kind>` command; `prodshape schema <kind>` keeps printing the frontmatter contract. Validating an empty model now states that no product definition exists yet and names the CHG-INITIAL route, instead of presenting emptiness as completed adoption, and the JSON summary carries an `artifacts` count. The governed citation-first walkthrough is documented in the CLI README and exercised from the packed binary in CI; the repository quickstart is labelled as the disposable non-governed sandbox it is. Existing repositories need no migration: the earlier full layout remains valid, and the adoption guide documents the optional cleanup.
- b5f54df: Adopt the normative v1alpha1 configuration contract. `.product/config.yaml` is now the kernel shape (`version`, `product-root`, `validation.warnings-as-errors`, `extensions`) validated against the vendored specification schema, with every ProductShape setting under `extensions.prodshape` (generated, integrations, citations). An invalid file produces exactly one `PRODUCT050` and exit `2` before any other work, with no fallback to defaults. Discovery walks parents for the configuration file, then applies defaults at the enclosing git root; `docs/product` alone no longer marks a root. `warnings-as-errors` now fails the command while emitted severity stays `warning` (`escalateWarnings` is replaced by `blockingDiagnostics`), and the `require-journey-for-use-case` and `require-requirement-reachability` toggles are removed because configuration cannot suppress the normative warnings PRODUCT102 and PRODUCT103. Existing repositories migrate by moving tool settings under `extensions.prodshape` and replacing the `schema` key with `version: v1alpha1`.
- ac94763: `init` can now write the regenerable-output rules into `.gitignore` instead of only recommending them. It never does so unasked: `--gitignore` requests it, an interactive run asks first, and a non-interactive run without the option writes nothing. The write is additive and idempotent, existing content is preserved exactly, a rule already present in an equivalent form is not repeated, and the generated rule follows the configured `generated.root`. `--dry-run` reports the outcome as `Would extend` and performs none of it. The printed next steps now also state which parts of the installation belong in version control, so ignoring `.product/` wholesale stops looking like the tidy answer.

## 0.11.0

### Minor Changes

- 0dd6320: Spec Kit bridge: a new `@prodshape/integration-speckit` package configures existing Spec Kit workspaces (managed guidance at `.specify/memory/pdac.md`, CI example, metadata; the constitution, templates, scripts and feature directories are never written) and enumerates the `spec.md`, `plan.md` and `tasks.md` of every feature directory for `citations verify --provider speckit` and `drift --provider speckit`. New `prodshape context` command renders a deterministic, cited context projection of requested product artifacts and their structural neighborhood for delivery intake. `init`, `integration add/update/check/remove` and `doctor` route Spec Kit workspaces into the integration.

## 0.10.0

### Minor Changes

- cd1b100: Conformance and robustness polish (issue #65).

  - **The diagnostic registry now tracks a pinned spec revision.** `docs/specification/.source.json` records the spec commit the local code tables are checked against, `pnpm registry:sync` vendors the normative code-to-severity extract as `docs/specification/.spec-registry.json`, and the conformance test compares the local tables and every emission against it instead of against themselves. Codes ProductShape issues beyond the normative registry (`PRODUCT070`–`PRODUCT075`) are declared explicitly, so divergence is a reviewed decision rather than a silent one. The precise extraction also surfaced a real gap: `PRODUCT061` (stale citation) was explained in prose but had no row in the warning-code table, and now has one.
  - **`citations verify` consumer roots are configurable.** The scan root was hardcoded to `openspec/`, so a repository keeping its consumer documents anywhere else had to name the directory on every invocation. `citations.consumer-roots` (default `['openspec']`) now names the directories scanned when no target is given, several may be listed, and a configured root that does not exist is an error rather than an empty pass. The JSON result reports `targets` (the list actually scanned) in place of the single `target` field.
  - **`validate` no longer writes as a side effect.** A read-only verdict mutated the tree to produce it, leaving untracked `.product/generated` directories wherever it ran — including inside other repositories' conformance fixtures. Generation is now opt-in via `validate --write-generated`; `prodshape graph` remains the dedicated generator.
  - **`change list --all` help text** now names the `superseded` history it has always included.
  - **`PRODUCT108` section matching is exact.** The Open Questions heading is anchored to a line start and to exactly two hashes, so a `### Open Questions` subsection of another section is no longer read as the change's own, and list items inside fenced code blocks are no longer counted as open questions.
  - **`PRODUCT025` compares every pair of changes.** Self-exclusion matched on `id`, so two changes both missing an `id` skipped each other and a real overlap disappeared behind the missing-id defect. Identity is now the change document.

## 0.9.0

### Minor Changes

- 3b331a5: SDD-aware initialization. `prodshape init` detects SDD frameworks present in the repository (OpenSpec via `openspec/`, Kiro via `.kiro/`, Spec Kit via `.specify/`) and reports them; `--sdd openspec` wires the OpenSpec integration in the same run, bootstrapping the workspace first (`openspec init --tools none`, through `npx -y @fission-ai/openspec@1` when the CLI is not installed) when none exists. Kiro and Spec Kit receive printed setup guidance because they install through their own tooling. In an interactive terminal a bare `init` asks, informed by the detection; with an explicit `--sdd` value, `--sdd none`, or no terminal it never prompts, and `--dry-run` describes the SDD actions without executing anything. `doctor` now points at `prodshape integration add openspec` when a workspace exists without the integration. The OpenSpec integration records the exact strings it injects into `openspec/config.yaml`, so a later update replaces outdated PDaC entries instead of accumulating duplicates, `detectOpenSpecVersion` consults the repository's `node_modules/.bin` so a devDependency install counts, and the CLI-not-found message names the real package (`@fission-ai/openspec`).

### Patch Changes

- 0170f81: Align generated initialization, recovery and OpenSpec guidance with the independent Product Change lifecycle: overlay validation, human product approval, explicit apply, pull-request review and merge acceptance remain distinct from implementation and delivery evidence.
- 213d2e1: Order diagnostics by file, code, and target with locale-independent UTF-16 code-unit comparison, including complete citation-verification, Product Change apply, and managed-integration results.

## 0.8.0

### Minor Changes

- bcb8edc: Brownfield recovery sessions. `prodshape recover` manages deterministic, resumable recovery state under `.product/generated/recovery/<session-id>/`: evidence inventory with content hashes (repository, user-provided and explicitly authorised external sources), bounded batches, per-source classification, leads, user questions with persisted answers, staleness detection, CHG-INITIAL overlay revalidation, coverage, completion criteria and a final report. Semantic extraction stays with the rewritten self-contained recover-product skill, whose candidates live only in the proposed overlay of CHG-INITIAL and are never accepted by tooling.

## 0.7.0

### Minor Changes

- 5c00292: Acceptance criteria live in `verification[]`: stop requiring a body section that restates them

  The specification accepted [RFC 0022](https://github.com/product-definition-as-code/spec/blob/main/rfcs/0022-criteria-in-verification-list.md) (spec PR #24). A requirement's acceptance criteria are carried by `verification[]`, and the body SHOULD NOT restate them, so `## Acceptance Scenarios` left the required body sections of a Functional Requirement and `## Verification` left those of a Quality Requirement.

  `requiredBodySections` drops both. This only widens what validates: an artifact that carries the section is still valid, because additional sections have always been permitted, and an artifact that omits it no longer reports `PRODUCT009`. No repository that validated before this change stops validating.

  The `functional-requirement` and `quality-requirement` templates stop scaffolding the section, so a newly authored artifact no longer starts life restating its own criteria.

  Before this change every case in the spec's conformance tests failed against `prodshape validate`, because the test fixtures had already dropped the sections the specification no longer requires.

## 0.6.0

### Minor Changes

- 5c1b1ac: Product Changes: `PRODUCT028`, a `superseded/` archive, and a product diff that names its impact

  The specification's second refinement of RFC 4 determined the five points that previously did not fix an implementation's behaviour. Two of them override the defaults this toolkit chose, and three are confirmed with the behaviour made explicit.

  - **`PRODUCT028`** — applying a Product Change whose status is not `approved` now reports the diagnostic `PRODUCT028` instead of a codeless error. It exits `1` (the invocation is well formed; the finding is about the model), is evaluated before anything is written, and leaves the working tree untouched. `ApplyPlan.blockers` is gone: both apply preconditions are diagnostics now, so there is no second, codeless channel for a refusal.
  - **`changes/superseded/`** — `prodshape change archive` files a `superseded` change under `docs/product/changes/superseded/` rather than alongside refusals in `rejected/`. `superseded` is reachable from `approved`, so filing it as a refusal recorded a decision nobody made. One directory per terminal status; `change list --all` reports the new state, and `prodshape init` scaffolds the directory.
  - **The product diff names its impact** — every entry carries `kind` (`added`, `modified` or `removed`) alongside the artifact and, for an addition or a modification, the resulting digest. A removal leaves no content and so carries no digest. Both the text and the JSON report carry all three facts per entry. The diff is still computed from the applied result rather than read off the declared operations, is still reported rather than written into the archived change, and its determinism is semantic rather than byte-level.
  - **`PRODUCT108`** — the warning is state-based and syntactic, as it already was in substance: it is reported on every validation of a change in status `approved`, not only at the transition. An unresolved question is any Markdown list item under `## Open Questions` at any nesting depth, bullet or ordered, counted regardless of content — task-list checkboxes included, since nothing in the syntax says who checked one. Ordered and `+` markers were previously missed. Prose is not a question, so `None.` and an empty section stay silent.
  - **Baseline drift** — confirmed unchanged: it covers `operations.modify` and `operations.remove` only, and an artifact counts as changed when its normalized content digest differs from its digest at `base-revision`, so a formatting-only commit is not drift and an addition is never drift-checked.

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
