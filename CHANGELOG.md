# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

v0.1.0 release candidate. Not published to npm — the CLI is built from the repository; see
OPEN-DECISIONS OD-005. 133 tests pass and CI runs on Linux, Windows and macOS.

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
