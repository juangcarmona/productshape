---
id: UC-HANDOFF-001
type: use-case
title: Generate a Product Handoff for a delivery slice
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-DELIVERY-INTEGRATION
governed-by:
  - BR-SDD-001
uses-terms:
  - TERM-PRODUCT-HANDOFF
  - TERM-PRODUCT-CONTEXT
  - TERM-DELIVERY-SLICE
---

## Goal

An approved Delivery Slice becomes a stable, framework-independent package of exactly the
product subgraph that increment needs — delivered into the configured SDD framework so the
delivery workflow starts from precise product context instead of rediscovering it.

## Trigger

The Product Engineer runs handoff generation for an approved slice, with the AI Assistant
preparing the readable product context that accompanies the packaged artifacts.

## Preconditions

- The slice is approved.
- The overlay of the Product Change the slice belongs to validates cleanly.
- An SDD framework integration is configured.

## Main Flow

1. The engineer requests a handoff for the approved slice.
2. The product subgraph the slice needs is selected: the requirements it implements, the
   artifacts it affects, and the connected knowledge — rules, terms, actors — that gives them
   meaning.
3. The selection is packaged in a framework-independent form, referencing every artifact by its
   stable ID.
4. Content digests and the source revision of the product model are recorded in the handoff, so
   its currency can be checked later.
5. A readable product context document is prepared, presenting the packaged knowledge in the
   order a delivery reader needs it.
6. The handoff is delivered into the configured SDD framework as sidecar files placed alongside
   the framework's native artifacts.
7. The engineer confirms the handoff is in place and delivery can begin.

## Alternative Flows

- Regeneration: a handoff that has gone stale is generated again for the same slice, replacing
  the previous package with fresh digests and source revision.

## Failure Conditions

- Non-approved slice: generation is refused for a slice that is not approved; the actor is told
  which approval is missing.
- Structurally invalid handoff: if the packaged result violates the handoff contract, the
  process stops and reports the diagnostics; nothing partial is delivered.

## Postconditions

- The handoff exists in the SDD framework's workspace as sidecar files, with digests and source
  revision recorded.
- The SDD framework's native artifacts are untouched: the handoff sits beside them, never inside
  them.
