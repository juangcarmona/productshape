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
  - id: S5
    scenario: An approved change carrying a list item under Open Questions is warned about on every validation
---

## Requirement

The product MUST validate a Product Change through `prodshape change validate [id]` by compiling an overlay: the baseline with the change's additions added, its modifications replaced and its removals deleted, without modifying any baseline file. The overlay MUST then be put through full structural validation.

The command MUST report an addition whose ID already exists, a modification or removal of an ID that does not exist, a duplicate produced by the overlay, a removal that strands a reference, an operation without its proposed artifact and a proposed artifact no operation names, each with its stable diagnostic code, source file and artifact ID. It MUST report overlapping modify and remove operations across concurrent live changes.

It MUST warn whenever a change in status `approved` still carries an unresolved question under `## Open Questions`. An unresolved question is a Markdown list item within that section, at any nesting depth, and a list item counts regardless of its content: nothing in the syntax distinguishes an answered item from an open one. Prose is not a question, so `None.` and an empty section carry no warning. The warning is a fact about the change's state and not about the moment its status changed, so it is reported on every validation of an approved change.

These diagnostics MUST be reported only when a change is validated or applied, never when validating the baseline alone, and never against the inert archives under `changes/completed/`, `changes/rejected/` and `changes/superseded/`.

## Rationale

A change states intent that may not survive contact with the baseline: it can add an ID that already exists, modify one that does not, or strand a reference by removing an artifact something still points at. None of that is visible in the change document alone, and none of it is visible in the baseline alone. Compiling the overlay is what makes the future state checkable before anyone commits to it.

Validating without writing is what lets a change be elaborated iteratively. The accepted baseline artifacts a live change touches stay authoritative and unchanged throughout elaboration. Apply materializes the approved proposal only on a working branch; authority changes only when a human merges the resulting definition into the canonical branch.

The open-questions warning is syntactic on purpose. No deterministic tool can judge whether a sentence of prose contains an open question, and two implementations reading the same bytes have to reach the same verdict, so the rule counts list items and nothing else. Resolving a question therefore means removing its list item — deleting it, or folding it into the prose that answers it. Making the warning state-based rather than transition-based is what makes it reproducible: a repository carries the answer in its own content, with no need to know what happened when.

Each terminal status has its own archive because the change history is the evidence of which outcome a change met. A change that was approved and then overtaken was not refused, and filing it under `rejected/` would record a decision nobody made.

## Acceptance Scenarios

- S1: a change whose operations and proposed artifacts agree reports zero errors
- S2: an operation inconsistent with the baseline or with proposed/ reports its specific diagnostic
- S3: concurrent live changes touching the same artifact are reported
- S4: validating a change leaves every baseline file untouched
- S5: an approved change carrying a list item under Open Questions is warned about on every validation
