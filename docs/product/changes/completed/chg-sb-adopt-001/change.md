---
id: CHG-SB-ADOPT-001
type: product-change
title: 'Adopt Structured Behaviour in the self-model'
status: applied
base-revision: '0e563ce928bd5cfd9d5b6782ceef56e81d92bf38'
operations:
  add:
    - SB-ID-REUSE-REJECTED
    - SB-REGENERATION-RESTORES
    - SB-TAMPERED-BEATS-STALE
  modify:
    - BR-IDENTITY-001
    - BR-CANONICAL-001
    - FR-CITATIONS-VERIFY-001
  remove: []
---

## Problem

The methodology now defines Structured Behaviour, an independently citable example of accepted observable behaviour, and this Product Definition uses none. Three concrete behaviours currently live where nothing can cite them independently: the identity rule and the canonical-artifacts rule each carry a testable example inside body prose, and the citation-status precedence lives as one inline verification scenario of FR-CITATIONS-VERIFY-001, so anything relying on that exact precedence can only cite the whole requirement.

## Intended Product Outcome

The definition carries three Structured Behaviours, each the canonical carrier of one concrete behaviour: SB-ID-REUSE-REJECTED (a retired artifact's ID is never reused), SB-REGENERATION-RESTORES (deleting every derived output loses nothing), and SB-TAMPERED-BEATS-STALE (a hand-edited embedded projection whose target also moved reports tampered, never stale). The two business rules mention their example's Structured Behaviour instead of restating it, and FR-CITATIONS-VERIFY-001 verifies the precedence through a scenario reference while its other scenarios stay inline.

## Rationale

The bar for extraction is that a consumer would cite the example itself, and these three are where that bar is met today: the precedence is load-bearing for every citation consumer, and the two rule examples state behaviours the toolkit's own tests and walkthroughs rely on. No consumer document currently anchors any inline scenario, so wholesale extraction of the remaining thirty-plus verification lists would create artifacts nothing cites; those entries remain inline per the methodology's own guidance that ordinary acceptance criteria stay where they are. Only SB-TAMPERED-BEATS-STALE authors uses-terms, because interpreting it requires the citation concept; the other newly permitted uses-terms authorships stay unauthored until an artifact genuinely cannot be understood without a term.

## Affected Product Areas

Product artifact identity, canonical authored knowledge and its derived outputs, and citation-status verification. Consumer documents citing the two business rules or the citations-verify requirement are re-cited when this change is applied.

## Open Questions

None.

## Product Acceptance

The three behaviours validate as Structured Behaviours with their illustrates relationships resolving; FR-CITATIONS-VERIFY-001 carries five inline scenarios plus one scenario reference and no duplicated wording; the modified business rules mention their Structured Behaviour without restating its clauses; validation is clean and every consumer citation is current after re-citing.

## Out of Scope

Journey coverage for the nine active use cases without one (issue #165). Bulk uses-terms authorship on rules, terms, requirements and constraints. Extraction of any further inline verification scenario, which waits for a consumer that needs to cite it. Delivery, technical design and implementation.
