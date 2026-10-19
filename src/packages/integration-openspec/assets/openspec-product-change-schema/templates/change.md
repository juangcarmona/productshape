---
id: CHG-EXAMPLE-001
type: product-change
title: Example product change
status: draft
base-revision: '3f2a91c'
operations:
  add:
    - FR-EXAMPLE-001
  modify:
    - UC-EXAMPLE-001
  remove: []
---

This file lives at `product-change/change.md` inside the OpenSpec change directory, and the proposed future state lives beside it under `product-change/proposed/**`, laid out exactly as it will live in `docs/product/model` with files named by lowercase id.

This manifest and every artifact under `product-change/proposed/**` are Product Definition content, not consumer documents. Do not add `pdac-scope` declarations or PDaC citations here. Proposed artifacts express their internal connections through typed PDaC relationships; citations remain in `proposal.md` and other documents that consume the accepted model.

Every ID under `operations.add` and `operations.modify` needs a complete proposed artifact under `product-change/proposed/`. Author each artifact from its current PDaC template (`prodshape template <kind>`). Set `base-revision` to the baseline commit this change was authored against, quoted so YAML reads an all-digit revision as a string.

Leave `status: draft` while authoring; `status: approved` is the apply-authorised protocol state and setting it is the caller's authorisation act, outside this workflow. Apply materializes the proposal into the accepted model on a working branch; it never archives this change, and a pull-request merge accepts the resulting baseline. Product Change status never records implementation, verification, release or deployment.

## Problem

What is wrong or missing in the current Product Definition? State the problem, not the solution.

## Intended Product Outcome

What the Product Definition says once this change is accepted. Describe the destination, not the steps.

## Rationale

Why this outcome, and why now. Record the reasoning a future reader would otherwise have to reconstruct.

Distil each accepted decision that explains the delta here, next to the relevant edit. Preserve the human's answer verbatim; do not replace it with an interpretation.

## Affected Product Areas

Which parts of the product this change touches, in product language rather than file paths.

## Open Questions

Only genuinely unresolved decisions remain here. Include parked questions and why they are parked. If answering a question could produce materially different product behaviour, ask exactly one question at a time and stop: do not complete this delta or select an answer on the user's behalf. Write `None.` only after every product-semantic question in both the intent and this manifest has been resolved.

## Product Acceptance

How a reviewer recognises that the accepted definition expresses the intended outcome.

## Out of Scope

What this change explicitly does not touch, including consciously excluded gaps, delivery, technical design and implementation. A graph neighbour checked and found unaffected belongs here as an explained exclusion, not as a silent omission.
