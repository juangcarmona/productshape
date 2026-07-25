---
id: FR-CHANGE-OVERLAY-001
type: functional-requirement
title: Validate Product Changes as overlays on the baseline
status: active
derived-from:
  - UC-CHANGE-001
  - BR-CHANGE-001
verification:
  - scenario: Change validation compiles baseline plus operations without modifying baseline files
  - scenario: Add-collisions, unknown modify/remove targets and overlay duplicates are errors
  - scenario: Removals leaving dangling references and overlapping concurrent changes are errors
---

## Requirement

The product MUST validate a Product Change by compiling the future state as an overlay: the
current baseline combined with the change's add, modify and remove operations. Overlay validation
MUST NOT modify any baseline file. It MUST report as errors: an addition whose ID already exists
in the baseline; a modification or removal of an ID that does not exist in the baseline; an
overlay that produces duplicate IDs; a removal that leaves a dangling reference from an active
artifact in the overlay; and concurrent active Product Changes whose modify or remove operations
overlap.

## Rationale

A Product Change is a proposal, and a proposal must be checkable before it is trusted. Overlay
validation answers the only question that matters at proposal time — would the product model still
be valid if this change were applied? — without the change touching the baseline it is judged
against. Each detected condition is a way a proposal can silently corrupt the model: colliding
additions and overlay duplicates break identity, operations on unknown IDs mean the proposal has
drifted from reality, dangling references would punch holes in the graph at promotion, and
overlapping concurrent changes are promotions waiting to conflict. Catching all of them while the
change is still a set of files keeps evolution safe and reviewable.

## Acceptance Scenarios

- A change adding one requirement and modifying another is validated. The overlay — baseline plus
  operations — is compiled and validated; every baseline file remains byte-identical afterwards.
- A change attempts to add an ID that already exists in the baseline, modify an ID absent from the
  baseline, and remove another absent ID. Validation reports each with its documented error code.
- A change removes an artifact still referenced by an active artifact in the overlay, while a
  second active change modifies one of the same IDs. Validation reports the dangling reference and
  the concurrent overlap as errors, and the run exits with the validation-error exit code.
