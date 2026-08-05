---
id: CHG-CONFORM-028
type: product-change
title: Conform the change and apply requirements to the second refinement of RFC 4
status: draft
base-revision: '8fcdb1b'
operations:
  add: []
  modify:
    - FR-CHANGE-001
    - FR-CHANGE-002
  remove: []
---

## Problem

Five points of the Product Changes chapter did not determine implementation behaviour when this product's change and apply requirements were written, so those requirements state defaults this product chose rather than the contract it now has to meet. The specification has since determined all five (spec PR #14, the second refinement of RFC 4), and two of the determinations override the defaults.

`FR-CHANGE-002` says apply "MUST require `status: approved`" without naming an observable failure, so the one apply precondition a conformance corpus could otherwise test is untestable. It scopes baseline drift to "any artifact named in the change's operations", which reads as covering additions that have no baseline artifact to compare against. It describes the product diff as "every impacted artifact and its resulting content digest", which omits the kind of impact, says nothing about reporting the diff, and leaves open the reading that apply writes it into the change directory it is about to archive.

`FR-CHANGE-001` names `changes/completed/` and `changes/rejected/` as the inert archives, so a change that was approved and then overtaken is filed under a refusal that never happened. It also states the open-questions warning as a fact about approval as an event, which is not reproducible from repository content alone.

## Intended Product Outcome

The two change requirements state the determined contract.

Apply refuses a change whose status is not `approved` with the diagnostic `PRODUCT028`, exit code `1` and the working tree untouched. Baseline drift covers `operations.modify` and `operations.remove` only, and an artifact counts as changed when its normalized content digest differs from its digest at `base-revision`. The product diff is reported in a human-readable and a machine-readable form, each entry naming the impacted artifact, the kind of impact and, for an addition or a modification, the resulting digest; it is never written into the archived change.

Each terminal status has its own archive directory, so `changes/superseded/` joins `changes/completed/` and `changes/rejected/` as an inert archive. The open-questions warning is state-based and syntactic: it is reported whenever a change in status `approved` carries a Markdown list item under `## Open Questions`, at any nesting depth.

## Rationale

This product is the reference implementation of the specification, so where the two disagree the specification wins and this product's definition is what has to move. The alternative — holding the old defaults and documenting the divergence — would make the conformance claim in `docs/specification/` untrue, and the corpus that will eventually verify it unbuildable.

The two overrides both replace a silence with an observable fact. A precondition with no diagnostic code cannot be asserted by a corpus that compares diagnostics, and `PRODUCT028` is the next unallocated code in the band already reserved for Product Changes and apply. A single archive for two different terminal outcomes loses the distinction between refused and overtaken at exactly the moment the change history becomes the only record of it; reconstructing that from `git log` is archaeology, and `superseded` is reachable from `approved`, so the loss is not hypothetical.

The three confirmations are recorded here rather than left implicit because a requirement that happens to describe conforming behaviour without saying why is one refactor away from not describing it any more.

## Affected Product Areas

Product Change validation (`FR-CHANGE-001`) and apply (`FR-CHANGE-002`). Both are reached through the same use case, `UC-CHANGE-001`, and governed by the same rule, `BR-CHANGE-001`; neither the use case nor the rule changes, because the mechanism of product evolution is not what moved — only the observable behaviour of the two operations that serve it.

No actor, journey, term or constraint changes. Nothing is added and nothing is removed.

## Open Questions

None.

## Product Acceptance

`FR-CHANGE-001` names three inert archives and states the open-questions warning as a fact about a change's state, defined syntactically. `FR-CHANGE-002` names `PRODUCT028` and its exit code, scopes drift to modifications and removals judged by content digest, and states that the diff carries an impact kind per entry, is reported in both forms and is never written into the archive.

A reader who knows only the specification and reads these two requirements finds no statement that contradicts it.

## Out of Scope

The implementation of these requirements, and every document that is not part of the Product Definition: the validation chapter's diagnostic tables, the adoption and methodology guides, the scaffolded directory list and the conformance corpus run. Those follow this change; they are not part of it.

No new diagnostic code beyond `PRODUCT028` is introduced, and no retired code is revived.
