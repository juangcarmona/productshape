---
id: CHG-PUBLIC-EXAMPLE
type: product-change
title: 'Show a generated example Product Snapshot on the public site'
status: applied
base-revision: 'bcae539e5fce7f5d6fe1a6badc5ce118bfaa8958'
operations:
  add: []
  modify:
    - FR-PUBLIC-SITE
  remove: []
---

## Problem

The public site explains what ProductShape produces but never shows it. The only generated Product Snapshot is ProductShape's own model on the engineering portal, which is large, describes the tool itself, and is deliberately kept out of the public site. A reader who wants to see what a product model looks like when explored has nothing on the public site to open.

## Intended Product Outcome

`FR-PUBLIC-SITE` requires the public site to serve a generated Product Snapshot of a small example product. The Snapshot is generated from the example's authored model on every public-site build, works without network access, names the source revision it came from, and is never presented as ProductShape's own model or as a canonical source. The public build still needs nothing from ProductShape's own product model.

## Rationale

A real, explorable example shows the outcome of the method more directly than any description of it. The example is the small shop model used in the refund-window talk demo, so the rule a reader sees in that demo (`BR-REFUND-001`) is the same rule they can find in the Snapshot.

## Affected Product Areas

The public site (`UC-PUBLIC-SITE`, `FR-PUBLIC-SITE`). The engineering portal and the Product Snapshot itself are unchanged.

## Open Questions

None.

## Product Acceptance

A reviewer reads the proposed `FR-PUBLIC-SITE` against the baseline and confirms that the added requirement and its two verification scenarios describe an example Snapshot generated at build time, separate from ProductShape's own model, and that `prodshape change validate CHG-PUBLIC-EXAMPLE` reports zero errors.

## Out of Scope

How the Snapshot looks or behaves (the Snapshot requirements own that). Publishing ProductShape's own Product Snapshot on the public site. Which example is chosen, beyond being small and authored in this repository. Delivery and technical design of the build step.
