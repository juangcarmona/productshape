---
id: BR-ADMIN-MEMBERSHIP-001
type: business-rule
title: Administration data is accessible to members only
status: active
applies-to:
  - BC-BOOKKEEPING
  - UC-PREPARE-VAT-RETURN-001
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-multi-administratie/spec.md
  confidence: high
  recovered-from: documentation
---

## Rule

A user may read, create or modify records of an administration only while
holding membership in that administration, with a role that permits the
action. A non-member's attempt to reach an administration's record MUST be
answered with a masked 404 Not Found (never 403), so neither the record nor
the administration's existence is disclosed.

## Rationale

Administrations are tenants: their books are confidential and statutory.
Every record carries `administrationId`, and access control binds to
membership on every path — including any new record type added later. A
filing created in someone else's administration is both a data breach and a
false statutory record.

## Examples

A user with membership in WERK-001 and not in PRIVAAT-001 who GETs a
PRIVAAT-001 record receives 404. Creating any record whose
`administrationId` names an administration the caller is not a member of is
rejected.

## Exceptions

None. Cross-administration features (e.g. intercompany postings) act through
users who are members of both sides.
