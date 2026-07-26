---
id: UC-FIX-001
type: use-case
title: Repair filename misalignment across the model
status: draft
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors: []
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-IDENTITY-001
uses-terms:
  - TERM-PRODUCT-ARTIFACT
  - TERM-CURRENT-PRODUCT-MODEL
---

## Goal

Every artifact file named after its own identifier, in one step, on any filesystem — and a way to
keep it that way.

## Trigger

Validation reports that one or more artifact files are not named after their identifiers, typically
after a recovery pass, a bulk rename, or an artifact whose file was created before its ID was
settled.

## Preconditions

- The repository contains a product model.

## Main Flow

1. The engineer asks for the misalignment to be repaired, naming the repair explicitly.
2. Each misaligned file is renamed to the name its identifier requires, including when the only
   difference is letter case.
3. The renames performed are reported, so the engineer can review them as a diff.
4. Re-running validation reports no remaining misalignment.

## Alternative Flows

- The engineer asks what would change without changing it: the planned renames are reported, nothing
  is written, and the outcome is distinguishable from "nothing to repair" so it can gate an automated
  check.
- The model is already aligned: nothing is renamed and the engineer is told so.
- A previous repair was interrupted part-way: the interrupted rename is completed before anything
  else, and the completion is reported.

## Failure Conditions

- A required name is already taken by a different artifact, or two artifacts require the same name:
  nothing is renamed at all, and each unresolvable case is reported with its reason. A partially
  renamed model is worse than an unrepaired one.
- No repair is named: the request is reported as invalid, listing the repairs available. Modifying
  canonical files is never implicit.

## Postconditions

- Every artifact file is named after its identifier, or nothing was renamed and the engineer knows
  why.
- No file is left under a temporary or intermediate name.
