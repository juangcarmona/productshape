---
id: CHG-TRACEABILITY-001
type: product-change
title: Add requirement coverage validation to the OpenSpec adapter
status: implemented
base-revision: ecce80445a5746d48a76a4e191448aa9de60f962
operations:
  add:
    - UC-COVERAGE-001
  modify:
    - FR-COVERAGE-001
    - JRN-SDD-HANDOFF-001
  remove: []
---

## Problem

The delivery journey promises that requirement coverage is checked before SDD closure, but the product model has no use case describing that interaction: nothing defines how an engineer (or a hook) actually verifies that every requirement a handoff implements has evidence. The obligation exists (FR-COVERAGE-001) without a behavioural home, so the check cannot be traced from an actor's interaction to the requirement it satisfies.

## Intended Product Outcome

A Product Engineer can run a coverage check against one SDD change and get a deterministic verdict: every requirement the sidecar handoff implements is either covered by declared specification and verification evidence, or reported as uncovered before the SDD change is closed. The delivery journey names this interaction as an explicit step between checking handoff status and promoting the change.

## Rationale

Coverage validation is the strongest gate in the delivery flow: it converts "the slice is done" from an assertion into an auditable record. Modelling it as a use case gives the obligation a traceable source of intent, lets hooks and CI reference a defined interaction, and completes the traceability chain from actor to verified requirement.

## Affected Product Areas

- Delivery Integration: a new use case (UC-COVERAGE-001) for checking coverage of one SDD change.
- FR-COVERAGE-001 gains the new use case as a derivation source alongside UC-HANDOFF-001 and BR-SDD-001.
- JRN-SDD-HANDOFF-001 gains the coverage check as an explicit journey step before promotion.

## Open Questions

None.

## Product Acceptance

- The coverage check is an explicit step of the SDD delivery journey.
- Running the check against an SDD change with an uncovered implemented requirement reports that requirement with the documented error code and a failing exit.
- Running the check against a fully covered SDD change passes deterministically.

## Out of Scope

- Coverage evidence formats for SDD frameworks other than OpenSpec.
- Automatic generation of coverage mappings.
- Blocking mechanics inside SDD tooling (the check reports; SDD tooling decides how to gate).
