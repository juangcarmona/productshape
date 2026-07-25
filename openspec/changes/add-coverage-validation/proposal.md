# Add Coverage Validation

## Why

The Product Handoff HOF-GITHub-1 (see `product-handoff.yaml` and `product-context.md` in this
change) delivers slice SLI-TRACEABILITY-001 of Product Change CHG-TRACEABILITY-001: before an SDD
change is closed, every requirement its handoff implements must have resolvable coverage evidence.
The product model defines the obligation (FR-COVERAGE-001) and the interaction (UC-COVERAGE-001);
this change implements it.

## What Changes

- Implement the deterministic coverage check exposed as `product-definition coverage check
<sdd-change>`: reads the sidecar handoff, validates `product-coverage.yaml`, reports uncovered
  implemented requirements (PRODUCT043) and dangling evidence paths, and exits non-zero on gaps.
- Map this change's own coverage evidence in `product-coverage.yaml`.

## Capabilities

### New Capabilities

- `requirement-coverage`: The coverage-check behaviour delivered by SLI-TRACEABILITY-001.

### Modified Capabilities

_None._

## Impact

- Implementation lives in `packages/adapter-openspec` and the CLI's `coverage` command group.
- Product traceability: implements FR-COVERAGE-001 (see the sidecar handoff for the full product
  context and digests).
