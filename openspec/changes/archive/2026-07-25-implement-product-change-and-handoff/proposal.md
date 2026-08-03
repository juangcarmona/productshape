# Implement Product Change and Handoff

## Why

The deterministic core validates and compiles the baseline, but the methodology's centre — the Change operation — has no mechanics yet: no overlays, no slices, no handoffs, no staleness, no promotion. This change makes the whole Product Change lifecycle work end to end, which is what v0.1 must prove.

## What Changes

- Load Product Changes from `docs/product/changes/active/` (change.md, proposed artifacts, slices) and compile **overlays**: baseline + add/modify/remove, without touching baseline files.
- Validate overlays: operation errors PRODUCT020–026, cross-change overlap PRODUCT025, plus full baseline validation over the overlay graph; warning PRODUCT108 for approved changes with open questions.
- Validate delivery slices: reference resolution against the owning change's overlay, foreign change references (PRODUCT030), partial coverage without scope (PRODUCT031), dependency cycles (PRODUCT032).
- Generate Product Handoffs from approved slices: deterministic closure rule, artifact digests, source Git revision, work-item reference, generated `product-context.md`; refuse non-approved slices (PRODUCT040).
- Detect handoff staleness by per-artifact digests (`handoff status`: current, stale, invalid, source-revision-unavailable), with `git show` fallback for moved artifacts.
- Promote implemented changes: preconditions (status, slices resolved, revalidation, baseline revision compatibility PRODUCT027), `--dry-run` plan, apply to the model, move the change to `changes/completed/`, never implicit, no automatic commits.
- CLI: `validate --change <ID>`, `change validate <ID>`, `change promote <ID> [--dry-run]`, `handoff create`, `handoff status <path>`; `inspect` and `impact` report affecting changes, slices and handoffs.
- Conformance fixtures and end-to-end tests for the full lifecycle.

## Capabilities

### New Capabilities

- `product-changes`: Change loading, overlay compilation and validation, concurrency checks.
- `delivery-slices`: Slice loading and deterministic validation.
- `product-handoff`: Handoff and context generation with digests, revision and staleness.
- `promotion`: Explicit, dry-runnable promotion of implemented changes into the baseline.

### Modified Capabilities

- `impact-analysis`: Inspect and impact additionally report the active changes, slices and handoffs referencing an artifact.

## Impact

- `packages/core` grows changes/slices/handoff/promotion modules and a small Git helper (`git` invoked as a subprocess for revision and historical content).
- `packages/cli` gains the change and handoff command groups.
- The OpenSpec adapter package is NOT part of this change (`package-ai-and-sdd-integrations` owns it); `handoff create` writes sidecar files to a target directory.
