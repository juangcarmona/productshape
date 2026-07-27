# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The first round of improvements from adoption outside this repository, plus the audit pass that
followed merging them. 226 tests pass and CI runs on Linux, Windows and macOS across Node 22 and 24.

### Added

- Artifacts accept an optional `provenance` object recording the evidence behind recovered
  knowledge (`source` and `confidence` required, `recovered-from` optional). A `draft` artifact
  resting on `confidence: low` reports the new warning `PRODUCT111`, so the queue of candidates
  needing human validation is derivable from validation output. Previously the methodology required
  provenance that the schemas had nowhere to put, and `recover-product` worked around it by writing
  provenance into body prose (`add-provenance-field`).
- [Frontmatter reference](docs/specification/frontmatter-reference.md): the allowed properties of
  all 13 document kinds, with permitted values and identifier patterns, generated from the canonical
  schemas and drift-tested against them (ADR 0009). `prodshape schema <kind>` prints the same
  contract, and needs no repository — the moment it is wanted is before `init`
  (`document-frontmatter-schema`).
- `prodshape fix --filenames` resolves `PRODUCT101` by renaming artifact files to match their ID
  casing. It renames through an intermediate name so it works on case-insensitive filesystems, where
  a casing-only rename is otherwise a silent no-op and the warning was unfixable by hand.
  `--dry-run` exits non-zero when anything would change, giving filename drift its first CI gate
  (`add-fix-filenames`).
- `prodshape init --dry-run` reports every path it would create, preserve, regenerate or overwrite
  without writing anything, and exits non-zero on conflicts. Initialization is now a plan that
  carries its own content, so the report and the applied result cannot diverge
  (`add-init-dry-run-and-doctor-checks`).
- `prodshape init --flat`, and a tracked placeholder in every scaffolded directory so the
  recommended per-kind layout survives a commit. The layout is documented for the first time, and
  pinned by a test to the directories promotion writes into (`scaffold-model-structure`).
- `doctor` reports model validation and the state of the authoring templates.

### Changed

- The `/ps:*` command shorthand is now **opt-in** via `integrations.shorthand-commands` (default
  `false`); `init --shorthand` sets it. The canonical `/product:*` commands are always generated.
  Provider installation now deletes managed files it no longer generates, guarded by digest, so
  opting out does not strand them — this also fixes a latent bug where renaming any canonical asset
  orphaned files silently (`make-shorthand-opt-in-and-document-lockfile`).
- Breaking for library consumers: `installProvider` and `updateIntegrations` take an options object
  instead of positional arguments, and `InstallResult` gains `removed`. CLI behaviour is unchanged
  apart from the new commands and flags.

### Fixed

- `docs/adoption/existing-repository.md` claimed `init` creates `.product/generated/` and
  `.product/cache/` (it does not — they appear when a command writes them), that it adds two lines
  to `.gitignore` (it does not, and will not: that file belongs to the adopter), and that
  `product.model` is relative to `product.root` (it is repository-relative, so the documented values
  would not have worked). The first two claims had been copied into the greenfield guide.
- `docs/specification/artifacts.md` forbade the metadata `provenance` records. Amended so the
  specification and the schemas agree: Git history remains the record of authorship, while
  provenance records the evidence behind a claim.
- The role of `.product/installation.lock.json` is documented — what it records, that it is
  committed, what verifies it, and what breaks without it.
- `prodshape fix --filenames --dry-run` wrote to disk and then reported that it had not: recovery of
  an interrupted rename ran before the dry-run check. Recovery is now a plan/apply pair, a dry run
  renames nothing, and the pending recovery still counts toward the non-zero exit.
- The frontmatter reference rendered `product-coverage.requirements` as an opaque object: the
  describer ignored `patternProperties`, so the entry contract was invisible in the document and in
  `prodshape schema`.
- The `product-definition` → `prodshape` rename is finished across the documentation and the
  generated AI assets (131 invocations). Both binaries still ship; the alias remains valid through
  v0.x.
- `docs/limitations-v0.1.md` is now `docs/limitations.md`, so a version-named file stops documenting
  a different version each release.
- Corrections found by auditing the release: `--ai` is comma-separated and was documented as
  repeatable; `coverage check` was shown without its required argument; two guides pointed at
  `templates/` and `schemas/` paths that do not exist in an adopting repository; two carried
  pre-release text claiming the CLI and the skills had not shipped; the architecture overview still
  said `.product/generated/` was gitignored by default; and ADR 0009 was attributed to Gate 0.
- `docs/specification/identifiers.md` claimed IDs are unique across all kinds, which the generated
  `HOF-` derivation contradicts; the derivation and the collision are now documented (`OD-009`).

## [0.1.0]

### Added

- Founding methodology, normative specification, architecture decision records,
  artifact schemas, templates and the self-hosted product model
  (`establish-product-definition-foundation`).
- The `product-definition` CLI with graph compilation, derived reverse relationships,
  deterministic validation with stable diagnostic codes, `inspect` and structural `impact`
  (`implement-product-graph-core`).
- Product Change overlay validation, delivery slices, handoff generation with content digests,
  staleness detection, coverage checking and explicit promotion
  (`implement-product-change-and-handoff`).
- Six canonical AI skills, seven `/product:*` commands, four hook descriptors, generated
  Claude Code and GitHub Copilot integrations with managed headers and lock-file drift detection,
  the OpenSpec adapter, `init`, `integration add`/`update` and `doctor`
  (`package-ai-and-sdd-integrations`).
- End-to-end self-application: Product Change `CHG-TRACEABILITY-001` delivered through slice
  `SLI-TRACEABILITY-001` and handoff `HOF-GITHUB-1` into a native OpenSpec change, implemented,
  covered by `product-coverage.yaml` evidence and explicitly promoted into the baseline
  (56 artifacts, zero diagnostics), with a conformance test pinning the full traceability chain.
- The reference implementation adopted the public brand ProductShape (the methodology name Product
  Definition as Code is unchanged): npm scope `@prodshape/*`, binary `prodshape` with
  `product-definition` kept as a temporary v0.x alias, and an optional `/ps:*` shorthand for the
  canonical `/product:*` commands (`CHG-BRAND-001` / `SLI-BRAND-001`).

### Fixed

- `change promote` now refuses without verifiable coverage evidence (FR-PROMOTE-001): evidence is
  discovered from the SDD workspace per completed slice, missing or unverifiable evidence is
  `PRODUCT044`, and repositories without an SDD adapter need an explicit
  `--accept-external-evidence` (`fix-v01-conformance`).
- The published CLI installs the `product-definition` alias its generated skills and hooks
  invoke, guarded by a packed-tarball test of both binaries.
- Coverage evidence is hardened: covered/partial entries require non-empty evidence arrays,
  evidence paths cannot escape the repository, and entries for requirements the handoff does not
  implement are rejected.
- `init`, `integration add` and `integration update` preflight every target and refuse to
  overwrite unmanaged or hand-edited files without `--force`.
- Promotion applies its plan in two phases (preflight, then execute with the change-directory
  move last), so a failed promotion no longer leaves a partially promoted baseline.
- `validation.warnings-as-errors` is enforced uniformly across baseline validate, change
  validate, handoff generation, graph generation and promotion.

[unreleased]: https://github.com/juangcarmona/productshape/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/juangcarmona/productshape/releases/tag/v0.1.0
