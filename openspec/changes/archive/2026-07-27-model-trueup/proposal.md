# Make the Model Describe What Ships

## Why

The Product Handoff `HOF-GITHUB-15` (see `product-handoff.yaml` and `product-context.md` in this
change) delivers slice `SLI-TRUEUP-001` of Product Change `CHG-MODEL-TRUEUP-001`.

An audit of the merged v0.2.0 release compared the baseline against the shipped toolkit and found
the model wrong in three places and silent in a fourth. The one that matters is not a documentation
gap: `integration update` removes managed files a provider no longer generates — the only place the
toolkit deletes user-visible files — and no requirement authorised it. The repository's entire claim
is that the model is canonical; that survives an incomplete model, not one that is wrong about what
the product does to a user's files.

## What Changes

This change is corrective. No behaviour changes; the model catches up with behaviour that already
ships.

- `FR-DISTRIBUTION-001` gains the removal obligation and its digest-verified safety rule, and its
  reproducibility clause is restated over configuration as well as assets and target — it had become
  literally false once shorthand rendering became a setting.
- `FR-DOCTOR-001` is added. Repository health had eight checks and no requirement, carried by one
  clause of a requirement about asset generation.
- `UC-INIT-001` stops claiming initialization creates places for slices and handoffs; it creates
  neither. It gains the report-without-writing alternative flow.
- `FR-INIT-001` gains the report-without-writing obligation, which its sibling `FR-FIX-001` already
  had for the identical capability.

## Capabilities

### Modified Capabilities

- `self-hosted-product-model`: the baseline is corrected against the shipped toolkit.

## Impact

- `docs/product/model/` only. No package source changes.
- The baseline moves from 63 to 64 artifacts, updating the counts pinned in
  `tests/conformance/self-model.test.ts`, `packages/cli/src/program.test.ts`,
  `tests/conformance/baseline-validation.test.ts`, `README.md` and the model index.
