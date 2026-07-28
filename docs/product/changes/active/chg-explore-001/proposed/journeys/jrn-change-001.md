---
id: JRN-CHANGE-001
type: journey
title: Evolve an existing product definition
status: active
primary-actor: ACT-PRODUCT-ENGINEER
steps:
  - use-case: UC-EXPLORE-001
  - use-case: UC-INSPECT-001
  - use-case: UC-IMPACT-001
  - use-case: UC-CHANGE-001
  - use-case: UC-SLICE-001
---

## Intended Outcome

An approved Product Change, sliced into coherent delivery increments and ready for delivery,
while the current product baseline remains untouched until the change is later promoted.

## Entry Conditions

- A validated product baseline exists in the repository.
- Someone has an idea for a product modification — however fuzzy — or has already stated a clear
  request for new behaviour, changed behaviour or removal.

## Journey Narrative

The Product Engineer may start by exploring a fuzzy idea with the AI assistant before any formal
change work begins: the assistant loads the product graph, reasons about gaps and affected areas,
and through conversation sharpens the idea into a clear change request. With a well-formed
request in hand, the engineer inspects the artifacts the modification touches, seeing their
relationships and checking which active changes already affect them. They then analyze the
structural impact of the intended modification — what is directly and transitively connected —
before deciding its true scope. With that picture, they express the modification as a Product
Change: complete proposed future-state artifacts for every addition, modification and removal,
together with rationale and any open questions. The change overlay is validated against the
baseline, and a human reviews and approves it. Finally the approved change is sliced into
vertical increments, each with explicit requirement coverage, dependencies and verification, and
each slice is approved by a human. Throughout, the baseline stays exactly as it was.

## Variants and Branches

- Skipped exploration: a Product Engineer who already has a well-formed request may skip
  UC-EXPLORE-001 and begin directly at UC-INSPECT-001. The exploration step is recommended for
  fuzzy ideas but is not enforced.
- Rejected change: a reviewer who finds the change unsound moves it to rejected; the baseline is
  unaffected and the analysis remains available for a future attempt.
- Concurrent changes: when two active changes overlap on the same artifacts, the overlap is
  surfaced and one change must be rebased onto the other's outcome before both can proceed.
- Greenfield model: when the product model is absent or minimal, the exploration step adapts to
  explain the product vocabulary and guide the user toward `ps:define` before `ps:change`.

## Completion Conditions

- The Product Change is approved, with a validated overlay and recorded rationale and open
  questions.
- Every part of the change is covered by approved Delivery Slices or explicitly deferred.
- The current product model contains no trace of the change yet: promotion is a separate,
  later act.
