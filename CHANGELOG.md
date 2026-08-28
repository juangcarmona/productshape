# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The supported published CLI baseline is `@prodshape/cli@0.15.0`. Every stable public CLI release from `0.1.0` through that baseline is recorded below; package-specific dependency changes remain in each package's changelog.

## [Unreleased]

## [0.15.0]

Wave 2 alignment with the frozen PDaC kernel contracts, verified against spec revision `9ff12df` with `pdac-lint@0.2.0` (19 cases, 8 pinned digests).

### Added

- Kernel-first adoption: `prodshape init` installs four files (configuration, model home, live-change home, README); `--full` installs the per-kind layout, change archives and template library, and selecting an AI integration implies it. `prodshape template <kind>` prints any bundled authoring template, and validating an empty model names the `CHG-INITIAL` route instead of presenting emptiness as success.
- `init --gitignore` writes the regenerable-output ignore rules it previously only recommended: append-only, idempotent, never unasked, following the configured `generated.root`.

### Changed

- Diagnostics align with the frozen validation contract: `change`, `line` and `entry` fields, a cited ID in `target` (never `artifact`), deterministic eight-key ordering, `PRODUCT002` once per distinct invalid instance path, `PRODUCT003` with `field: type`.
- Configuration adopts the kernel `v1alpha1` contract: tool settings live under `extensions.prodshape`, an invalid file is exactly one `PRODUCT050` with exit `2` and no fallback to defaults, and `blockingDiagnostics` replaces `escalateWarnings` (severity stays `warning`).
- Citation carriers are the two normative forms with the closed payload grammar and the sidecar schema; a consumer using both gets one `PRODUCT067` with both carriers' statuses suppressed, and `prodshape cite` writes the canonical payload or mapping-form sidecar.
- Provider verification enforces population-aware scope declarations: every current document is `bound` (`pdac-scope: cited` with citations) or `exempt` (`pdac-scope: none` with a human-authored reason), citations alone never bind, archived history is excluded by default and verified as warnings under `--include-archived`.
- Apply honors the exact `CHG-INITIAL`/`0000000` no-baseline sentinel; every ordinary `base-revision` must resolve, and an unresolved one is a `PRODUCT027`.
- The vendored schemas and diagnostic registry track spec revision `9ff12df`, and the README certification claim names the current pins.

## [0.14.0]

### Added

- Spec Kit integration (`@prodshape/integration-speckit`): `citations verify --provider speckit` and `drift --provider speckit` enumerate the `spec.md`, `plan.md` and `tasks.md` of every feature directory under `specs/` and apply the bound/exempt/unclassified scope gate, so verification over a Spec Kit workspace runs on a known population and never passes vacuously. `prodshape integration add/update/check/remove speckit` manage a guidance file at `.specify/memory/pdac.md`, sentinel-delimited Product Grounding blocks merged into the workspace's spec, plan and tasks templates (carried into every generated document), a CI-ready example and integration metadata; the constitution, Spec Kit scripts and feature directories are never written. `init` and `doctor` detect and route Spec Kit workspaces.
- `prodshape context <ID> [<ID>...]`: a deterministic, derived, non-canonical cited context projection of the requested artifacts' canonical text (ready inline citations included) plus their structural neighborhood, in Markdown and JSON, so delivery work starts from cited product text instead of paraphrase.
- The pdac Spec Kit extension (`extensions/speckit-pdac`): context and verify commands plus optional hooks after the specify, plan and tasks phases, installable through Spec Kit's own tooling.

### Fixed

- OpenSpec provider commands run with safely escaped argument arrays across platforms, eliminating Node 24 DEP0190 warnings.

## [0.13.0]

### Added

- `prodshape drift`: lists every recorded product-definition drift warning across consumer documents, reporting the document, the artifacts involved (with whether each still exists in the model) and the summary. `--provider openspec` covers the whole population, with archived material marked. Drift is reported, never gated: a recorded warning exits `0`.
- The merged-proposal rules require an impact pass before any proposal content is written: compare the change's intent with the whole product definition to find every artifact the change depends on, alters or contradicts, widen that list with `prodshape impact <ID>`, record it in the proposal, cite every impacted artifact, and name the neighbours that were checked and left out.
- The merged-proposal rules require surfacing product-definition drift explicitly: when a change's goals contradict or go beyond the definition, the divergence is recorded in the proposal as a warning naming the artifacts involved, marked with `<!-- pdac-drift ids="..." summary="..." -->` on its own line. Drift is never fixed quietly; the decision belongs to humans.

### Changed

- `citations verify --provider openspec` always includes archived changes and checks their citations, reporting anything found in archived material as a warning (archived history cannot be edited, so its drift is informational). `--include-archived` now applies the full gate, scope declarations and error severities included, to archived documents too.

## [0.12.0]

### Added

- The diagnostic registry tracks a pinned spec revision: `docs/specification/.source.json` records the spec commit the local code tables are checked against, `pnpm registry:sync` vendors the normative code-to-severity extract, and the conformance test compares the local tables and every emission against it instead of against themselves. `PRODUCT061` (stale citation) now has a row in the warning-code table.
- `citations.consumer-roots` (default `['openspec']`) names the directories `citations verify` scans when no target is given. Several roots may be listed, and a configured root that does not exist is an error rather than an empty pass; the JSON result reports `targets` in place of the single `target` field.

### Changed

- `validate` no longer writes `.product/generated` as a side effect. Generation is opt-in via `validate --write-generated`; `prodshape graph` remains the dedicated generator.
- `change list --all` help text names the `superseded` history it has always included.

### Fixed

- `PRODUCT108`'s Open Questions heading match is exact: anchored to a line start and to exactly two hashes, so a nested `### Open Questions` subsection is no longer read as the change's own, and list items inside fenced code blocks are no longer counted.
- `PRODUCT025` compares every pair of changes. Self-exclusion previously matched on `id`, so two changes both missing an `id` skipped each other and a real overlap disappeared behind the missing-id defect.

## [0.11.0]

Version 0.10.0 was prepared but never published: the release workflow could not complete without the OpenSpec CLI it shells out to (fixed below), so no `0.10.0` package ever reached npm. Its changes are included in this release, published directly after `0.9.0`.

### Added

- `change apply` and `change apply --dry-run` report the affected citation set before the change is accepted: every citation whose target the product diff reports as changed, with consumer path, point of use, target id and the prospective status under the existing precedence. An empty set is stated explicitly. The report is recomputed output, never persisted, and never a veto.
- Provider-aware OpenSpec citation enforcement: `citations verify --provider openspec` verifies the enumerated consumer-document population (`bound` / `exempt` / `unclassified`) instead of globbing for citation syntax, so a workspace with current documents can never pass vacuously through zero discovered citations (`PRODUCT064`, `PRODUCT065`, `PRODUCT066`).
- SDD-aware initialization: `prodshape init` detects OpenSpec, Kiro and Spec Kit; `--sdd openspec` wires the OpenSpec integration in the same run.
- `prodshape --version`, sourced directly from the CLI package manifest and verified from the packed tarball.
- A release-contract smoke gate that packs the CLI, installs the tarball without workspace links, and executes the primary documented init, validation, citation, current-verification and stale-verification workflow in a clean repository.
- `prodshape change create <CHG-ID>` scaffolds a valid draft Product Change: frontmatter with `status: draft` and a `base-revision` resolved from the repository head (or the `CHG-INITIAL` sentinel outside git history), every required body section, and a `proposed/` directory. It validates the ID before writing and refuses to overwrite an existing change.
- `-v` as the short form of `--version`.
- `--root <dir>` on `validate` and `citations verify`: an explicit root replaces upward discovery but must carry the discovery markers, so a mistyped path cannot open an empty repository and read as a pass. `examples/minimal` carries its own `.product/config.yaml` and runs directly via `prodshape validate --root examples/minimal`.

### Changed

- Product Change guidance now follows the normative lifecycle: overlay validation, human product approval, explicit apply on a working branch, pull-request review, and merge acceptance of the resulting baseline. Apply is not acceptance, and neither apply nor merge attests implementation, verification, release or deployment.
- The sidecar citation ledger is accepted in both the bare-array and the `citations:` mapping form, and `citations verify` can check a supported consumer file directly.
- `PRODUCT002` names the offending field: JSON Schema violations for additional and missing properties carry the dotted property path in the message and the diagnostic `field`.
- The OpenSpec integration tip after `citations verify` prints only in an OpenSpec workspace without the integration installed, and never in JSON output.

### Fixed

- `change apply --dry-run` runs the full preflight, so a dry run reports the identical refusal a real apply would instead of "Would apply" for a plan that cannot execute.
- Diagnostics are ordered by file, code and target with locale-independent UTF-16 code-unit comparison across citation verification, Product Change apply and managed-integration results.
- The Release workflow installs the OpenSpec CLI before `pnpm run version`, whose `integration update` step shells out to it; without it every version-PR run failed and no release could be prepared.
- The stable publish job now configures a git identity before `changeset publish`. Without one, the annotated tags changesets creates (`git tag <name> -m <name>`) failed for every package, and the failure was silent because `tagPublish` discards what `git.tag` returns. The v0.2.0 release published six packages and pushed zero tags without failing. The push step now also verifies that every published version has a tag on the remote, rather than trusting a push that reports `Everything up-to-date` whether or not there was anything to push.

## [0.9.0]

### Added

- Deterministic, resumable brownfield recovery sessions under `.product/generated/recovery/<session-id>/`, including evidence hashes, bounded batches, classifications, leads, questions, checkpoints, staleness detection, `CHG-INITIAL` overlay validation and a final report. Semantic extraction remains human/AI-assisted and never becomes canonical automatically.

## [0.8.1]

### Fixed

- Content digests now hash file bytes rather than a lossy decoded string, keeping ProductShape and `pdac-lint` aligned even for invalid UTF-8 input without changing valid UTF-8 digests.

## [0.8.0]

### Changed

- Functional and quality requirement acceptance criteria live in `verification[]`; the old body-section restatements are no longer required.
- Citation status precedence is deterministic: invalid digest, unresolved target, unresolved anchor, tampered, stale, current. JSON citation output now includes diagnostics.

## [0.7.0]

### Added

- `PRODUCT028` for apply attempts on changes that are not approved, a distinct `changes/superseded/` archive, and product-diff entries carrying impact kind and resulting digest.

### Changed

- `PRODUCT108` and baseline-drift behaviour were aligned with the refined Product Change contract.

## [0.6.0]

### Changed

- Replaced the delivery-slice, handoff, coverage and promotion pipeline with the Product Change and Citation contracts. Product Changes are overlay-validated, human-approved, explicitly applied and accepted only when the resulting baseline is merged.
- Removed `handoff`, `coverage` and `change promote`; added `cite`, `citations verify`, `change validate`, `change apply`, `change list` and `change archive`.
- The OpenSpec library still used the legacy `@prodshape/adapter-openspec` name in this release. Current releases use `@prodshape/integration-openspec`.

## [0.5.0]

### Added

- A navigable offline Product Snapshot with bidirectional relationship links, graph visualization and client-side search over IDs, titles and content.

## [0.4.0]

### Added

- `prodshape graph --format html`, generating a static, self-contained, read-only and byte-deterministic Product Snapshot.

## [0.3.0]

### Added

- The `explore-product` skill and `/product:explore` command, with opt-in `/ps:explore` shorthand, for graph-aware clarification before drafting a Product Change.

## [0.2.0]

The first round of improvements from adoption outside this repository, plus the audit pass that followed merging them. 226 tests pass and CI runs on Linux, Windows and macOS across Node 22 and 24.

Published as `@prodshape/cli` 0.2.0, `core` and `distribution` 0.3.0, `integration-claude` and `integration-copilot` 0.2.0, and `adapter-openspec` 0.2.1 — the packages are versioned independently, so they carry different numbers.

### Added

- Artifacts accept an optional `provenance` object recording the evidence behind recovered knowledge (`source` and `confidence` required, `recovered-from` optional). A `draft` artifact resting on `confidence: low` reports the new warning `PRODUCT111`, so the queue of candidates needing human validation is derivable from validation output. Previously the methodology required provenance that the schemas had nowhere to put, and `recover-product` worked around it by writing provenance into body prose (`add-provenance-field`).
- [Frontmatter reference](docs/specification/frontmatter-reference.md): the allowed properties of all 13 document kinds, with permitted values and identifier patterns, generated from the canonical schemas and drift-tested against them (ADR 0009). `prodshape schema <kind>` prints the same contract, and needs no repository — the moment it is wanted is before `init` (`document-frontmatter-schema`).
- `prodshape fix --filenames` resolves `PRODUCT101` by renaming artifact files to match their ID casing. It renames through an intermediate name so it works on case-insensitive filesystems, where a casing-only rename is otherwise a silent no-op and the warning was unfixable by hand. `--dry-run` exits non-zero when anything would change, giving filename drift its first CI gate (`add-fix-filenames`).
- `prodshape init --dry-run` reports every path it would create, preserve, regenerate or overwrite without writing anything, and exits non-zero on conflicts. Initialization is now a plan that carries its own content, so the report and the applied result cannot diverge (`add-init-dry-run-and-doctor-checks`).
- `prodshape init --flat`, and a tracked placeholder in every scaffolded directory so the recommended per-kind layout survives a commit. The layout is documented for the first time, and pinned by a test to the directories promotion writes into (`scaffold-model-structure`).
- `doctor` reports model validation and the state of the authoring templates.

### Changed

- The `/ps:*` command shorthand is now **opt-in** via `integrations.shorthand-commands` (default `false`); `init --shorthand` sets it. The canonical `/product:*` commands are always generated. Provider installation now deletes managed files it no longer generates, guarded by digest, so opting out does not strand them — this also fixes a latent bug where renaming any canonical asset orphaned files silently (`make-shorthand-opt-in-and-document-lockfile`).
- Breaking for library consumers: `installProvider` and `updateIntegrations` take an options object instead of positional arguments, and `InstallResult` gains `removed`. CLI behaviour is unchanged apart from the new commands and flags.

### Fixed

- `docs/adoption/existing-repository.md` claimed `init` creates `.product/generated/` and `.product/cache/` (it does not — they appear when a command writes them), that it adds two lines to `.gitignore` (it does not, and will not: that file belongs to the adopter), and that `product.model` is relative to `product.root` (it is repository-relative, so the documented values would not have worked). The first two claims had been copied into the greenfield guide.
- `docs/specification/artifacts.md` forbade the metadata `provenance` records. Amended so the specification and the schemas agree: Git history remains the record of authorship, while provenance records the evidence behind a claim.
- The role of `.product/installation.lock.json` is documented — what it records, that it is committed, what verifies it, and what breaks without it.
- `prodshape fix --filenames --dry-run` wrote to disk and then reported that it had not: recovery of an interrupted rename ran before the dry-run check. Recovery is now a plan/apply pair, a dry run renames nothing, and the pending recovery still counts toward the non-zero exit.
- The frontmatter reference rendered `product-coverage.requirements` as an opaque object: the describer ignored `patternProperties`, so the entry contract was invisible in the document and in `prodshape schema`.
- The `product-definition` → `prodshape` rename is finished across the documentation and the generated AI assets (131 invocations). Both binaries still ship; the alias remains valid through v0.x.
- `docs/limitations-v0.1.md` is now `docs/limitations.md`, so a version-named file stops documenting a different version each release.
- Corrections found by auditing the release: `--ai` is comma-separated and was documented as repeatable; `coverage check` was shown without its required argument; two guides pointed at `templates/` and `schemas/` paths that do not exist in an adopting repository; two carried pre-release text claiming the CLI and the skills had not shipped; the architecture overview still said `.product/generated/` was gitignored by default; and ADR 0009 was attributed to Gate 0.
- `docs/specification/identifiers.md` claimed IDs are unique across all kinds, which the generated `HOF-` derivation contradicts; the derivation and the collision are now documented (`OD-009`).

## [0.1.0]

### Added

- Founding methodology, normative specification, architecture decision records, artifact schemas, templates and the self-hosted product model (`establish-product-definition-foundation`).
- The `product-definition` CLI with graph compilation, derived reverse relationships, deterministic validation with stable diagnostic codes, `inspect` and structural `impact` (`implement-product-graph-core`).
- Product Change overlay validation, delivery slices, handoff generation with content digests, staleness detection, coverage checking and explicit promotion (`implement-product-change-and-handoff`).
- Six canonical AI skills, seven `/product:*` commands, four hook descriptors, generated Claude Code and GitHub Copilot integrations with managed headers and lock-file drift detection, the OpenSpec adapter, `init`, `integration add`/`update` and `doctor` (`package-ai-and-sdd-integrations`).
- End-to-end self-application: Product Change `CHG-TRACEABILITY-001` delivered through slice `SLI-TRACEABILITY-001` and handoff `HOF-GITHUB-1` into a native OpenSpec change, implemented, covered by `product-coverage.yaml` evidence and explicitly promoted into the baseline (56 artifacts, zero diagnostics), with a conformance test pinning the full traceability chain.
- The reference implementation adopted the public brand ProductShape (the methodology name Product Definition as Code is unchanged): npm scope `@prodshape/*`, binary `prodshape` with `product-definition` kept as a temporary v0.x alias, and an optional `/ps:*` shorthand for the canonical `/product:*` commands (`CHG-BRAND-001` / `SLI-BRAND-001`).

### Fixed

- `change promote` now refuses without verifiable coverage evidence (FR-PROMOTE-001): evidence is discovered from the SDD workspace per completed slice, missing or unverifiable evidence is `PRODUCT044`, and repositories without an SDD adapter need an explicit `--accept-external-evidence` (`fix-v01-conformance`).
- The published CLI installs the `product-definition` alias its generated skills and hooks invoke, guarded by a packed-tarball test of both binaries.
- Coverage evidence is hardened: covered/partial entries require non-empty evidence arrays, evidence paths cannot escape the repository, and entries for requirements the handoff does not implement are rejected.
- `init`, `integration add` and `integration update` preflight every target and refuse to overwrite unmanaged or hand-edited files without `--force`.
- Promotion applies its plan in two phases (preflight, then execute with the change-directory move last), so a failed promotion no longer leaves a partially promoted baseline.
- `validation.warnings-as-errors` is enforced uniformly across baseline validate, change validate, handoff generation, graph generation and promotion.

[unreleased]: https://github.com/juangcarmona/productshape/compare/@prodshape/cli@0.15.0...HEAD
[0.15.0]: https://github.com/juangcarmona/productshape/compare/@prodshape/cli@0.14.0...@prodshape/cli@0.15.0
[0.14.0]: https://github.com/juangcarmona/productshape/compare/@prodshape/cli@0.13.0...@prodshape/cli@0.14.0
[0.13.0]: https://github.com/juangcarmona/productshape/compare/@prodshape/cli@0.12.0...@prodshape/cli@0.13.0
[0.12.0]: https://github.com/juangcarmona/productshape/compare/@prodshape/cli@0.11.0...@prodshape/cli@0.12.0
[0.11.0]: https://github.com/juangcarmona/productshape/compare/@prodshape/cli@0.9.0...@prodshape/cli@0.11.0
[0.9.0]: https://github.com/juangcarmona/productshape/releases/tag/@prodshape/cli@0.9.0
[0.8.1]: https://github.com/juangcarmona/productshape/releases/tag/@prodshape/cli@0.8.1
[0.8.0]: https://github.com/juangcarmona/productshape/releases/tag/@prodshape/cli@0.8.0
[0.7.0]: https://github.com/juangcarmona/productshape/releases/tag/@prodshape/cli@0.7.0
[0.6.0]: https://github.com/juangcarmona/productshape/releases/tag/@prodshape/cli@0.6.0
[0.5.0]: https://github.com/juangcarmona/productshape/releases/tag/@prodshape/cli@0.5.0
[0.4.0]: https://github.com/juangcarmona/productshape/releases/tag/@prodshape/cli@0.4.0
[0.3.0]: https://github.com/juangcarmona/productshape/releases/tag/@prodshape/cli@0.3.0
[0.2.0]: https://github.com/juangcarmona/productshape/releases/tag/@prodshape/cli@0.2.0
[0.1.0]: https://github.com/juangcarmona/productshape/releases/tag/v0.1.0
