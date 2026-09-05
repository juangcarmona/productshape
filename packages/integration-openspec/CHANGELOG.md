# @prodshape/integration-openspec

## 0.6.0-alpha.4

### Patch Changes

- Updated dependencies [f1a1612]
  - @prodshape/core@0.21.0-alpha.0

## 0.6.0-alpha.3

### Minor Changes

- d01fde2: Add the OpenSpec-hosted `product-recovery` workload for bounded, resumable brownfield recovery.

## 0.6.0-alpha.2

### Minor Changes

- 1c38d4e: Strengthen the hosted `product-change` workflow with proportional graph-guided clarification, resumable refinement notes, explicit `/product:refine` continuation and packed-consumer coverage. Keep Changesets Action v1 aligned with the repository's Changesets CLI v2 release workflow.

## 0.6.0-alpha.1

### Patch Changes

- 4fd179c: Rename the hosted OpenSpec workload and schema to `product-change`, with safe migration of owned legacy `product` schema installations. Restore the Changesets action to the CLI-v2-compatible release workflow.

## 0.6.0-alpha.0

### Minor Changes

- 07b8de2: Host the PDaC product workflow in OpenSpec. The integration now installs a managed project-local `product` schema (openspec/schemas/product: schema.yaml, authoring templates and the bridge scripts) whose OpenSpec changes host a Product Change delta, and exports the deterministic rails: inspectProductModel, listOpenSpecProductChanges, loadOpenSpecProductChange, validateOpenSpecProductChange (overlay validation with concurrency spanning both change containers), applyOpenSpecProductChange (revalidates configuration, baseline and overlay at apply time, requires the protocol state that records human product approval, fails closed before any write, never archives) and deriveDeliveryContext (fresh post-apply context for a future delivery workflow). Valid OpenSpec 1.11 metadata and the change container's `schema: product` pin are load-bearing; malformed product-shaped containers fail listing and concurrency closed. Managed schema ownership is proven per exact recorded path and digest: metadata is confined to `openspec/schemas/product`, install never adopts a pre-existing file even when byte-identical, update replaces or removes only proven-managed content, and remove preserves and reports unrecorded or diverged files. Compatibility is capability-specific: the product workflow requires OpenSpec 1.7.0 and reports itself unavailable below that floor while the citation lane keeps working. The agentic instructions now stop for user clarification before an ambiguous intent becomes a delta or approval, and keep citations at the consuming proposal boundary rather than in the change manifest or proposed canonical artifacts. The shipped guidance names the two lanes; the citation lane is unchanged. The CLI ships the bundled integration and stages the schema assets into its package.

## 0.5.3

### Patch Changes

- 3e44e9c: Repository mutation is now contained, planned before it acts, drift-safe and fails closed (the safety phase of #208).

  Six defects are fixed. A path recorded in `.product/installation.lock.json` could name a target outside the repository and have it deleted: the lock is now validated in full before any entry is used, every recorded path is held to the normalized repository-relative contract, and every read, write, rename and deletion resolves through one containment-checked resolver. `integration add --dry-run` wrote every managed file and then reported that nothing had been written: installation is planned first, a dry run is the plan without the apply, and a dry run predicts a refusal instead of reporting a success the real run would not deliver. `integration remove` deleted managed files a human had edited: removal now compares each file against the digest recorded for it, preserves and reports what has diverged, keeps that file's lock entry so it stays covered by drift detection, and deletes it only under the new `--force`. `extensions.prodshape.generated.root` could resolve outside the repository: it is now held to the same contract as `product-root` and an escaping value is rejected as `PRODUCT050` before command-specific work begins. A malformed, unreadable or off-contract lock was read as "nothing installed": only the not-found condition means absence now, `integration check` and `doctor` fail when a lock exists but cannot be trusted, and configuration that exists but cannot be read is reported instead of silently replaced with defaults. Integration operations are byte-idempotent: a no-op add or update rewrites no managed file, no template, no installation lock and no integration metadata, `installedAt` is preserved as the first-installation moment, and a new optional `updatedAt` records when managed content last actually changed.

  `CHG-MUTATION-SAFETY-001` adds `BR-MUTATION-001` and amends `FR-DISTRIBUTION-001`, `FR-OPENSPEC-001` and `FR-SPECKIT-001` with the report, preservation, fail-closed and idempotence obligations. `@prodshape/core` gains the repository-relative path contract and its resolver; `@prodshape/distribution` gains `src/mutation.ts`, the one module that owns managed-file mutation, and depends on `@prodshape/core` for the resolver so there is exactly one.

  Consumer document roots are deliberately unaffected: they are read-only scan targets, may point outside the repository, and are now documented and tested as such.

  Normative diagnostics, deterministic ordering and the documented exit codes are unchanged.

- Updated dependencies [3e44e9c]
  - @prodshape/core@0.20.0

## 0.5.2

### Patch Changes

- f0d4a86: The recover UX wave, from the first external recovery run (#196-#206, one change per lesson the run taught).

  Recovery sessions grow the operations the run had to improvise: `recover unmark` retracts a wrong finding instead of leaving hand-editing session state as the only repair (#197); `recover mark --glob` / `--sources` applies one identical finding to a whole pending selection in a single state write, all or nothing (#198); the brief's ordered `tiers` drive inventory order so SDD specs and product documentation are served before source code instead of relying on path order (#199); and the brief's `git.branch` opts into checkpoint discipline, where the CLI creates the dedicated recovery branch, refuses a dirty tracked tree, and records one `recover(CHG-INITIAL): <step>` commit per state-mutating command (#205, with FR-RECOVER-001 amended by CHG-RECOVER-GIT-001 to permit exactly that and nothing more).

  Artifact id lists are now validated when they are recorded: `mark --artifacts` splits on commas and whitespace and rejects anything that is not a plausible artifact id, with a hint to quote the list, because the npm PowerShell shim turns an unquoted comma list into one space-joined argument that used to be stored silently and only explode later in `recover check` (#196). `prodshape cite` accepts `SB-` ids: `emitCitation` still carried a pre-RFC-0084 pattern, and the id grammar is now derived from the canonical kind-prefix map so a future kind cannot be forgotten again (#206).

  Two new canonical skills ship with their `/product:bind` and `/product:refine` commands: `bind-consumers` backfills scope declarations and citations into existing SDD consumer documents after an initial baseline, recording drift instead of fixing it, and `refine-product` runs the question-driven refinement interview whose answers become an ordinary Product Change (#202, #203). The recover-product skill is hardened where the external run stumbled (author candidates by copying templates, check after the first candidate, quote artifact lists, `SB-` in the prefix list, map evidence in the same step as creating a candidate) and its handover now offers the next moves: checkpoint commit, snapshot preview, the exact lifecycle commands, and the consumer-binding follow-up (#200, #204).

  Both SDD context blocks now enumerate the whole model, bounded contexts and structured behaviours included; already-integrated repositories pick the wording up through `prodshape integration update` (#201).

  The canonical skills also went through a refinement pass: each SKILL.md is the compressed view and its references own the depth (the authoring chain, the finding classifications, the exploration heuristics, the change template contract, the provenance contract each live in exactly one place), the two H1s that hardcoded shorthand aliases stop doing so (the `/ps:` shorthand itself stays opt-in and configured), the role noun is uniformly "the engineer", and every skill's "When to use" names its neighbouring skills so requests route without a router. `pnpm sync:assets` replaces the manual mirror step between the canonical `skills/`, `commands/` and `templates/` directories and the bundled distribution assets; the byte-identity test remains the gate.

- Updated dependencies [f0d4a86]
  - @prodshape/core@0.19.0

## 0.5.1

### Patch Changes

- Updated dependencies [1e6d965]
- Updated dependencies [6ef7709]
- Updated dependencies [043725f]
- Updated dependencies [0e563ce]
  - @prodshape/core@0.18.0

## 0.5.0

### Minor Changes

- 060b5e1: Complete population-aware scope declarations per the frozen citation contract. Every current consumer document needs exactly one explicit declaration: `pdac-scope: cited` with at least one citation (bound), or `pdac-scope: none` with a non-empty human-authored reason (exempt), written as `pdac-scope-reason:` in frontmatter or `reason="..."` in the comment form. Citations alone no longer bind; an undeclared or unrecognized declaration is unclassified (`PRODUCT064`), and an exemption without a reason or contradicted by citations is one `PRODUCT066` per document. Provider verification now excludes archived history by default (`--include-archived` verifies its citations as warnings, scope gate current-only) and reports the provider identity and integration version; `SddIntegrationProvider` gains a required `version`.

### Patch Changes

- c8bd0b0: Align apply and citation writing with the frozen PDaC kernel contracts. The exact `CHG-INITIAL`/`0000000` pair now skips Git resolution, every ordinary revision must resolve even for add-only changes, and an unresolved revision produces one `PRODUCT027`. `prodshape cite` now writes the canonical ordered payload by default or the canonical mapping-form sidecar, rewrites the legacy inline request to a payload, and refuses to emit an unverifiable empty marker block. Generated context and integration instructions wrap payloads in native Markdown comments.
- Updated dependencies [4c2675a]
- Updated dependencies [b5f54df]
- Updated dependencies [02f4fef]
- Updated dependencies [c8bd0b0]
- Updated dependencies [060b5e1]
- Updated dependencies [cbd0602]
  - @prodshape/core@0.17.0

## 0.4.2

### Patch Changes

- Updated dependencies [f1bba4c]
  - @prodshape/core@0.16.1

## 0.4.1

### Patch Changes

- f47c886: Run OpenSpec commands with safely escaped argument arrays across platforms, eliminating Node 24 DEP0190 warnings from provider commands.

## 0.4.0

### Minor Changes

- fb9b7b6: OpenSpec citation coverage (CHG-OPENSPEC-COVERAGE-001, -002 and -003, FR-OPENSPEC-001):

  - The merged proposal rules now require an impact pass before any proposal content is written: compare the change's intent (the backlog item, if there is one) with the whole product definition to find every artifact the change depends on, alters or contradicts; widen that list with `prodshape impact <ID>`; record the list in the proposal; cite every impacted artifact from each document that uses it; and name the neighbours that were checked and left out.
  - The merged proposal rules now require surfacing product-definition drift: when the change's goals contradict or go beyond the definition, the divergence is recorded in the proposal as an explicit warning naming the artifacts involved — with the marker `<!-- pdac-drift ids="..." summary="..." -->` on its own line — and the decision (a Product Change, or an adjusted change) belongs to humans. Drift is never fixed quietly.
  - New `prodshape drift` command: list every recorded drift warning across consumer documents (`--provider openspec` covers the whole population, archived material marked), reporting document, artifacts (with whether each still exists in the model) and summary. A report, never a gate: recorded drift exits 0.
  - `citations verify --provider openspec` now always includes archived changes and checks their citations, reporting everything found in archived material as a warning (archived history cannot be edited; its drift is information). The scope gate keeps applying to current documents only. `--include-archived` now applies the full gate — scope declarations and error severities — to archived documents too.

### Patch Changes

- Updated dependencies [fb9b7b6]
  - @prodshape/core@0.16.0

## 0.3.1

### Patch Changes

- Updated dependencies [cd1b100]
  - @prodshape/core@0.15.0

## 0.3.0

### Minor Changes

- df69fb8: Consumer-verification diagnostics leave the reserved band: `PRODUCT070`/`PRODUCT074`/`PRODUCT075` become `PRODUCT064`/`PRODUCT065`/`PRODUCT066`, matching the numbering spec RFC 0042 allocates for unclassified documents, bound documents without citations and invalid scope declarations, and the OpenSpec adapter mechanics `PRODUCT071`/`PRODUCT072`/`PRODUCT073` become `PRODUCT067`/`PRODUCT068`/`PRODUCT069` beside them. `PRODUCT070`-`PRODUCT079` returns fully to the reservation RFC 0021 states for model-repository resolution. The conditions, severities and precedence are unchanged; only the numbers move, while they are hours old and nothing external depends on them.

### Patch Changes

- Updated dependencies [376afcd]
- Updated dependencies [df69fb8]
  - @prodshape/core@0.14.0

## 0.2.0

### Minor Changes

- 3f591ca: Provider-aware OpenSpec citation enforcement. A reusable, framework-neutral SDD integration-provider contract now lives in core (`SddIntegrationProvider`): a provider enumerates the expected current native consumer documents of its workspace, and core classifies each enumerated document into exactly one effective scope state — `bound` (carries citations or declares `pdac-scope: cited`), `exempt` (a human declared `pdac-scope: none`), or `unclassified` (neither, which fails). OpenSpec enumeration (the `openspec/` layout, changes/archive lifecycle split and the `openspec` CLI) moved out of core into `@prodshape/integration-openspec`, which implements the contract as the first adapter; core no longer exports `discoverOpenSpecPopulation`. `prodshape citations verify --provider openspec` verifies the enumerated population instead of globbing for citation syntax: an unclassified current document fails (`PRODUCT070`), a bound document with zero citations fails (new `PRODUCT074`), an invalid or contradicted scope declaration fails (new `PRODUCT075`), a valid exemption passes but stays visible in text and JSON results, archived changes stay excluded unless `--include-archived`, and a workspace with current documents can never pass vacuously because zero citations were discovered. The provider JSON result uses the `citations-provider/v1alpha1` schema with document states and per-state totals. `integration add openspec` now also teaches the scope model through `openspec/config.yaml` guidance, states the exact provider-aware verification command, and installs a CI-ready example at `.product/integrations/openspec.ci.yml` that makes the repository's configured stale-citation policy explicit without ever changing it; `update`, `check` and `remove` manage that file alongside the rest. The gate never invokes `openspec validate`, and it establishes citation grounding and population coverage only — not semantic completeness or implementation conformance.
- 3b331a5: SDD-aware initialization. `prodshape init` detects SDD frameworks present in the repository (OpenSpec via `openspec/`, Kiro via `.kiro/`, Spec Kit via `.specify/`) and reports them; `--sdd openspec` wires the OpenSpec integration in the same run, bootstrapping the workspace first (`openspec init --tools none`, through `npx -y @fission-ai/openspec@1` when the CLI is not installed) when none exists. Kiro and Spec Kit receive printed setup guidance because they install through their own tooling. In an interactive terminal a bare `init` asks, informed by the detection; with an explicit `--sdd` value, `--sdd none`, or no terminal it never prompts, and `--dry-run` describes the SDD actions without executing anything. `doctor` now points at `prodshape integration add openspec` when a workspace exists without the integration. The OpenSpec integration records the exact strings it injects into `openspec/config.yaml`, so a later update replaces outdated PDaC entries instead of accumulating duplicates, `detectOpenSpecVersion` consults the repository's `node_modules/.bin` so a devDependency install counts, and the CLI-not-found message names the real package (`@fission-ai/openspec`).

### Patch Changes

- 0170f81: Align generated initialization, recovery and OpenSpec guidance with the independent Product Change lifecycle: overlay validation, human product approval, explicit apply, pull-request review and merge acceptance remain distinct from implementation and delivery evidence.
- Updated dependencies [885e4b0]
- Updated dependencies [0170f81]
- Updated dependencies [de5e199]
- Updated dependencies [213d2e1]
- Updated dependencies [d4c2ba8]
- Updated dependencies [3f591ca]
  - @prodshape/core@0.13.0
