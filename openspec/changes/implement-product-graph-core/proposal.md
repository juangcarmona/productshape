# Implement Product Graph Core

## Why

The foundation change established the contracts: schemas, the normative specification and the
self-hosted model. Nothing yet compiles the product graph or enforces the reference-level
invariants (unknown IDs, duplicates, disallowed targets, lifecycle violations), and there is no
CLI. This change delivers the deterministic core the whole methodology stands on.

## What Changes

- Extend `packages/core` with artifact discovery, model loading, reference resolution and the
  full baseline validation defined in `docs/specification/validation.md` (errors PRODUCT005–008,
  warnings PRODUCT101–107, configuration diagnostics PRODUCT050).
- Compile the product graph: typed edges in canonical direction, derived incoming indexes,
  deterministic ordering, content digests.
- Generate derived outputs under `.product/generated/`: `product-graph.json` (versioned schema),
  `product-index.json`, `traceability.json`, `product-graph.mmd`, `diagnostics.json`.
- Implement inspect (metadata, outgoing and derived incoming relationships) and structural impact
  analysis (direct vs transitive, direction, depth).
- Create `packages/cli` with the `product-definition` binary: `validate`, `graph`, `inspect`,
  `impact`, exit codes 0/1/2/3, `--format json`, configuration loading from `.product/config.yaml`.
- Add reference-level conformance fixtures (duplicate ID, missing target, disallowed target type,
  active-to-retired reference) and validate this repository's own model in the test suite.

## Capabilities

### New Capabilities

- `structural-validation`: Deterministic baseline validation with stable diagnostics and
  documented exit codes.
- `product-graph`: Graph compilation with derived reverse relationships and versioned generated
  outputs.
- `impact-analysis`: Deterministic structural impact traversal (direct/transitive,
  incoming/outgoing, depth-bounded).
- `cli`: The `product-definition` command-line interface exposing validate, graph, inspect and
  impact.

### Modified Capabilities

- `artifact-parsing`: Extends from single-document parsing to repository-wide discovery and model
  loading (same parsing contract; adds discovery requirements).

## Impact

- `packages/core` grows discovery/graph/validation/impact modules; new dependency `fast-glob`
  (pre-approved).
- New package `packages/cli` with dependency `commander` (pre-approved).
- `.product/generated/` starts being produced (gitignored by default).
- Change overlays, slices, handoffs and promotion remain out of scope — they are
  `implement-product-change-and-handoff`.
