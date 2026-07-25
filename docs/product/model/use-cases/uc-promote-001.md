---
id: UC-PROMOTE-001
type: use-case
title: Promote a Product Change into the current model
status: active
primary-actor: ACT-REPOSITORY-MAINTAINER
supporting-actors: []
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CHANGE-001
  - BR-SDD-001
uses-terms:
  - TERM-PRODUCT-CHANGE
  - TERM-CURRENT-PRODUCT-MODEL
---

## Goal

An implemented, verified Product Change becomes part of the current product model through one
explicit, human-triggered act — closing the loop between what was decided and what the baseline
says.

## Trigger

The Repository Maintainer decides the change is done and runs promotion. Promotion is never
triggered by hooks, by SDD archival, or by any other automation.

## Preconditions

- The change's status is implemented.
- Every approved slice of the change is completed or explicitly cancelled.
- Coverage evidence is present for the requirements the slices implement.
- The change overlay validates cleanly against the current baseline.
- The baseline revision is compatible with the revision the change was based on.

## Main Flow

1. The maintainer runs promotion as a dry run first.
2. The plan is presented: every addition, modification and removal the promotion would apply to
   the baseline.
3. The maintainer reviews the plan and confirms it matches the approved, implemented change.
4. The maintainer executes the promotion.
5. Additions are created in the current model, modifications replace the previous artifact
   content, and removals retire the named artifacts.
6. The change moves to completed, with its full history — proposal, rationale, open questions
   and their resolutions — preserved.
7. The maintainer reviews and commits the result; the product records no commit on its own.

## Alternative Flows

- Cancelled slices: a change whose remaining slices were explicitly cancelled can still be
  promoted, with the cancellation visible in the change's history.

## Failure Conditions

- Baseline drift: the baseline has moved since the change's base revision; promotion is blocked
  until the change is explicitly rebased and revalidated.
- Unmet preconditions: a change that is not implemented, has unfinished slices or lacks coverage
  evidence is refused, with the missing precondition named.

## Postconditions

- The baseline reflects the change's delta; the current model is the new canonical definition.
- The change is completed and its history preserved; nothing was promoted implicitly and no
  commit was made automatically.
