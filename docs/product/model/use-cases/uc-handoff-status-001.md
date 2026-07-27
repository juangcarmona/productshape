---
id: UC-HANDOFF-STATUS-001
type: use-case
title: Check whether a Product Handoff is still current
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors: []
bounded-context: BC-DELIVERY-INTEGRATION
governed-by:
  - BR-SDD-001
uses-terms:
  - TERM-PRODUCT-HANDOFF
---

## Goal

Before and during implementation, know whether the product knowledge a handoff packaged still
matches the product model — so delivery never proceeds unknowingly on outdated product context.

## Trigger

The Product Engineer runs `prodshape handoff status <path>`, most often automatically
from a hook before implementation work starts in the SDD workflow.

## Preconditions

- The handoff exists at the given path with its recorded digests and source revision.

## Main Flow

1. The actor or hook runs `prodshape handoff status <path>`.
2. The artifacts the handoff references are compared, by content, against their current state in
   the product model.
3. The verdict is reported: the handoff is current, and implementation can proceed on it.

## Alternative Flows

- Stale: one or more referenced artifacts have changed since the handoff was generated; the
  verdict names each changed artifact so the engineer can judge the impact and regenerate.
- Invalid: the handoff itself does not satisfy its contract; the verdict says so rather than
  guessing at currency.
- Source revision unavailable: the recorded source revision cannot be resolved; the verdict
  reports that currency cannot be fully established.

## Failure Conditions

- No handoff at the given path: the command reports it clearly instead of inventing a verdict.

## Postconditions

- The actor knows whether the handoff is current, stale (and for which artifacts), invalid, or
  unverifiable.
- Staleness was judged only by the content of the artifacts the handoff references: unrelated
  repository activity never makes a handoff stale.
- Neither the handoff nor the product model was modified.
