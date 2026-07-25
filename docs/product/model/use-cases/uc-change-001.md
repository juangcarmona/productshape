---
id: UC-CHANGE-001
type: use-case
title: Create a Product Change
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CHANGE-001
  - BR-AI-001
uses-terms:
  - TERM-PRODUCT-CHANGE
  - TERM-CURRENT-PRODUCT-MODEL
---

## Goal

A requested modification to the product becomes an explicit, validated delta against the current
model: complete proposed future-state artifacts, rationale and open questions, ready for human
review — with the baseline itself untouched.

## Trigger

Someone requests or discovers a needed product modification, and the Product Engineer starts a
Product Change to carry it, usually with the AI Assistant executing the Change skill.

## Preconditions

- A validated product baseline exists.
- The intent of the modification is stated well enough to analyze.

## Main Flow

1. The engineer inspects the current graph around the affected area to understand what exists.
2. The artifacts affected by the intent are identified: what must be added, modified or removed.
3. Each addition and modification is expressed as a complete proposed future-state artifact, not
   as a diff or an instruction; each removal names the artifact it retires.
4. The rationale for the change is recorded, along with every open question the intent leaves
   unanswered.
5. The engineer runs `product-definition change validate <ID>`, which checks the model as it
   would look with the change applied.
6. Diagnostics are resolved until the overlay validates cleanly.
7. A human reviews the change and approves it, moving it to approved.

## Alternative Flows

- Rejection: the reviewer finds the change unsound and moves it to rejected; the baseline is
  unaffected and the recorded analysis remains for future reference.
- Concurrent overlap: another active change touches the same artifacts; the overlap is surfaced
  and the engineer rebases one change on the other's expected outcome before proceeding.

## Failure Conditions

- Overlay validation errors: the change cannot be approved while the model-with-change-applied
  violates any structural contract.
- Missing information: the AI Assistant records an open question and stops rather than deciding
  the product's behaviour itself.

## Postconditions

- The change lives under the active changes area with its proposed artifacts, rationale and open
  questions.
- The current product model is untouched: nothing changes in the baseline until promotion.
