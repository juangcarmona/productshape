# @prodshape/core

## 0.19.0

### Minor Changes

- f0d4a86: The recover UX wave, from the first external recovery run (#196-#206, one change per lesson the run taught).

  Recovery sessions grow the operations the run had to improvise: `recover unmark` retracts a wrong finding instead of leaving hand-editing session state as the only repair (#197); `recover mark --glob` / `--sources` applies one identical finding to a whole pending selection in a single state write, all or nothing (#198); the brief's ordered `tiers` drive inventory order so SDD specs and product documentation are served before source code instead of relying on path order (#199); and the brief's `git.branch` opts into checkpoint discipline, where the CLI creates the dedicated recovery branch, refuses a dirty tracked tree, and records one `recover(CHG-INITIAL): <step>` commit per state-mutating command (#205, with FR-RECOVER-001 amended by CHG-RECOVER-GIT-001 to permit exactly that and nothing more).

  Artifact id lists are now validated when they are recorded: `mark --artifacts` splits on commas and whitespace and rejects anything that is not a plausible artifact id, with a hint to quote the list, because the npm PowerShell shim turns an unquoted comma list into one space-joined argument that used to be stored silently and only explode later in `recover check` (#196). `prodshape cite` accepts `SB-` ids: `emitCitation` still carried a pre-RFC-0084 pattern, and the id grammar is now derived from the canonical kind-prefix map so a future kind cannot be forgotten again (#206).

  Two new canonical skills ship with their `/product:bind` and `/product:refine` commands: `bind-consumers` backfills scope declarations and citations into existing SDD consumer documents after an initial baseline, recording drift instead of fixing it, and `refine-product` runs the question-driven refinement interview whose answers become an ordinary Product Change (#202, #203). The recover-product skill is hardened where the external run stumbled (author candidates by copying templates, check after the first candidate, quote artifact lists, `SB-` in the prefix list, map evidence in the same step as creating a candidate) and its handover now offers the next moves: checkpoint commit, snapshot preview, the exact lifecycle commands, and the consumer-binding follow-up (#200, #204).

  Both SDD context blocks now enumerate the whole model, bounded contexts and structured behaviours included; already-integrated repositories pick the wording up through `prodshape integration update` (#201).

  The canonical skills also went through a refinement pass: each SKILL.md is the compressed view and its references own the depth (the authoring chain, the finding classifications, the exploration heuristics, the change template contract, the provenance contract each live in exactly one place), the two H1s that hardcoded shorthand aliases stop doing so (the `/ps:` shorthand itself stays opt-in and configured), the role noun is uniformly "the engineer", and every skill's "When to use" names its neighbouring skills so requests route without a router. `pnpm sync:assets` replaces the manual mirror step between the canonical `skills/`, `commands/` and `templates/` directories and the bundled distribution assets; the byte-identity test remains the gate.

## 0.18.0

### Minor Changes

- 1e6d965: `uses-terms` can be authored by every permitted semantic source per RFC 0072: Business Rules, Domain Terms, Functional Requirements, Quality Requirements and Constraints join Use Cases (Structured Behaviour arrives with its artifact kind). The relationship stays canonical from the consuming artifact to a Domain Term, reverse views stay derived, and `PRODUCT106` now reads "Domain term has no incoming uses-terms relationship", which is exactly what the graph checks; a prose mention still never counts. The new edges join the spec's undirected reachability definition, so `PRODUCT103` outcomes can change where unrelated artifacts share vocabulary (the specification defines reachability over every canonical relationship; raised upstream as spec#106), while a constraint's product-wide exemption now keys on `applies-to` edges alone so a term dependency never costs it. The vendored schemas track spec v0.2.0 (`5faef0e`): until the Structured Behaviour kind lands, a `verification[].scenario-ref` entry passes schema validation but creates no graph edge and no reference diagnostics. The authoring templates show the field on the five new kinds, and the frontmatter reference documents a `oneOf` field by its forms (the FR and QR `verification` entries) instead of as `unknown`.
- 6ef7709: Structured Behaviour lands per RFC 0084: the tenth artifact kind (`SB-`, `structured-behaviour`, under `model/behaviours/`) carries one implementation-independent example with required `illustrates` (use cases, business rules or constraints), one `when`, one or more `then` outcomes, optional `given` context and `uses-terms`, required `Intent` and `Boundaries` body sections, and a schema-level ban on a leading GIVEN, WHEN, THEN or AND keyword in any letter case. Functional and Quality Requirement `verification[]` entries accept a `scenario-ref` alongside the unchanged inline form; the new relationships ride the existing diagnostics with the exact `verification[].scenario-ref` attribution, and the journey step relationship now reports its canonical `steps[].use-case` spelling everywhere an edge kind appears. The PRODUCT105 and PRODUCT106 relationship sets are exact: counting relationships must be authored by non-retired artifacts, an incoming `illustrates` never consumes a rule, and retired rules and terms leave the warning populations. Anchors into a Structured Behaviour do not resolve (`PRODUCT063`); direct citations use the whole-artifact digest. Every validation command now reports the whole repository's verdict: `validate` includes live-change overlay diagnostics, `citations verify` includes them too, and the new `--consumers <path>` option on `validate` and `change validate` brings a consumer scope's citation defects into the exit code, which is how the pinned conformance harness invokes them. The snapshot renders the new kind with its own hue and SB token, `prodshape template structured-behaviour` prints the authoring template, `init --full` scaffolds `behaviours/`, and the recovery flow treats structured behaviours as a probeable family.
- 043725f: `PRODUCT002` and parsed-configuration `PRODUCT050` diagnostics locate the failure with an escaped RFC 6901 JSON Pointer in `field`, per RFC 0085: array indexes are ordinary pointer segments, a missing or additional property is identified as though it were present, and the empty string points at the document root. `citations verify` refuses to verify against a product model with validation errors: it reports those errors and exits 1 instead of computing citation statuses over broken input (`change validate` already reports baseline errors and fails the same way; this closes the one command that silently verified against a broken model). The core API's `compareCodeUnits` is replaced by `compareCodePoints`, and the deterministic diagnostic ordering now compares by Unicode code point, the order the validation contract mandates; for ASCII output nothing changes.
- 0e563ce: Impact analysis understands the vocabulary's impact polarity per RFC 0093. Every canonical relationship row carries its `Polarity` (`dependency` or `governance`), and `analyzeImpact` reports `questioned`: the artifacts one authored hop away that a change to the analyzed artifact puts in question. A dependency edge questions its source when its target changes, a governance (`applies-to`) coupling questions either end, and a changed dependency source never questions what it cited, so a changed Quality Requirement's constrained use cases now surface even though a reverse walk never reaches them. `prodshape impact` prints the set with its coupling edge and polarity, before the reachability sections, as assistance and never authority.

## 0.17.0

### Minor Changes

- 4c2675a: Enforce the citation carriers per the frozen citation contract, with the normative `PRODUCT067`. The payload grammar is closed (`id`, `digest`, optional `anchor`, in that order, double-quoted, nothing else) and a malformed `pdac:cite` candidate is reported at its line instead of disappearing as prose. Sidecars are validated against the normative `citation-sidecar` schema: one YAML document, exactly one non-empty `citations` sequence of closed records, no forbidden YAML features; a malformed sidecar file is one diagnostic and its consumer file must exist. A consumer using both payloads and a sidecar gets one `PRODUCT067` with the citation statuses of both carriers suppressed until resolved, and a consumer document now reads its adjacent sidecar directly. `parseCitations` returns `{ records, diagnostics, suppressed }` and `scanCitations` returns `{ records, diagnostics }`. The never-emitted `unsupportedOpenSpecStore` code is retired; legacy brace citations and bare-sequence ledgers remain readable as non-conforming extensions.
- b5f54df: Adopt the normative v1alpha1 configuration contract. `.product/config.yaml` is now the kernel shape (`version`, `product-root`, `validation.warnings-as-errors`, `extensions`) validated against the vendored specification schema, with every ProductShape setting under `extensions.prodshape` (generated, integrations, citations). An invalid file produces exactly one `PRODUCT050` and exit `2` before any other work, with no fallback to defaults. Discovery walks parents for the configuration file, then applies defaults at the enclosing git root; `docs/product` alone no longer marks a root. `warnings-as-errors` now fails the command while emitted severity stays `warning` (`escalateWarnings` is replaced by `blockingDiagnostics`), and the `require-journey-for-use-case` and `require-requirement-reachability` toggles are removed because configuration cannot suppress the normative warnings PRODUCT102 and PRODUCT103. Existing repositories migrate by moving tool settings under `extensions.prodshape` and replacing the `schema` key with `version: v1alpha1`.
- 02f4fef: Align diagnostics with the frozen PDaC validation contract. Diagnostics gain `change`, `line` and `entry`; a Product Change ID now appears in `change` and a cited ID in `target` with its payload line or sidecar entry, never in `artifact`. Ordering is by file, then line and entry (absent before present, numerically), then code, field, target, artifact and change. `PRODUCT002` emits once per distinct invalid instance path, `PRODUCT003` carries `field: type` and the consumer scope diagnostics carry `field: scope`.
- c8bd0b0: Align apply and citation writing with the frozen PDaC kernel contracts. The exact `CHG-INITIAL`/`0000000` pair now skips Git resolution, every ordinary revision must resolve even for add-only changes, and an unresolved revision produces one `PRODUCT027`. `prodshape cite` now writes the canonical ordered payload by default or the canonical mapping-form sidecar, rewrites the legacy inline request to a payload, and refuses to emit an unverifiable empty marker block. Generated context and integration instructions wrap payloads in native Markdown comments.
- 060b5e1: Complete population-aware scope declarations per the frozen citation contract. Every current consumer document needs exactly one explicit declaration: `pdac-scope: cited` with at least one citation (bound), or `pdac-scope: none` with a non-empty human-authored reason (exempt), written as `pdac-scope-reason:` in frontmatter or `reason="..."` in the comment form. Citations alone no longer bind; an undeclared or unrecognized declaration is unclassified (`PRODUCT064`), and an exemption without a reason or contradicted by citations is one `PRODUCT066` per document. Provider verification now excludes archived history by default (`--include-archived` verifies its citations as warnings, scope gate current-only) and reports the provider identity and integration version; `SddIntegrationProvider` gains a required `version`.

### Patch Changes

- cbd0602: Re-vendor the normative schemas and diagnostic registry at the finished Wave 2 specification revision (`9ff12df`). The common schema gains the citation record and anchor definitions and the byte-digest wording, the registry extract now defines `PRODUCT064` to `PRODUCT067` normatively (leaving only the OpenSpec adapter codes implementation-specific), and the README certification claim names the current pins (spec `9ff12df`, pdac-lint `0.2.0`).

## 0.16.1

### Patch Changes

- f1bba4c: Fix PRODUCT027 reporting "changed since base-revision" when the base-revision could not be resolved at all (outside a Git repository, a shallow clone, or an ambiguous or missing revision). The diagnostic now distinguishes an unresolvable base-revision from a base-revision that resolved but whose recorded content digest differs, and states which one occurred.

## 0.16.0

### Minor Changes

- fb9b7b6: OpenSpec citation coverage (CHG-OPENSPEC-COVERAGE-001, -002 and -003, FR-OPENSPEC-001):

  - The merged proposal rules now require an impact pass before any proposal content is written: compare the change's intent (the backlog item, if there is one) with the whole product definition to find every artifact the change depends on, alters or contradicts; widen that list with `prodshape impact <ID>`; record the list in the proposal; cite every impacted artifact from each document that uses it; and name the neighbours that were checked and left out.
  - The merged proposal rules now require surfacing product-definition drift: when the change's goals contradict or go beyond the definition, the divergence is recorded in the proposal as an explicit warning naming the artifacts involved — with the marker `<!-- pdac-drift ids="..." summary="..." -->` on its own line — and the decision (a Product Change, or an adjusted change) belongs to humans. Drift is never fixed quietly.
  - New `prodshape drift` command: list every recorded drift warning across consumer documents (`--provider openspec` covers the whole population, archived material marked), reporting document, artifacts (with whether each still exists in the model) and summary. A report, never a gate: recorded drift exits 0.
  - `citations verify --provider openspec` now always includes archived changes and checks their citations, reporting everything found in archived material as a warning (archived history cannot be edited; its drift is information). The scope gate keeps applying to current documents only. `--include-archived` now applies the full gate — scope declarations and error severities — to archived documents too.

## 0.15.0

### Minor Changes

- cd1b100: Conformance and robustness polish (issue #65).

  - **The diagnostic registry now tracks a pinned spec revision.** `docs/specification/.source.json` records the spec commit the local code tables are checked against, `pnpm registry:sync` vendors the normative code-to-severity extract as `docs/specification/.spec-registry.json`, and the conformance test compares the local tables and every emission against it instead of against themselves. Codes ProductShape issues beyond the normative registry (`PRODUCT070`–`PRODUCT075`) are declared explicitly, so divergence is a reviewed decision rather than a silent one. The precise extraction also surfaced a real gap: `PRODUCT061` (stale citation) was explained in prose but had no row in the warning-code table, and now has one.
  - **`citations verify` consumer roots are configurable.** The scan root was hardcoded to `openspec/`, so a repository keeping its consumer documents anywhere else had to name the directory on every invocation. `citations.consumer-roots` (default `['openspec']`) now names the directories scanned when no target is given, several may be listed, and a configured root that does not exist is an error rather than an empty pass. The JSON result reports `targets` (the list actually scanned) in place of the single `target` field.
  - **`validate` no longer writes as a side effect.** A read-only verdict mutated the tree to produce it, leaving untracked `.product/generated` directories wherever it ran — including inside other repositories' conformance fixtures. Generation is now opt-in via `validate --write-generated`; `prodshape graph` remains the dedicated generator.
  - **`change list --all` help text** now names the `superseded` history it has always included.
  - **`PRODUCT108` section matching is exact.** The Open Questions heading is anchored to a line start and to exactly two hashes, so a `### Open Questions` subsection of another section is no longer read as the change's own, and list items inside fenced code blocks are no longer counted as open questions.
  - **`PRODUCT025` compares every pair of changes.** Self-exclusion matched on `id`, so two changes both missing an `id` skipped each other and a real overlap disappeared behind the missing-id defect. Identity is now the change document.

## 0.14.0

### Minor Changes

- 376afcd: Five CLI paper cuts from issue #106. `-v` joins `--version`. `prodshape change create <CHG-ID>` scaffolds a draft Product Change under `changes/active/<id>/` — prompt-free and CI-safe, with `base-revision` resolved from the repository HEAD (or the `0000000` CHG-INITIAL sentinel outside Git history), every required body section present so `prodshape change validate` accepts the scaffold as-is, an optional `--title`, `--format json`, and a refusal (exit 2) to overwrite an existing change. `PRODUCT002` now names the offending field: an additional-properties violation appends the property (`document must NOT have additional properties ('bogus-field')`) and property-level failures fill the diagnostic's `field` with the dotted path. The `--provider openspec` upsell tip after `citations verify` prints only where an OpenSpec workspace exists and the ProductShape integration is not wired yet, so unrelated repositories and already-integrated ones stay quiet. `validate` and `citations verify` gain `--root <dir>` to name the product repository explicitly instead of discovering upward from the working directory — a directory without repository markers is refused with exit 2 — and `examples/minimal` ships its own `.product/config.yaml`, making it directly runnable with `prodshape validate --root examples/minimal`.
- df69fb8: Consumer-verification diagnostics leave the reserved band: `PRODUCT070`/`PRODUCT074`/`PRODUCT075` become `PRODUCT064`/`PRODUCT065`/`PRODUCT066`, matching the numbering spec RFC 0042 allocates for unclassified documents, bound documents without citations and invalid scope declarations, and the OpenSpec adapter mechanics `PRODUCT071`/`PRODUCT072`/`PRODUCT073` become `PRODUCT067`/`PRODUCT068`/`PRODUCT069` beside them. `PRODUCT070`-`PRODUCT079` returns fully to the reservation RFC 0021 states for model-repository resolution. The conditions, severities and precedence are unchanged; only the numbers move, while they are hours old and nothing external depends on them.

## 0.13.0

### Minor Changes

- 885e4b0: `change apply` and `change apply --dry-run` report the affected citation set before the change is accepted (RFC 0048). After computing the product diff, apply intersects it with the repository's citation index — every citation record grouped by target artifact — and reports each citation whose target the diff reports as added, modified or removed: the consumer document's repository-relative path, the point of use (file and line for a payload-carried citation, ledger file and entry for a sidecar citation), the target id with its anchor, and the prospective status the citation will hold against the applied result, computed under the existing citation-status precedence (typically `stale` for a modified target, `unresolved` for a removed one). An empty set is stated explicitly as `Affected citations: 0` — absence of impact is a claim, not silence. The set appears in both the human-readable and the `--format json` apply output, ordered deterministically by consumer path, point of use, target id and anchor; it is recomputed output like the product diff, never persisted into the archived change, and never a veto — apply proceeds however many citations go stale. Core gains `buildCitationIndex`, `computeAffectedCitations` and `appliedArtifacts`, and exports the locale-independent `compareCodeUnits` comparator diagnostics ordering uses.
- 3f591ca: Provider-aware OpenSpec citation enforcement. A reusable, framework-neutral SDD integration-provider contract now lives in core (`SddIntegrationProvider`): a provider enumerates the expected current native consumer documents of its workspace, and core classifies each enumerated document into exactly one effective scope state — `bound` (carries citations or declares `pdac-scope: cited`), `exempt` (a human declared `pdac-scope: none`), or `unclassified` (neither, which fails). OpenSpec enumeration (the `openspec/` layout, changes/archive lifecycle split and the `openspec` CLI) moved out of core into `@prodshape/integration-openspec`, which implements the contract as the first adapter; core no longer exports `discoverOpenSpecPopulation`. `prodshape citations verify --provider openspec` verifies the enumerated population instead of globbing for citation syntax: an unclassified current document fails (`PRODUCT070`), a bound document with zero citations fails (new `PRODUCT074`), an invalid or contradicted scope declaration fails (new `PRODUCT075`), a valid exemption passes but stays visible in text and JSON results, archived changes stay excluded unless `--include-archived`, and a workspace with current documents can never pass vacuously because zero citations were discovered. The provider JSON result uses the `citations-provider/v1alpha1` schema with document states and per-state totals. `integration add openspec` now also teaches the scope model through `openspec/config.yaml` guidance, states the exact provider-aware verification command, and installs a CI-ready example at `.product/integrations/openspec.ci.yml` that makes the repository's configured stale-citation policy explicit without ever changing it; `update`, `check` and `remove` manage that file alongside the rest. The gate never invokes `openspec validate`, and it establishes citation grounding and population coverage only — not semantic completeness or implementation conformance.

### Patch Changes

- 0170f81: Align generated initialization, recovery and OpenSpec guidance with the independent Product Change lifecycle: overlay validation, human product approval, explicit apply, pull-request review and merge acceptance remain distinct from implementation and delivery evidence.
- de5e199: Accept both bare-array and `citations:` mapping YAML sidecar ledgers, and let `prodshape citations verify` check a supported consumer file directly while reporting missing or unsupported targets as invalid invocations.
- 213d2e1: Order diagnostics by file, code, and target with locale-independent UTF-16 code-unit comparison, including complete citation-verification, Product Change apply, and managed-integration results.
- d4c2ba8: Fix `change apply --dry-run` skipping the entire preflight. The preflight (reading every write source, confirming every delete target, verifying the archive destination is absent) lived only inside `executeApply`, which a dry run never called, so a dry run could report "Would apply" for a plan that would fail immediately for real — for example when the archive destination already exists. `executeApply`'s preflight is now a separate exported `preflightApply`, and `--dry-run` runs it too, so it reports the identical refusal a real apply would while still writing nothing.

## 0.12.0

### Minor Changes

- bcb8edc: Brownfield recovery sessions. `prodshape recover` manages deterministic, resumable recovery state under `.product/generated/recovery/<session-id>/`: evidence inventory with content hashes (repository, user-provided and explicitly authorised external sources), bounded batches, per-source classification, leads, user questions with persisted answers, staleness detection, CHG-INITIAL overlay revalidation, coverage, completion criteria and a final report. Semantic extraction stays with the rewritten self-contained recover-product skill, whose candidates live only in the proposed overlay of CHG-INITIAL and are never accepted by tooling.

## 0.11.0

### Minor Changes

- 08cd643: Digest the bytes, never a decoded string, so ProductShape and pdac-lint cannot disagree (spec issue #32).

  `spec/validation.md` defines a content digest as SHA-256 over the artifact's UTF-8 bytes with CRLF and CR normalized to LF. `contentDigest` was applied to a string that had already been decoded by `readFile(path, 'utf8')`, so every invalid UTF-8 sequence became U+FFFD and the digest covered bytes the file does not contain. pdac-lint hashed the bytes and was correct. The two implementations therefore produced different digests for the same file, with nothing detecting it: a citation could be reported `current` by one tool and `stale` by the other.

  `contentDigestBytes(data: Buffer)` is now the only hash, and `contentDigest(content: string)` is defined in terms of it, so a string and its UTF-8 encoding cannot diverge. Every site that digests content from disk or from Git now passes the bytes: artifact loading, Product Change loading, `prodshape cite --file`, and the `PRODUCT027` baseline-drift check. `gitShowBytes` is added for that last one, because `gitShow` decodes as UTF-8 and is the same trap.

  No digest changes for any valid UTF-8 file, so no existing citation, pin or baseline is affected. Both repositories now assert the same four known-answer vectors, including one invalid UTF-8 case and the lossy digest it must not produce, so a future divergence fails a test instead of passing silently.

## 0.10.0

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

## 0.9.0

### Minor Changes

- 5c1b1ac: Product Changes: `PRODUCT028`, a `superseded/` archive, and a product diff that names its impact

  The specification's second refinement of RFC 4 determined the five points that previously did not fix an implementation's behaviour. Two of them override the defaults this toolkit chose, and three are confirmed with the behaviour made explicit.

  - **`PRODUCT028`** — applying a Product Change whose status is not `approved` now reports the diagnostic `PRODUCT028` instead of a codeless error. It exits `1` (the invocation is well formed; the finding is about the model), is evaluated before anything is written, and leaves the working tree untouched. `ApplyPlan.blockers` is gone: both apply preconditions are diagnostics now, so there is no second, codeless channel for a refusal.
  - **`changes/superseded/`** — `prodshape change archive` files a `superseded` change under `docs/product/changes/superseded/` rather than alongside refusals in `rejected/`. `superseded` is reachable from `approved`, so filing it as a refusal recorded a decision nobody made. One directory per terminal status; `change list --all` reports the new state, and `prodshape init` scaffolds the directory.
  - **The product diff names its impact** — every entry carries `kind` (`added`, `modified` or `removed`) alongside the artifact and, for an addition or a modification, the resulting digest. A removal leaves no content and so carries no digest. Both the text and the JSON report carry all three facts per entry. The diff is still computed from the applied result rather than read off the declared operations, is still reported rather than written into the archived change, and its determinism is semantic rather than byte-level.
  - **`PRODUCT108`** — the warning is state-based and syntactic, as it already was in substance: it is reported on every validation of a change in status `approved`, not only at the transition. An unresolved question is any Markdown list item under `## Open Questions` at any nesting depth, bullet or ordered, counted regardless of content — task-list checkboxes included, since nothing in the syntax says who checked one. Ordered and `+` markers were previously missed. Prose is not a question, so `None.` and an empty section stay silent.
  - **Baseline drift** — confirmed unchanged: it covers `operations.modify` and `operations.remove` only, and an artifact counts as changed when its normalized content digest differs from its digest at `base-revision`, so a formatting-only commit is not drift and an addition is never drift-checked.

## 0.8.0

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

## 0.7.0

### Minor Changes

- 267df9b: Product Snapshot: the Product Explorer

  The snapshot's exploration experience is now the Product Explorer: four coordinated surfaces over one selection and one addressable state. Completeness means every artifact and canonical relationship is reachable — not that every node is simultaneously rendered.

  - **Overview** — identity, revision, aggregate counts by kind with an entry point into each artifact family, the kind-level relationship aggregate, a neutral report of artifacts holding no relationships, and global search on the first screen.
  - **Catalog** — discovery as a workspace: search by identifier, title and content; filters over canonical fields only (kind, status, and bounded context where the model declares one); the query-and-filter state lives in the address, so a result set is deterministic and shareable, and opening a result and returning resumes the discovery.
  - **Artifact Reader** — the selected artifact dominates: authored content with its heading hierarchy, relationships grouped by meaning in both directions with complete counts on every group, titles and identifiers on every entry, one-step refocus, and a named, retraceable navigation context. The model is navigable as a graph through reading alone.
  - **Focused Topology** — a visual projection beside the Reader that is local, bounded and progressive: the selected artifact anchors its immediate relationship groups, typed and counted; small neighbourhoods open whole while large groups start collapsed with their complete counts; disclosure is addressable (`?x=`) and replaces history; refocusing draws a new neighbourhood rather than accumulating; sets too dense to draw legibly fall back to a structured list; the arrangement re-allocates on expand so nothing collides or leaves the canvas; and pan, zoom and fit work by pointer and keyboard.

  There is no whole-product drawing of any kind. The earlier whole-model circle, the layered map and the standalone projection routes are gone; old `#/graph` addresses resolve in place into the integrated view, and bare-identifier fragments keep their permanent guarantee. The page remains one static, self-contained, offline, deterministic file with no global scroll — each region scrolls on its own.

## 0.6.0

### Minor Changes

- ab8adff: Product Snapshot: orient first, read one artifact at a time

  `prodshape graph --format html` now generates a progressive-disclosure explorer instead of a fully expanded report. The file still contains the whole model — every artifact body and every relationship — but it carries them as inert embedded data and renders on demand, so the document the browser parses at open time holds the orientation view only.

  - **Opens on an overview**: identity, revision, artifact and relationship totals, counts by kind with entry points, a kind-level relationship aggregate, and a neutral report of the artifacts holding no relationships. No artifact body and no artifact-level graph at open.
  - **Master–detail reading**: exactly one artifact detail at a time, with its metadata, authored Markdown, and its declared and derived references kept apart.
  - **One selected artifact, addressable**: a single fragment router owns every state transition, so direct links work from `file://` and static hosting and Back/Forward retrace exploration. Fragments produced by earlier snapshots (`#FR-SNAPSHOT-002`) keep resolving permanently and are normalized in place without adding a history entry.
  - **Presentation**: light-only, system sans-serif with monospaced identifiers and revisions, thin borders, one accent plus a stable per-kind palette, and no meaning carried by colour alone.
  - **Accessibility**: landmarks and heading outline, keyboard operation, visible focus, `aria-current` on the selected artifact, WCAG 2.1 AA text contrast, reduced-motion respected.
  - **Smaller and flat at scale**: the generated file drops ~47% (459,704 → 246,167 bytes for this repository's own model) and the opening document grows 1.12× across a tenfold larger model, where it previously grew 10.55×.
  - Markdown link targets are restricted to `http`, `https` and `mailto`, so an authored `javascript:` or `data:` URL renders as inert text rather than an executable link.

  The whole-model graph is no longer part of the opening view and is opened on request. Generation remains deterministic and byte-identical for identical model content, offline, self-contained and read-only, and the CLI is unchanged.

- d313e9e: Product Snapshot: ranked offline search

  Search matched substrings without ranking, walked the artifact list in document order and stopped at a cap. Querying `product` against this repository's own model matched 73 artifacts, showed 25, hid 48 without saying so, and returned **none** of the eight artifacts whose titles begin with "Product" — including the term "Product Snapshot" itself.

  - Results are **ranked**: exact identifier, then identifier prefix, then exact or prefix title, then title substring, then body content. Ties break on identifier, so ordering is total and deterministic.
  - Artifact **kinds** are searchable alongside identifiers, titles and bodies.
  - Every result shows identifier, title and kind; a body match also shows a **snippet** of the matching content, inserted as text.
  - **Truncation is never silent** — the page states the total match count whenever it limits what it displays, and never shows a lower-ranked match in place of a higher-ranked one.
  - **Keyboard**: arrows move an active result reported with `aria-activedescendant`, Enter follows it, Escape clears. Clearing never discards the selected artifact.
  - A query matching nothing says so and repeats the query.

  Also fixes a latency defect the ranking work exposed: the body-text index was built by parsing every rendered artifact through the DOM on the first keystroke, costing **849 ms** on a 730-artifact model. It now strips the generator's known tag vocabulary textually and warms during idle time — **15.5 ms** for the same first query, a 98% reduction.

- 8163f95: Product Snapshot: relationships grouped by type and kind, with exact counts

  An artifact's relationships were a flat list per direction — `BC-PRODUCT-DEFINITION` in this repository's own model spilled 27 undifferentiated rows, and a ten-times-larger model reaches 171. They are now grouped and counted.

  - Each direction is grouped by **relationship type** and then by the **artifact kind** at the other end, and every group states its **exact count**.
  - A group of more than eight members **starts collapsed**, showing its count instead of its members, and expands only when asked. Smaller groups stay open so nothing is hidden without reason. A lone large group collapses too — being the only group does not make it small.
  - Collapsed groups render no members until first opened, so selecting a high-degree artifact got **faster**: p95 selection latency on a 730-artifact model improved from 29.2 ms to 24.0 ms.
  - Disclosure uses the platform's own `<details>`/`<summary>`, so expansion is keyboard-operable and announces its state without ARIA to maintain.
  - Declared and derived directions stay separately labelled, every entry keeps its relationship type and direction, and every related artifact stays one step away.

  The complete list of typed, directed relationships remains readable without any visualization — the substance the focused neighbourhood projection will accelerate rather than replace.

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

## 0.2.0

### Minor Changes

- 84f6dbf: Conformance fixes for the v0.1 release candidate (fix-v01-conformance):

  - Promotion now requires coverage evidence per completed delivery slice (FR-PROMOTE-001). `planPromotion` accepts a `coverageProvider` port; the OpenSpec adapter discovers handoff sidecars deterministically (`findChangeHandoffDirs`, `checkSliceEvidence`); missing or unverifiable evidence is the new `PRODUCT044`; repositories without an SDD adapter must pass the new `--accept-external-evidence` flag explicitly.
  - `applyPromotion` is two-phase: a preflight that touches nothing on failure, then execution with the change-directory move last, so a failed promotion cannot leave a partially promoted baseline.
  - The CLI package installs the `product-definition` binary alias again (identical to `prodshape`), which generated skills and hooks invoke.
  - Coverage evidence is hardened: covered/partial entries need non-empty `specification` and `verification` arrays, evidence paths cannot be absolute or escape the repository, and entries for requirements outside `handoff.implements` are rejected.
  - `installProvider` preflights every target: files not owned by the installation lock, or owned but hand-edited, block `init --ai`, `integration add` and `integration update` (with the full conflict list) unless `--force`; refusals leave files and lock untouched.
  - `validation.warnings-as-errors` is enforced uniformly via `escalateWarnings` across baseline validate, change validate, handoff generation, graph generation and promotion.
