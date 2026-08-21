---
id: BR-VAT-GENERIC-API-001
type: business-rule
title: VAT filing is served by the generic OpenRegister API
status: active
applies-to:
  - UC-PREPARE-VAT-RETURN-001
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-vat-btw-filing/spec.md
  confidence: high
  recovered-from: documentation
---

## Rule

The VAT return is exposed exclusively through OpenRegister's generic CRUD
HTTP surface. Shillinq adds no per-app controller, no custom VAT HTTP
endpoints, and no imperative PHP VAT calculation service; derived amounts
are declared as schema calculations and aggregations.

## Rationale

Per-app controllers and imperative services create a second behaviour path
that bypasses the register's declared lifecycle, validation and audit trail
(REQ-VBTW-001: "The register is exposed through OpenRegister's generic CRUD
HTTP surface; shillinq adds no per-app controller for BTW filing"; ADR-022
anti-pattern list).

## Examples

A draft return is created by POSTing to
`/index.php/apps/openregister/api/objects/shillinq/VatReturn`. Rubriek
totals are `x-openregister-calculations`, not methods on a service class.

## Exceptions

None at T3. Electronic submission gateway integration (Digipoort) is a
future capability and requires its own product decision before any custom
endpoint exists.
