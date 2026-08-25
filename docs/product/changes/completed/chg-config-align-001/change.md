---
id: CHG-CONFIG-ALIGN-001
type: product-change
title: State warnings-as-errors as a result escalation that preserves diagnostic severity
status: applied
base-revision: '02f4fef'
operations:
  add: []
  modify:
    - FR-CITATIONS-VERIFY-001
    - UC-CITATIONS-VERIFY-001
  remove: []
---

## Problem

The frozen configuration contract determines what `validation.warnings-as-errors` does: it makes a command fail when warnings are present, and it does not change the emitted diagnostic severity, remove diagnostics or permit selecting individual warning codes, so a machine-readable report is identical with the option on or off.

Two statements in the Product Definition were written before that determination and read as the older behavior. `FR-CITATIONS-VERIFY-001` says the configuration "may escalate" `PRODUCT061`, and `UC-CITATIONS-VERIFY-001` says it "escalates stale citations (PRODUCT061) to errors". Both readings permit an implementation that rewrites severity to `error`, which the contract now forbids.

## Intended Product Outcome

Both statements name the determined semantics: `warnings-as-errors` makes the run fail while the reported severity of `PRODUCT061` remains `warning`, so the same diagnostics appear in machine-readable output whether or not the repository escalates.

## Rationale

This product is the reference implementation of the specification, so where the two disagree the specification wins and this product's definition is what has to move. "Escalates to errors" is exactly the sentence a conforming implementer would cite to justify rewriting severity, and severity rewriting breaks the contract's guarantee that a report is comparable across repositories regardless of local policy. The distinction is small in prose and load-bearing in code, which is why it is recorded as a Product Change rather than silently reworded.

## Affected Product Areas

Citation verification (`FR-CITATIONS-VERIFY-001`) and its use case (`UC-CITATIONS-VERIFY-001`). No actor, journey, term, rule or constraint changes. Nothing is added and nothing is removed.

## Open Questions

None.

## Product Acceptance

Neither artifact contains a statement that permits changing a diagnostic's severity through configuration, and both state that `warnings-as-errors` changes the command result only.

## Out of Scope

The configuration file shape itself (the kernel keys and the `extensions.prodshape` namespace) is implementation surface documented in `docs/adoption/`, not canonical product text, and moves with the implementation. The diagnostic contract moved in CHG-DIAG-ALIGN-001.
