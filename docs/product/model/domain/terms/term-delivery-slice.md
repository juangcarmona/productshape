---
id: TERM-DELIVERY-SLICE
type: domain-term
title: Delivery Slice
status: active
defined-in: BC-DELIVERY-INTEGRATION
synonyms: []
---

## Definition

A coherent, implementable, verifiable product increment carved out of an approved Product Change.
A slice declares exactly which requirements it implements, which product artifacts it affects and
which other slices it depends on, so that requirement coverage across a change is explicit and
checkable rather than implied by backlog wording.

## Distinguish From

- **A user story.** A story is a delivery-tool artifact written for planning conversations. A
  slice is a product increment of exactly one Product Change, defined by coverage declarations —
  which requirements it implements and verifies — not by narrative format. A slice may be
  referenced by a backlog item, but the slice carries the semantics.
- **A technical task.** Tasks decompose implementation work and belong to the SDD framework or
  the team. A slice never lists tasks; it states what portion of the change's obligations it
  delivers.
- **A requirement.** Requirements state what the product must do; a slice groups requirements
  into one increment of delivery. One requirement may be covered by one slice and depended on by
  several others.

## Usage

Delivery Slices are authored as YAML under the product root, follow their own lifecycle distinct
from artifacts and changes, and are the unit from which Product Handoffs are generated. Coverage
tooling reports which requirements of an approved change are covered by slices and which remain
unassigned.
