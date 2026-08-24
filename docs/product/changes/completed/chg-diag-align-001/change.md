---
id: CHG-DIAG-ALIGN-001
type: product-change
title: Align diagnostic attribution, emission counts and ordering with the frozen validation contract
status: applied
base-revision: 'c8bd0b0'
operations:
  add: []
  modify:
    - FR-VALIDATE-002
    - QR-DETERMINISM-001
  remove: []
---

## Problem

`FR-VALIDATE-002` and `QR-DETERMINISM-001` were written before the specification froze its validation contract, so both state defaults this product chose rather than the contract it now has to meet.

The frozen contract fixes four things the requirements leave open or contradict. Diagnostics carry three distinct ID subjects: the Product Artifact in `artifact`, the Product Change in `change` and the referenced or cited ID in `target`, plus the point of use of a citation as a payload `line` or a sidecar `entry`; the requirements know only `artifact`, `field` and `target`, so change IDs and cited IDs land in `artifact`, including unresolved IDs that never identified an artifact. The contract's emission granularity table is normative, exactly one diagnostic per described unit; the requirements do not constrain counts at all. And both requirements pin the ordering to "by file, then code, then target", where the contract orders by file, then line and entry (absent before present, numerically), then code, field, target, artifact and change.

## Intended Product Outcome

Every diagnostic carries the attribution the validation contract fixes for its code. A Product Change ID appears in `change` and never in `artifact`. A citation diagnostic carries the cited ID in `target` exactly as authored, whether or not it resolves, together with its payload `line` or sidecar `entry`; an unresolved ID never appears in `artifact`. Exactly one diagnostic is emitted per violating unit as the contract's emission granularity fixes it. Diagnostics are ordered by file, then line and entry (absent before present, compared numerically), then code, field, target, artifact and change, comparing absent strings as empty strings.

## Rationale

This product is the reference implementation of the specification, so where the two disagree the specification wins and this product's definition is what has to move. The alternative, holding the earlier defaults and documenting the divergence, would make the conformance claim in `docs/specification/` untrue: the finished conformance corpus already asserts the contract attribution, for example `change` on `PRODUCT108` and `target` with `line` on `PRODUCT062`.

The subject split is not cosmetic. Consumers of machine-readable diagnostics key remediation on the subject field: a pipeline that reads `artifact` to locate a Product Artifact breaks silently when the value is sometimes a Product Change ID or an ID that resolves to nothing. The ordering change exists because citation diagnostics gained a numeric point of use, and a report that interleaves points of use non-monotonically within a file is not diffable line by line.

## Affected Product Areas

Structural validation reporting (`FR-VALIDATE-002`) and the determinism guarantee over its output (`QR-DETERMINISM-001`). Both are reached through `UC-VALIDATE-001`; citation verification and change validation inherit the shape through the shared diagnostic contract.

No actor, journey, term or constraint changes. Nothing is added and nothing is removed.

## Open Questions

None.

## Product Acceptance

`FR-VALIDATE-002` names the complete attribution set including `change`, `line` and `entry`, states the three-subject separation, requires exactly one diagnostic per violating unit and states the eight-key ordering. `QR-DETERMINISM-001` states the same ordering in its determinism guarantee. A reader who knows only the frozen specification and reads these two requirements finds no statement that contradicts it.

## Out of Scope

The implementation of these requirements, and every document that is not part of the Product Definition: the validation chapter's diagnostic tables in `docs/specification/`, the conformance workflow's specification pin, and the conformance tests. Those follow this change; they are not part of it.

The configuration contract, the population-aware scope contract and the citation carrier contract move in their own changes. No diagnostic code is added, retired or renumbered here.
