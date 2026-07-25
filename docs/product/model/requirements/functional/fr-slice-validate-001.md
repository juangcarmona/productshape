---
id: FR-SLICE-VALIDATE-001
type: functional-requirement
title: Validate delivery slices against their Product Change
status: active
derived-from:
  - UC-SLICE-001
  - BR-CHANGE-001
verification:
  - scenario: Every slice reference must resolve within the owning change's overlay
  - scenario: Partial coverage of a requirement without a scope declaration is an error
  - scenario: Foreign product-change references and slice dependency cycles are errors
---

## Requirement

The product MUST validate every delivery slice against the Product Change that contains it. Each
artifact ID a slice references MUST resolve within the owning change's overlay — the baseline
combined with that change's operations. A slice that covers a requirement only partially MUST
declare a scope stating which part it delivers; partial coverage without a scope MUST be an error.
A slice that references a different Product Change than the one containing it MUST be an error,
and dependency cycles between slices MUST be an error.

## Rationale

Slices are how a Product Change becomes deliverable increments, so a slice is only meaningful
inside its own change: resolving references overlay-first ensures a slice can target the future
state it exists to deliver, while a reference into a foreign change would let one proposal
smuggle scope from another. The scope obligation protects the promotion gate — if two slices each
deliver "part" of a requirement without saying which part, nobody can later show the requirement
was fully covered. And cycles between slices would make the delivery order unsatisfiable, turning
planning into guesswork.

## Acceptance Scenarios

- A slice implements a requirement that exists only as a proposed artifact of its owning change.
  Validation resolves the reference through the overlay and reports no error.
- Two slices split one requirement. The slice that declares a scope for its portion validates; a
  slice covering the requirement partially with no scope is reported with the documented error
  code.
- A slice inside one change references a requirement belonging to a different Product Change, and
  two slices declare dependencies on each other. Validation reports the foreign reference and the
  cycle as errors.
