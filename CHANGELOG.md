# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

v0.1.0 release candidate. The `@prodshape/*` packages are published to npm (the CLI is at
`0.1.0-alpha.1` pending the first stable release). 156 tests pass and CI runs on Linux, Windows
and macOS.

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
- End-to-end dogfooding: Product Change `CHG-TRACEABILITY-001` delivered through slice
  `SLI-TRACEABILITY-001` and handoff `HOF-GITHUB-1` into a native OpenSpec change, implemented,
  covered by `product-coverage.yaml` evidence and explicitly promoted into the baseline
  (56 artifacts, zero diagnostics), with a conformance test pinning the full traceability chain.
- The reference implementation adopted the public brand ProductShape (the methodology name Product
  Definition as Code is unchanged): npm scope `@prodshape/*`, binary `prodshape` with
  `product-definition` kept as a temporary v0.x alias, and an optional `/ps:*` shorthand for the
  canonical `/product:*` commands (`CHG-BRAND-001` / `SLI-BRAND-001`).
