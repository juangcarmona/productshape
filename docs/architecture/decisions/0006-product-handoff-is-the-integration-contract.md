# 0006 — The Product Handoff is the integration contract

Status: Accepted
Date: 2026-07-25

## Context

ADR 0005 keeps Product Definition and SDD frameworks separate, so something must carry product
knowledge across the seam. Pointing an SDD framework at the whole product repository drowns it in
irrelevant context and gives no way to detect that the relevant knowledge changed mid-flight.
Copying prose by hand is unverifiable. The integration needs a precise, checkable payload.

## Decision

The integration contract is the **Product Handoff**: a versioned
(`product-definition-as-code/handoff/v1alpha1`), generated, framework-independent document defined
in the [handoff contract specification](../../specification/handoff-contract.md). It carries the
product subgraph selected for one delivery increment — the implemented requirements, the affected
artifacts, and their upstream context — together with per-artifact SHA-256 content digests, the
source Git revision, and the work-item reference.

The subgraph is computed by a deterministic **closure rule** (expand requirements via
`derived-from`/`applies-to`, use cases via their actor/context/rule/term edges, one incoming
journey hop, applicable constraints; stop). Two runs over the same content select the same set.

Staleness is judged per referenced artifact: a handoff is stale exactly when a referenced
artifact's recomputed digest no longer matches, never because of unrelated repository activity.

A handoff contains product context and traceability only — no technical design, tasks, class
names, database or framework decisions. Those belong to the SDD and implementation layers.

Because the contract is framework- and provider-independent, future adapters (for example a
Spec Kit adapter) consume the same document; nothing in it is OpenSpec-specific.

## Consequences

Positive:

- SDD work starts from a bounded, relevant, reproducible slice of product knowledge instead of a
  repository dump or hand-copied prose.
- Per-artifact digests make "the product definition changed under this work" a mechanical check
  (`handoff status`), not a discovery during review.
- One contract serves every SDD framework; adding an adapter never changes the payload format.
- The explicit schema version allows the contract to evolve without silently breaking consumers.

Negative:

- Handoffs go stale by design. Any edit to a referenced artifact invalidates the digest, and the
  handoff must be regenerated — recurring friction that a "just read the repo" approach would not
  have (it would have silent drift instead).
- The closure rule is deliberately generous and can include somewhat more context than a human
  would hand-pick for a given task; consumers may read artifacts that turn out to be peripheral.
- Generated context documents duplicate canonical content at a point in time, which readers can
  mistake for a source of truth despite the generated marker.
