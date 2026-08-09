---
id: CHG-SNAPSHOT-WORDING-001
type: product-change
title: Reword the Snapshot artifacts to drop a banned jargon term
status: applied
base-revision: '08cd643'
operations:
  add: []
  modify:
    - JRN-SNAPSHOT-001
    - UC-SNAPSHOT-EXPLORE-001
    - FR-SNAPSHOT-003
    - FR-SNAPSHOT-005
    - FR-SNAPSHOT-008
    - QR-SCALABILITY-001
  remove: []
---

Schema reference: docs/specification/frontmatter-reference.md#product-change

## Problem

Six live artifacts describing the Product Snapshot and the Product Explorer use a jargon term (the Latin word for a whole body of material) to mean either the whole set of artifacts or the scale at which the Explorer must stay usable. The project has banned that term everywhere (see the spec's `DECISIONS.md` section 2): it is opaque to readers, and in this product it is ambiguous, having been used both for the conformance tests and for the whole set of artifacts. The canonical model is now the only place the banned term still survives.

## Intended Product Outcome

The same six artifacts read in plain language. Where the term meant the whole set of artifacts, they say "the whole product model" or "all the artifacts at once". Where it named the scale the Snapshot must stay usable at, they say "the reference model scale" or "at model scale". Every requirement, verification scenario and acceptance test says exactly what it said before; only the wording changes.

## Rationale

The product's own thesis is that the words in the model must be unambiguous. Carrying a banned, double-meaning term in the canonical model contradicts that in the most visible place a reader looks. Making the fix a Product Change, rather than a direct edit of the baseline, honours the rule that the model moves only through an approved, validated change - the same rule these very artifacts describe.

## Affected Product Areas

The Product Snapshot and the Product Explorer: the journey to understand the product without the repository (`JRN-SNAPSHOT-001`), the use case for exploring a snapshot (`UC-SNAPSHOT-EXPLORE-001`), the requirements for orientation (`FR-SNAPSHOT-003`), progressive relationship disclosure (`FR-SNAPSHOT-005`) and catalog discovery (`FR-SNAPSHOT-008`), and the scalability quality requirement that defines the reference scale (`QR-SCALABILITY-001`).

## Open Questions

None.

## Product Acceptance

A reviewer reads the six proposed artifacts against their baseline and confirms that each requirement, scenario and acceptance test is unchanged in meaning, with the banned term replaced by the agreed plain-language wording, and that `prodshape change validate CHG-SNAPSHOT-WORDING-001` reports zero errors.

## Out of Scope

Delivery, technical design and implementation. The archived change records under `changes/completed/` that mention the term are historical records, handled separately as record maintenance rather than as a baseline change. Retiring em dashes or any other wording debt in these artifacts. Any change to what the Snapshot or the Explorer does.
