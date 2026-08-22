# @prodshape/cli

## 0.13.1

### Patch Changes

- f47c886: Run OpenSpec commands with safely escaped argument arrays across platforms, eliminating Node 24 DEP0190 warnings from provider commands.

## 0.13.0

### Minor Changes

- fb9b7b6: OpenSpec citation coverage (CHG-OPENSPEC-COVERAGE-001, -002 and -003, FR-OPENSPEC-001):

  - The merged proposal rules now require an impact pass before any proposal content is written: compare the change's intent (the backlog item, if there is one) with the whole product definition to find every artifact the change depends on, alters or contradicts; widen that list with `prodshape impact <ID>`; record the list in the proposal; cite every impacted artifact from each document that uses it; and name the neighbours that were checked and left out.
  - The merged proposal rules now require surfacing product-definition drift: when the change's goals contradict or go beyond the definition, the divergence is recorded in the proposal as an explicit warning naming the artifacts involved — with the marker `<!-- pdac-drift ids="..." summary="..." -->` on its own line — and the decision (a Product Change, or an adjusted change) belongs to humans. Drift is never fixed quietly.
  - New `prodshape drift` command: list every recorded drift warning across consumer documents (`--provider openspec` covers the whole population, archived material marked), reporting document, artifacts (with whether each still exists in the model) and summary. A report, never a gate: recorded drift exits 0.
  - `citations verify --provider openspec` now always includes archived changes and checks their citations, reporting everything found in archived material as a warning (archived history cannot be edited; its drift is information). The scope gate keeps applying to current documents only. `--include-archived` now applies the full gate — scope declarations and error severities — to archived documents too.

## 0.12.0

### Minor Changes

- cd1b100: Conformance and robustness polish (issue #65).

  - **The diagnostic registry now tracks a pinned spec revision.** `docs/specification/.source.json` records the spec commit the local code tables are checked against, `pnpm registry:sync` vendors the normative code-to-severity extract as `docs/specification/.spec-registry.json`, and the conformance test compares the local tables and every emission against it instead of against themselves. Codes ProductShape issues beyond the normative registry (`PRODUCT070`–`PRODUCT075`) are declared explicitly, so divergence is a reviewed decision rather than a silent one. The precise extraction also surfaced a real gap: `PRODUCT061` (stale citation) was explained in prose but had no row in the warning-code table, and now has one.
  - **`citations verify` consumer roots are configurable.** The scan root was hardcoded to `openspec/`, so a repository keeping its consumer documents anywhere else had to name the directory on every invocation. `citations.consumer-roots` (default `['openspec']`) now names the directories scanned when no target is given, several may be listed, and a configured root that does not exist is an error rather than an empty pass. The JSON result reports `targets` (the list actually scanned) in place of the single `target` field.
  - **`validate` no longer writes as a side effect.** A read-only verdict mutated the tree to produce it, leaving untracked `.product/generated` directories wherever it ran — including inside other repositories' conformance fixtures. Generation is now opt-in via `validate --write-generated`; `prodshape graph` remains the dedicated generator.
  - **`change list --all` help text** now names the `superseded` history it has always included.
  - **`PRODUCT108` section matching is exact.** The Open Questions heading is anchored to a line start and to exactly two hashes, so a `### Open Questions` subsection of another section is no longer read as the change's own, and list items inside fenced code blocks are no longer counted as open questions.
  - **`PRODUCT025` compares every pair of changes.** Self-exclusion matched on `id`, so two changes both missing an `id` skipped each other and a real overlap disappeared behind the missing-id defect. Identity is now the change document.

## 0.11.0

### Minor Changes

- 376afcd: Five CLI paper cuts from issue #106. `-v` joins `--version`. `prodshape change create <CHG-ID>` scaffolds a draft Product Change under `changes/active/<id>/` — prompt-free and CI-safe, with `base-revision` resolved from the repository HEAD (or the `0000000` CHG-INITIAL sentinel outside Git history), every required body section present so `prodshape change validate` accepts the scaffold as-is, an optional `--title`, `--format json`, and a refusal (exit 2) to overwrite an existing change. `PRODUCT002` now names the offending field: an additional-properties violation appends the property (`document must NOT have additional properties ('bogus-field')`) and property-level failures fill the diagnostic's `field` with the dotted path. The `--provider openspec` upsell tip after `citations verify` prints only where an OpenSpec workspace exists and the ProductShape integration is not wired yet, so unrelated repositories and already-integrated ones stay quiet. `validate` and `citations verify` gain `--root <dir>` to name the product repository explicitly instead of discovering upward from the working directory — a directory without repository markers is refused with exit 2 — and `examples/minimal` ships its own `.product/config.yaml`, making it directly runnable with `prodshape validate --root examples/minimal`.
- df69fb8: Consumer-verification diagnostics leave the reserved band: `PRODUCT070`/`PRODUCT074`/`PRODUCT075` become `PRODUCT064`/`PRODUCT065`/`PRODUCT066`, matching the numbering spec RFC 0042 allocates for unclassified documents, bound documents without citations and invalid scope declarations, and the OpenSpec adapter mechanics `PRODUCT071`/`PRODUCT072`/`PRODUCT073` become `PRODUCT067`/`PRODUCT068`/`PRODUCT069` beside them. `PRODUCT070`-`PRODUCT079` returns fully to the reservation RFC 0021 states for model-repository resolution. The conditions, severities and precedence are unchanged; only the numbers move, while they are hours old and nothing external depends on them.

## 0.10.0

### Minor Changes

- 885e4b0: `change apply` and `change apply --dry-run` report the affected citation set before the change is accepted (RFC 0048). After computing the product diff, apply intersects it with the repository's citation index — every citation record grouped by target artifact — and reports each citation whose target the diff reports as added, modified or removed: the consumer document's repository-relative path, the point of use (file and line for a payload-carried citation, ledger file and entry for a sidecar citation), the target id with its anchor, and the prospective status the citation will hold against the applied result, computed under the existing citation-status precedence (typically `stale` for a modified target, `unresolved` for a removed one). An empty set is stated explicitly as `Affected citations: 0` — absence of impact is a claim, not silence. The set appears in both the human-readable and the `--format json` apply output, ordered deterministically by consumer path, point of use, target id and anchor; it is recomputed output like the product diff, never persisted into the archived change, and never a veto — apply proceeds however many citations go stale. Core gains `buildCitationIndex`, `computeAffectedCitations` and `appliedArtifacts`, and exports the locale-independent `compareCodeUnits` comparator diagnostics ordering uses.
- 2a8b48c: Add `prodshape --version`, sourced from the installed CLI package manifest, and enforce the primary documented init and citation-drift quickstart against a packed tarball installed without workspace links.
- 3f591ca: Provider-aware OpenSpec citation enforcement. A reusable, framework-neutral SDD integration-provider contract now lives in core (`SddIntegrationProvider`): a provider enumerates the expected current native consumer documents of its workspace, and core classifies each enumerated document into exactly one effective scope state — `bound` (carries citations or declares `pdac-scope: cited`), `exempt` (a human declared `pdac-scope: none`), or `unclassified` (neither, which fails). OpenSpec enumeration (the `openspec/` layout, changes/archive lifecycle split and the `openspec` CLI) moved out of core into `@prodshape/integration-openspec`, which implements the contract as the first adapter; core no longer exports `discoverOpenSpecPopulation`. `prodshape citations verify --provider openspec` verifies the enumerated population instead of globbing for citation syntax: an unclassified current document fails (`PRODUCT070`), a bound document with zero citations fails (new `PRODUCT074`), an invalid or contradicted scope declaration fails (new `PRODUCT075`), a valid exemption passes but stays visible in text and JSON results, archived changes stay excluded unless `--include-archived`, and a workspace with current documents can never pass vacuously because zero citations were discovered. The provider JSON result uses the `citations-provider/v1alpha1` schema with document states and per-state totals. `integration add openspec` now also teaches the scope model through `openspec/config.yaml` guidance, states the exact provider-aware verification command, and installs a CI-ready example at `.product/integrations/openspec.ci.yml` that makes the repository's configured stale-citation policy explicit without ever changing it; `update`, `check` and `remove` manage that file alongside the rest. The gate never invokes `openspec validate`, and it establishes citation grounding and population coverage only — not semantic completeness or implementation conformance.
- 3b331a5: SDD-aware initialization. `prodshape init` detects SDD frameworks present in the repository (OpenSpec via `openspec/`, Kiro via `.kiro/`, Spec Kit via `.specify/`) and reports them; `--sdd openspec` wires the OpenSpec integration in the same run, bootstrapping the workspace first (`openspec init --tools none`, through `npx -y @fission-ai/openspec@1` when the CLI is not installed) when none exists. Kiro and Spec Kit receive printed setup guidance because they install through their own tooling. In an interactive terminal a bare `init` asks, informed by the detection; with an explicit `--sdd` value, `--sdd none`, or no terminal it never prompts, and `--dry-run` describes the SDD actions without executing anything. `doctor` now points at `prodshape integration add openspec` when a workspace exists without the integration. The OpenSpec integration records the exact strings it injects into `openspec/config.yaml`, so a later update replaces outdated PDaC entries instead of accumulating duplicates, `detectOpenSpecVersion` consults the repository's `node_modules/.bin` so a devDependency install counts, and the CLI-not-found message names the real package (`@fission-ai/openspec`).

### Patch Changes

- 0170f81: Align generated initialization, recovery and OpenSpec guidance with the independent Product Change lifecycle: overlay validation, human product approval, explicit apply, pull-request review and merge acceptance remain distinct from implementation and delivery evidence.
- de5e199: Accept both bare-array and `citations:` mapping YAML sidecar ledgers, and let `prodshape citations verify` check a supported consumer file directly while reporting missing or unsupported targets as invalid invocations.
- 213d2e1: Order diagnostics by file, code, and target with locale-independent UTF-16 code-unit comparison, including complete citation-verification, Product Change apply, and managed-integration results.
- d4c2ba8: Fix `change apply --dry-run` skipping the entire preflight. The preflight (reading every write source, confirming every delete target, verifying the archive destination is absent) lived only inside `executeApply`, which a dry run never called, so a dry run could report "Would apply" for a plan that would fail immediately for real — for example when the archive destination already exists. `executeApply`'s preflight is now a separate exported `preflightApply`, and `--dry-run` runs it too, so it reports the identical refusal a real apply would while still writing nothing.

## 0.9.0

### Minor Changes

- bcb8edc: Brownfield recovery sessions. `prodshape recover` manages deterministic, resumable recovery state under `.product/generated/recovery/<session-id>/`: evidence inventory with content hashes (repository, user-provided and explicitly authorised external sources), bounded batches, per-source classification, leads, user questions with persisted answers, staleness detection, CHG-INITIAL overlay revalidation, coverage, completion criteria and a final report. Semantic extraction stays with the rewritten self-contained recover-product skill, whose candidates live only in the proposed overlay of CHG-INITIAL and are never accepted by tooling.

## 0.8.1

### Patch Changes

- 08cd643: Digest the bytes, never a decoded string, so ProductShape and pdac-lint cannot disagree (spec issue #32).

  `spec/validation.md` defines a content digest as SHA-256 over the artifact's UTF-8 bytes with CRLF and CR normalized to LF. `contentDigest` was applied to a string that had already been decoded by `readFile(path, 'utf8')`, so every invalid UTF-8 sequence became U+FFFD and the digest covered bytes the file does not contain. pdac-lint hashed the bytes and was correct. The two implementations therefore produced different digests for the same file, with nothing detecting it: a citation could be reported `current` by one tool and `stale` by the other.

  `contentDigestBytes(data: Buffer)` is now the only hash, and `contentDigest(content: string)` is defined in terms of it, so a string and its UTF-8 encoding cannot diverge. Every site that digests content from disk or from Git now passes the bytes: artifact loading, Product Change loading, `prodshape cite --file`, and the `PRODUCT027` baseline-drift check. `gitShowBytes` is added for that last one, because `gitShow` decodes as UTF-8 and is the same trap.

  No digest changes for any valid UTF-8 file, so no existing citation, pin or baseline is affected. Both repositories now assert the same four known-answer vectors, including one invalid UTF-8 case and the lossy digest it must not produce, so a future divergence fails a test instead of passing silently.

## 0.8.0

### Minor Changes

- 5c00292: Acceptance criteria live in `verification[]`: stop requiring a body section that restates them

  The specification accepted [RFC 0022](https://github.com/product-definition-as-code/spec/blob/main/rfcs/0022-criteria-in-verification-list.md) (spec PR #24). A requirement's acceptance criteria are carried by `verification[]`, and the body SHOULD NOT restate them, so `## Acceptance Scenarios` left the required body sections of a Functional Requirement and `## Verification` left those of a Quality Requirement.

  `requiredBodySections` drops both. This only widens what validates: an artifact that carries the section is still valid, because additional sections have always been permitted, and an artifact that omits it no longer reports `PRODUCT009`. No repository that validated before this change stops validating.

  The `functional-requirement` and `quality-requirement` templates stop scaffolding the section, so a newly authored artifact no longer starts life restating its own criteria.

  Before this change every case in the spec's conformance tests failed against `prodshape validate`, because the test fixtures had already dropped the sections the specification no longer requires.

- 527c213: Citation status precedence: tampered wins over stale, and the JSON envelope carries diagnostics

  The specification determined the citation status precedence (spec PR #19, closing spec issue #17): invalid digest, unresolved target, unresolved anchor, tampered, stale, current, first match wins, and a citation carries the diagnostic of its status and no other.

  `verifyCitation` previously gated the tamper check on the target's digest still matching the recorded one, so a hand-edited embedded projection whose cited target had also changed fell through to staleness. A citation that used to report `stale` (`PRODUCT061`, a warning, exit `0`) for that combination now reports `tampered` (`PRODUCT062`, an error, exit `1`). A consumer pipeline that was green on this combination can turn red; that is the point of the fix, since the defect it now surfaces was there all along.

  `prodshape citations verify --format json` now carries a `diagnostics` array alongside `citations` and `summary`, escalated the same way `validate` and `change validate` already report theirs. The array was already computed and spent only on summary counts, so `PRODUCT042` and `PRODUCT060` through `PRODUCT063` were unreachable to any machine reader of the citations command. They are reachable now.

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
