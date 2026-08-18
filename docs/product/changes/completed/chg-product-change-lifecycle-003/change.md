---
id: CHG-PRODUCT-CHANGE-LIFECYCLE-003
type: product-change
title: Clarify that merge accepts the resulting baseline
status: applied
base-revision: 54a41e9c19d78aed14f421e5fb7865fbad803872
operations:
  add: []
  modify:
    - UC-CHANGE-001
    - UC-SNAPSHOT-001
  remove: []
---

## Problem

Final semantic review found two shorthand phrases that could be read as acceptance attaching to the Product Change rather than to the resulting baseline.

## Intended Product Outcome

Every current use case states unambiguously that the human merge accepts the applied result as the new baseline. Product Change status remains `applied` and carries no acceptance or delivery state.

## Rationale

The lifecycle distinction is the purpose of issue #93, so even locally understandable shorthand should not weaken it in canonical product text.

## Affected Product Areas

Product Change acceptance and Product Snapshot timing.

## Open Questions

None.

## Product Acceptance

Accept when the overlay validates cleanly and neither use case describes the Product Change itself as the object accepted by merge.

## Out of Scope

Any behaviour beyond the wording correction.
