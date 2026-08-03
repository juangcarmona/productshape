---
id: CHG-SNAPSHOT-003
type: product-change
title: Replace the two map projections with one focus-and-context canvas
status: superseded
base-revision: '4d253d70803a11ced20458d2924a81e4e1a29220'
operations:
  add:
    - TERM-PRODUCT-LANDSCAPE
    - FR-SNAPSHOT-007
  modify:
    - JRN-SNAPSHOT-001
    - UC-SNAPSHOT-EXPLORE-001
    - FR-SNAPSHOT-002
    - FR-SNAPSHOT-003
    - FR-SNAPSHOT-005
    - FR-SNAPSHOT-006
    - TERM-GRAPH-PROJECTION
    - QR-PRESENTATION-001
    - QR-SCALABILITY-001
  remove: []
---

<!--
Minimal record of a superseded change. The proposed artifacts and slice definitions were removed
from the working tree when the direction was rejected; Git history preserves them in full. Nothing
listed in the operations above was ever promoted.
-->

## Problem

This change proposed the Product Landscape: one persistent focus-and-context canvas placing every artifact in four fixed kind-owned bands, replacing the layered map and the focused neighbourhood.

## Intended Product Outcome

Superseded before completion. The proposed outcome was withdrawn with the change and is preserved only in history.

## Rationale

**Why it was rejected.** The first slice was implemented faithfully and met every acceptance condition, and the product owner rejected the direction after first use: fixed placement and a complete artifact inventory describe what the product contains, while bands are deliberately blind to relationships — so the arrangement a reader studies carries no topological meaning. The failure was the premise, not the build.

## Affected Product Areas

None. Nothing this change proposed entered the baseline, and its delivered implementation was removed from the current product; `TERM-PRODUCT-LANDSCAPE` and `FR-SNAPSHOT-007` must never be promoted, and the identifier `FR-SNAPSHOT-007` stays unused so it never names two things.

## Open Questions

None. The change is closed.

## Product Acceptance

Not applicable: superseded. Slice state at closure — `SLI-SNAPSHOT-007` completed (its implementation and SDD workflow genuinely finished before the rejection; the implementation was subsequently removed from the current product), `SLI-SNAPSHOT-008`, `SLI-SNAPSHOT-009` and `SLI-SNAPSHOT-010` cancelled.

## Out of Scope

Everything. The successor is `CHG-SNAPSHOT-004`, which starts from the promoted baseline and inherits the finding, not the design.

**Evidence, preserved by history rather than by the working tree:**

- Issue [#38](https://github.com/juangcarmona/productshape/issues/38) — SLI-SNAPSHOT-007, and issue [#41](https://github.com/juangcarmona/productshape/issues/41) — SLI-SNAPSHOT-008, closed unstarted.
- PR [#39](https://github.com/juangcarmona/productshape/pull/39) / commit `12f28c4` — the delivered implementation; PR [#40](https://github.com/juangcarmona/productshape/pull/40) / commit `a953fa6` — its SDD archive; PR [#43](https://github.com/juangcarmona/productshape/pull/43) / commit `e00f67e` — the supersession.
- The removal of the rejected implementation from the current product is the `revert(snapshot)` commit on the `CHG-SNAPSHOT-004` branch that follows this record's history.
