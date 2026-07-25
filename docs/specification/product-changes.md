# Product Changes

A requested product modification does not directly become a backlog item and MUST NOT silently
modify the current model. It becomes a **Product Change**: an explicit, validated delta against the
baseline.

## The initial-baseline bootstrap exception

An initial product baseline MAY be established directly during product initialization or the first
Define operation, without a Product Change. Once that baseline has been accepted, every subsequent
semantic evolution of the product MUST be represented through a Product Change.

## Structure

A Product Change lives in its own directory:

```text
docs/product/changes/active/<chg-id>/
├── change.md          # canonical change definition
├── proposed/          # complete proposed future-state artifacts
│   └── <same layout as docs/product/model>
└── slices/            # delivery slices (see delivery-slices.md)
    └── sli-*.yaml
```

`change.md` frontmatter contract (schema `product-change`):

```yaml
---
id: CHG-HANDOFF-001
type: product-change
title: Introduce framework-independent Product Handoffs
status: proposed
base-revision: <git-commit-sha> # the baseline this change was created against
operations:
  add: [UC-HANDOFF-001, FR-HANDOFF-001]
  modify: [JRN-ADOPT-001]
  remove: []
---
```

Required body sections: `## Problem`, `## Intended Product Outcome`, `## Rationale`,
`## Affected Product Areas`, `## Open Questions`, `## Product Acceptance`, `## Out of Scope`.

## Operations

- Every ID in `operations.add` MUST NOT exist in the baseline, and MUST have a complete proposed
  future-state artifact under `proposed/`.
- Every ID in `operations.modify` MUST exist in the baseline, and MUST have a complete proposed
  future-state artifact under `proposed/` using the same ID.
- Every ID in `operations.remove` MUST exist in the baseline. Removed artifacts need no tombstone
  files.
- Every artifact under `proposed/` MUST be listed in `operations.add` or `operations.modify`.

## Lifecycle

`productChangeStatus`: `draft` → `proposed` → `approved` → `in-progress` → `implemented`,
with `rejected` (from `draft` or `proposed`) and `superseded` (from any non-terminal state) as
terminal alternatives. Rejected changes move to `changes/rejected/`; promoted changes move to
`changes/completed/`.

A change moved to `approved` while its `## Open Questions` section still contains unresolved
questions SHOULD produce a warning (`PRODUCT108`).

## Overlay validation

Validating a Product Change MUST compile an **overlay**: the baseline graph with additions added,
modifications replaced and removals deleted — without modifying any baseline file — and then apply
full structural validation to the overlay. Overlay-specific errors are enumerated in
[Validation](validation.md).

While a Product Change is active, the baseline artifacts it touches remain authoritative and
unchanged. Concurrent active Product Changes MUST be checked for overlapping `modify`/`remove`
sets; an overlap is an error until one change is rebased or withdrawn.

## Promotion

Promotion is the only operation that applies a Product Change to the baseline. Promotion:

1. MUST require change status `implemented`.
2. MUST require every `approved` slice of the change to be `completed` or explicitly `cancelled`.
3. MUST require traceability evidence for the requirements implemented by the change's completed
   slices (see [Handoff Contract](handoff-contract.md) and the adapter's coverage mapping).
   With an SDD provider configured, evidence is discovered deterministically from the SDD
   workspace: a completed slice is evidenced when at least one handoff referencing it passes the
   coverage check without errors, and the union of covered requirements must contain every
   requirement implemented by completed slices. A completed slice without verifiable evidence
   fails promotion with `PRODUCT044`. Cancelled slices are exempt. Without an SDD provider,
   promotion refuses with `PRODUCT044` unless `--accept-external-evidence` is passed, which
   records a `PRODUCT044` warning in the plan output; the flag has no effect when a provider is
   configured.
4. MUST revalidate the overlay.
5. MUST check baseline-revision compatibility: if any artifact named in the change's operations
   changed in the baseline since `base-revision`, promotion MUST fail until the change is
   explicitly rebased (its proposed artifacts reviewed against the new baseline and
   `base-revision` updated).
6. Applies additions, modifications and removals to `docs/product/model`, naming files by
   lowercase ID.
7. Moves the change directory to `docs/product/changes/completed/<chg-id>/`, preserving its
   history.
8. MUST support `--dry-run`, reporting every action without performing any.
   Before mutating anything, promotion MUST preflight every planned action (readable sources,
   existing delete targets, absent archive destination); a preflight failure leaves the working
   tree untouched, and execution orders the change-directory move last so the archived change
   appears only when every other action succeeded.
9. MUST NOT be executed implicitly — not by an AI hook, not by SDD archival, not by any automatic
   trigger. Promotion MUST NOT create Git commits; committing is the user's decision.
