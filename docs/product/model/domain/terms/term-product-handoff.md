---
id: TERM-PRODUCT-HANDOFF
type: domain-term
title: Product Handoff
status: active
defined-in: BC-DELIVERY-INTEGRATION
synonyms: []
---

## Definition

A generated, framework-independent contract that packages the product subgraph relevant to one
delivery increment for consumption by an SDD framework. A handoff carries the referenced artifact
list, a content digest per artifact, the source revision it was generated from and a work-item
reference, so a consumer can verify exactly which product knowledge it was given and detect when
that knowledge has since moved on.

## Distinguish From

- **Product Context.** The readable companion document generated alongside a handoff for humans.
  The handoff is the machine contract with digests and references; the context is its prose
  rendering and is non-canonical.
- **An SDD proposal or spec.** Those are owned natively by the SDD framework and describe how an
  increment will be implemented. The handoff is produced by the product side and only supplies
  the product knowledge the increment rests on.
- **A backlog item.** A backlog item is a tracking reference in a delivery tool. A handoff points
  at one via its work-item reference but is itself the versioned knowledge package, not the
  tracking record.

## Usage

Handoffs are generated from Delivery Slices, versioned, and consumed read-only by SDD adapters
such as the OpenSpec integration. Staleness is judged per referenced artifact by comparing the
handoff's digests against current canonical content, and a stale handoff is regenerated, never
hand-edited.
