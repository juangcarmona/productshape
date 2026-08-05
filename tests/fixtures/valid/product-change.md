---
id: CHG-CITATIONS-001
type: product-change
title: Cite canonical product text instead of restating it
status: proposed
base-revision: '3f2a91c'
operations:
  add:
    - BR-CITE-CANONICAL
    - FR-CITATIONS-001
  modify:
    - UC-VALIDATE-001
  remove: []
---

## Problem

Consumer documents restate product text instead of pointing at it, so the restatement drifts from the definition without anything detecting the drift.

## Intended Product Outcome

Consumer documents cite canonical artifacts by identifier and digest, and a citation whose target changed is reported rather than silently tolerated.

## Rationale

A restatement is a copy, and copies go stale. A citation binds to the text it depends on, so the definition stays the single place the meaning lives.

## Affected Product Areas

Validation of consumer documents, and the use case through which a validator checks a product model.

## Open Questions

None.

## Product Acceptance

A consumer document citing a changed artifact reports as stale, and the same document citing an unchanged artifact reports as current.

## Out of Scope

Citation resolution across repositories, and any delivery decomposition of the work described here.
