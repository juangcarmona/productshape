---
id: CHG-SCOPE-ALIGN-001
type: product-change
title: Require explicit scope declarations with reasoned exemptions and exclude archived material by default
status: applied
base-revision: 'b5f54df'
operations:
  add: []
  modify:
    - FR-OPENSPEC-001
    - FR-SPECKIT-001
  remove: []
---

## Problem

The frozen citation contract finished the population-aware consumer verification rules after these requirements were written, and three of its determinations override the defaults they state.

First, every current document in the enumerated population carries exactly one explicit scope declaration; a citation alone is not a declaration, so a tool must not infer binding from it. Both requirements currently say a document declares "either `pdac-scope: none` or its ProductShape citations", which reads the citations as the declaration. Second, an exemption carries a non-empty human-authored reason and no citations, and a tool never creates or renews an exemption without an explicit human request; the requirements accept a bare `pdac-scope: none`. Third, a consumer integration excludes archived or historical documents by default; `FR-OPENSPEC-001` mandates the opposite, verification that always includes archived history.

## Intended Product Outcome

Every current consumer document carries exactly one explicit scope declaration: `pdac-scope: cited` for a bound document with at least one citation, or `pdac-scope: none` with a non-empty human-authored reason for an exempt one. Citations alone leave a document unclassified and verification fails on it. Archived OpenSpec history is excluded by default; explicitly including it verifies the citations it carries with every defect reported as a warning, and the scope gate stays current-only. Population-aware verification reports the provider identity and integration version.

## Rationale

This product is the reference implementation of the specification, so where the two disagree the specification wins and this product's definition is what has to move. The explicit declaration exists because a declaration is a statement of intent about the document, and inferring it from content lets a stray citation classify a document nobody reviewed. The reasoned exemption exists because an exemption without a reason is indistinguishable from a shortcut, and the reader deciding whether the exemption still holds needs the why. The archived default flips because the contract fixes the default population to current documents; the warning-severity treatment of explicitly included history is preserved, since failing on uneditable documents would turn history into a permanent failure.

## Affected Product Areas

The OpenSpec integration (`FR-OPENSPEC-001`) and the Spec Kit integration (`FR-SPECKIT-001`). Both remain governed by `BR-SDD-001` and `CON-SDD-AGNOSTIC`, which do not change: who owns the words and who resolves drift stay exactly as they were.

No actor, journey, term, rule or constraint changes. Nothing is added and nothing is removed.

## Open Questions

None.

## Product Acceptance

Neither requirement contains a statement that lets citations bind a document without a declaration, accepts an exemption without a reason, or includes archived material in default verification. `FR-OPENSPEC-001` states the exclusion default, the explicit-inclusion mode with warning severity, the current-only scope gate, the reasoned exemption and the provider identity and version in the report. `FR-SPECKIT-001` states the same declaration rule over its all-current population.

## Out of Scope

The declaration serialization (`pdac-scope`, `pdac-scope-reason`, the comment form's `reason` attribute) is adapter surface documented with the integrations, not canonical product text. The carrier and reader enforcement of citations themselves moves in its own change for #162.
