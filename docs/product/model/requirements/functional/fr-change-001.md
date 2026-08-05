---
id: FR-CHANGE-001
type: functional-requirement
title: Validate a Product Change as an overlay on the baseline
status: active
derived-from:
  - UC-CHANGE-001
  - BR-CHANGE-001
verification:
  - id: S1
    scenario: A change whose operations and proposed artifacts agree reports zero errors
  - id: S2
    scenario: An operation inconsistent with the baseline or with proposed/ reports its specific diagnostic
  - id: S3
    scenario: Concurrent live changes touching the same artifact are reported
  - id: S4
    scenario: Validating a change leaves every baseline file untouched
---

## Requirement

The product MUST validate a Product Change through `prodshape change validate [id]` by compiling an overlay: the baseline with the change's additions added, its modifications replaced and its removals deleted, without modifying any baseline file. The overlay MUST then be put through full structural validation.

The command MUST report an addition whose ID already exists, a modification or removal of an ID that does not exist, a duplicate produced by the overlay, a removal that strands a reference, an operation without its proposed artifact and a proposed artifact no operation names, each with its stable diagnostic code, source file and artifact ID. It MUST report overlapping modify and remove operations across concurrent live changes. It MUST warn when an approved change still lists unresolved open questions.

These diagnostics MUST be reported only when a change is validated or applied, never when validating the baseline alone, and never against the inert archives under `changes/completed/` and `changes/rejected/`.

## Rationale

A change states intent that may not survive contact with the baseline: it can add an ID that already exists, modify one that does not, or strand a reference by removing an artifact something still points at. None of that is visible in the change document alone, and none of it is visible in the baseline alone. Compiling the overlay is what makes the future state checkable before anyone commits to it.

Validating without writing is what lets a change be elaborated iteratively. The baseline artifacts a live change touches stay authoritative and unchanged until a human approves the change and applies it.

## Acceptance Scenarios

- S1: a change whose operations and proposed artifacts agree reports zero errors
- S2: an operation inconsistent with the baseline or with proposed/ reports its specific diagnostic
- S3: concurrent live changes touching the same artifact are reported
- S4: validating a change leaves every baseline file untouched
