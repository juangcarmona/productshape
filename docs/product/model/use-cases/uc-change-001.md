---
id: UC-CHANGE-001
type: use-case
title: Evolve the Product Definition through a Product Change
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CHANGE-001
  - BR-AI-001
uses-terms:
  - TERM-CURRENT-PRODUCT-MODEL
---

## Goal

Carry the Product Definition from one accepted state to the next through a Product Change that is elaborated, validated as an overlay, approved by a human, applied, and offered for acceptance as a pull request.

## Trigger

The Product Engineer receives a modification request that would change what the product means.

## Preconditions

- The Product Definition exists and validates.

## Main Flow

1. The actor creates a change at `docs/product/changes/active/<chg-id>/change.md` with `status: draft`, its problem, intended outcome, rationale and open questions, and `base-revision` set to the baseline commit it is written against.
2. The AI Assistant reads the product graph and identifies which artifacts the outcome requires added, modified or removed.
3. The AI Assistant writes complete proposed future-state artifacts under the change's `proposed/` directory and lists their IDs under the matching operation.
4. The actor runs `prodshape change validate <chg-id>`, which compiles the overlay on the baseline and validates the result end to end without touching a baseline file.
5. The actor resolves the open questions and elaborates until the change is worth proposing, moving it to `status: proposed`.
6. A human reviews the change and sets `status: approved`. No tool may take this step.
7. The actor runs `prodshape change apply <chg-id>`, which revalidates the overlay, writes the operations into the model, reports the product diff and archives the change under `changes/completed/` with `status: applied`.
8. The actor opens a pull request carrying the applied result, and a human merges it. Acceptance is the merge.

## Alternative Flows

- The engineer may elaborate the change and its proposed artifacts by hand without AI assistance.
- A change that is not worth pursuing is set to `rejected` or `superseded` and filed with `prodshape change archive <chg-id>`.

## Failure Conditions

- `prodshape change validate` reports errors: the overlay is structurally invalid.
- `prodshape change apply` refuses because the change is not approved, or because the baseline moved under it since `base-revision` and the change needs an explicit rebase.

## Postconditions

- The working tree carries the applied result and the archived change, with nothing committed and nothing merged.
- The change history records what the product meant to change and why.
