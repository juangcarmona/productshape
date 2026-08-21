---
id: FR-VAT-AUTHZ-001
type: functional-requirement
title: VAT return access is bound to administration membership
status: active
derived-from:
  - UC-PREPARE-VAT-RETURN-001
  - BR-ADMIN-MEMBERSHIP-001
verification:
  - scenario: A member with the vat-administrator role creates a draft return in their administration and receives 201
  - scenario: A non-member attempting to create or read a return for that administration receives a masked 404
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-multi-administratie/spec.md
  confidence: high
  recovered-from: documentation
---

## Requirement

Every read and write of a `VatReturn` MUST verify that the acting user holds
membership (with a permitting role) in the administration named by the
return's `administrationId`. Non-members MUST receive a masked 404 for both
reads and writes; creation naming a foreign administration MUST be rejected.

## Rationale

The VAT return is a statutory tenant record; BR-ADMIN-MEMBERSHIP-001 binds
every record type, and a new statutory record type binds it explicitly at
introduction, not as an afterthought.

## Acceptance Scenarios

Two-account test: a member's POST yields 201; a non-member's POST naming the
same administration yields 404; the non-member's GET of the created return
yields 404.
