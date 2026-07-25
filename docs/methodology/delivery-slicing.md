# Delivery slicing

An approved Product Change is usually too large to implement and verify as one unit. Slicing
divides it into **Delivery Slices**: coherent, implementable, verifiable product increments, each
of which becomes one backlog item and one handoff. The normative contract is
[Delivery Slices](../specification/delivery-slices.md).

## What a good slice is

A good slice preserves a **vertical product outcome through the stack**. When it is done,
something an actor cares about works end to end — observable, demonstrable, verifiable in product
terms. The slice's `outcome` field states that in one sentence:

```yaml
outcome: A product engineer can generate a stable SDD input for one delivery increment.
```

If the outcome can only be phrased in system terms ("the persistence layer supports handoffs"),
it is not a slice yet.

## What a slice is not

- **Not a technical layer.** "Database schema", "API layer", "frontend" — slicing by layer is
  exactly what slices exist to avoid. A layer completes no product behaviour; three layer-slices
  produce nothing verifiable until all three land.
- **Not an endpoint.** An endpoint is a surface, not an outcome.
- **Not a screen.** A screen may participate in many outcomes and complete none of them.
- **Not one requirement by default.** A slice may implement several requirements, or cover part
  of a large one. The unit is the coherent increment; requirements are what it declares coverage
  against, not what it is.

## Coverage declarations

Each slice states exactly which requirements it implements, and how completely:

```yaml
implements:
  - requirement: FR-HANDOFF-001
    coverage: full
  - requirement: QR-DETERMINISM-001
    coverage: partial
    scope: Digest computation only; ordering guarantees are covered by SLI-HANDOFF-002.
```

`full` means the requirement is done when the slice is done. `partial` requires a precise `scope`
saying which part — vagueness here is a validation error, because promotion later depends on
knowing what was actually covered. Honest partial coverage beats optimistic full coverage every
time.

## Dependencies

`depends-on` lists other slices of the same change that must complete first. Dependencies are for
genuine product-level sequencing — one increment builds on another's outcome — not for encoding a
technical build order. The tooling rejects dependency cycles.

## Verification and out-of-scope

Two declarations keep a slice honest:

- `verification` (required, non-empty) — how the increment is confirmed, in product terms: what
  can be observed or exercised when it works. This travels into the handoff's context and anchors
  the SDD workflow's own verification.
- `out-of-scope` — explicit exclusions, so nobody infers a promise the slice never made. "Not
  creating GitHub issues through the API" written down is worth ten assumptions corrected later.

## Who slices

AI may propose a decomposition — it is well suited to reading a change's overlay and suggesting
cut lines. Deterministic tooling validates the mechanics: every referenced requirement exists in
the change's overlay, partial coverage has a scope, dependencies do not cycle. But whether a
slice is a _good_ increment — coherent, valuable, honestly scoped — is a judgment no tool makes.
A human approves every slice; `approved` status is a human decision, and only approved slices can
become [handoffs](sdd-handoff.md).
