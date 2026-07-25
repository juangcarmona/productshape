---
id: JRN-SDD-HANDOFF-001
type: journey
title: Deliver one product increment through an SDD workflow
status: active
primary-actor: ACT-PRODUCT-ENGINEER
steps:
  - use-case: UC-HANDOFF-001
  - use-case: UC-HANDOFF-STATUS-001
  - use-case: UC-COVERAGE-001
  - use-case: UC-PROMOTE-001
---

## Intended Outcome

One approved Delivery Slice is implemented and verified through the team's native SDD workflow,
and — once every slice of the Product Change is done — the change is explicitly promoted into the
product baseline, closing the loop from definition to delivered product.

## Entry Conditions

- A Product Change is approved and sliced, and at least one slice is approved for delivery.
- An SDD framework integration is configured for the repository.

## Journey Narrative

The Product Engineer generates a Product Handoff for an approved slice: a stable, framework-
independent package of exactly the product subgraph that increment needs, delivered into the
configured SDD framework alongside its native artifacts. From there the SDD workflow runs
natively — proposal, specs, design, tasks, implementation — which from Product Definition's
perspective is a waiting period. Before and during implementation, handoff status is checked so
the delivery team knows whether the packaged product knowledge is still current. As
implementation completes, coverage evidence is mapped back to the requirements each slice
implements and the coverage check verifies the mapping: every implemented requirement must carry
resolvable specification and verification evidence before the SDD change closes. When all slices
of the change are completed or explicitly cancelled, the Repository Maintainer promotes the
change: a deliberate, human-triggered act that applies the verified delta to the baseline.

## Variants and Branches

- Stale handoff: when referenced product knowledge changes mid-delivery, the handoff is reported
  stale and is regenerated before implementation continues.
- Uncovered requirements: requirements a slice claims to implement but that lack coverage
  evidence fail the coverage check and block SDD closure until covered or explicitly rescoped.
- Contradiction discovered downstream: when the SDD workflow uncovers a conflict with the
  product definition, it is reported back as a question on the Product Change rather than
  resolved silently in delivery artifacts.

## Completion Conditions

- The slice's implementation is verified and its requirement coverage evidence is recorded and
  checked.
- The Product Change is promoted: its delta is part of the baseline and the change is completed
  with its history preserved.
