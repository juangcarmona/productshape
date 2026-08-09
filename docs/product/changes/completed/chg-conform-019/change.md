---
id: CHG-CONFORM-019
type: product-change
title: State citation status precedence, determined by the specification
status: applied
base-revision: '79df25d'
operations:
  add: []
  modify:
    - FR-CITATIONS-VERIFY-001
  remove: []
---

## Problem

`FR-CITATIONS-VERIFY-001` states the four citation statuses without saying in what order a tool evaluates them, or whether a citation can carry more than one status's diagnostic. The specification has since determined both (spec PR #19, closing spec issue #17): a fixed evaluation order, invalid digest before unresolved target before unresolved anchor before tampered before stale before current, first match wins, and a citation carries the diagnostic of its status and no other. It also determined that an embedded projection's faithfulness is judged against its recorded digest alone, never against the target's current content, which is what makes the tamper test decidable after the cited text has also moved.

Without the precedence stated, this product's own implementation gated the tamper check on the target's digest still matching the recorded one, so a hand-edited embedded projection whose cited target had also changed fell through to staleness: a warning, exit `0`, instead of the error the determined contract requires.

## Intended Product Outcome

`FR-CITATIONS-VERIFY-001` states the fixed precedence order and the one-diagnostic-per-citation rule, and adds the tampered-and-stale combination as an acceptance scenario: a citation whose embedded projection differs from the canonical text at its recorded digest reports `tampered` and `PRODUCT062`, never `stale` or `PRODUCT061`, even when the cited target has also changed since the citation was recorded.

## Rationale

This product is the reference implementation of the specification, so where the two disagree the specification wins and this product's definition is what has to move. A requirement that lists four statuses without an order between them cannot be conformance-tested against a case that puts two of them in contention for the same citation, and the specification's own conformance tests do exactly that (`conformance/cases/citation-tampered-and-stale/`).

Stating the order is what turns an implicit implementation choice into a requirement a conformance test can check: `S6` asserts both the status the tool must report and the diagnostic it must not.

## Affected Product Areas

Citation verification (`FR-CITATIONS-VERIFY-001`), reached through `UC-CITATIONS-VERIFY-001`. The use case does not change: the mechanism of citation verification is not what moved, only the precedence between two of its outcomes.

No actor, journey, term, business rule or constraint changes. Nothing is added and nothing is removed.

## Open Questions

None.

## Product Acceptance

`FR-CITATIONS-VERIFY-001` states the evaluation order, the one-diagnostic-per-citation rule, and an `S6` scenario naming the tampered-and-stale combination and its required outcome.

A reader who knows only the specification and reads this requirement finds no statement that contradicts it.

## Out of Scope

The implementation in `packages/core/src/citations.ts`, the `--format json` envelope in `packages/cli/src/commands/citations.ts`, their tests, and every document that is not part of the Product Definition: the validation chapter's diagnostic notes and the adoption guide's status table. Those follow this change; they are not part of it.

No diagnostic code is introduced, retired or renumbered.
