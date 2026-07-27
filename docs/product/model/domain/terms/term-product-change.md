---
id: TERM-PRODUCT-CHANGE
type: domain-term
title: Product Change
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms: []
---

## Definition

An explicit, versioned delta against the current product model: a set of add, modify and remove
operations, each carried by a complete proposed future-state artifact, together with rationale and
open questions. A Product Change is validated as an overlay — the baseline plus the change's
operations — and alters the baseline only when it is explicitly promoted.

## Distinguish From

- **A backlog item.** A backlog item is a delivery increment reference in an external tracking
  tool. A Product Change describes what the product definition will mean afterwards; delivery
  slices and backlog references organise how that meaning gets implemented.
- **An SDD change.** An SDD framework's change (for example an OpenSpec change) scopes one
  implementation increment and is owned by that framework. A Product Change scopes an evolution
  of canonical product knowledge and is owned by the product side.
- **A Git commit.** A commit records that files changed; a Product Change states, in reviewable
  product language, what the definition should become and why. Many commits may touch one Product
  Change, and promotion is itself just another commit.

## Usage

Product Changes live under the changes area of the product root, move through their own lifecycle
distinct from the artifact lifecycle, and are the unit that `prodshape validate` checks
as an overlay. Approved changes are carved into Delivery Slices, and promotion moves a completed
change into the completed area while applying its operations to the baseline.
