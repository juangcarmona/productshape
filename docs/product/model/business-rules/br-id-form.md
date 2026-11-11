---
id: BR-ID-FORM
type: business-rule
title: Artifact IDs name the artifact and carry no sequence number
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
---

## Rule

An artifact ID is its kind's prefix followed by a name that identifies the thing: `PREFIX-NAME`, in uppercase words joined by hyphens (`UC-IMPACT`, `FR-CITE`, `BR-IDENTITY`). An ID carries no sequence number. A number is appended only to break a tie between two IDs that would otherwise be equal, as a plain integer without zero padding (`FR-CHANGE-2`), and a more distinguishing name is preferred to a number. The rule governs the IDs of new artifacts and of Product Changes; an ID, once assigned, stays immutable (BR-IDENTITY).

## Rationale

A sequence number says nothing about the artifact: it records the order in which someone happened to create things, it invites gaps and renumbering, and it makes an ID harder to recognise at a glance and in a citation. The identifier grammar never required it; the suffix was a habit inherited from the alpha templates. A name is meaningful in a list of IDs, in a diff and in a citation, and a number kept only as a tie-breaker stays honest about what it is for.

## Examples

- A use case for analysing the impact of an artifact is `UC-IMPACT`, not `UC-IMPACT-001`.
- Two requirements that cannot be told apart by name are `FR-ORDERS-CONFIRM` and `FR-ORDERS-CONFIRM-2`; naming each after what it requires, such as `FR-CHANGE-VALIDATE` and `FR-CHANGE-APPLY`, is better.
- The same name under two prefixes is not a tie: `UC-FIX` and `FR-FIX` coexist.
- IDs authored before this rule keep working: a numeric suffix is still a valid ID, and `prodshape fix --id-suffixes` migrates them only with the adopter's consent.

## Exceptions

An ID that already ends in a number and cannot lose it without colliding with another ID keeps its number: the number is then the tie-breaker. Reserved identifiers such as `CHG-INITIAL` are unaffected.
