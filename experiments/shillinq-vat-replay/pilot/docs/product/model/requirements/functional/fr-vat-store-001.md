---
id: FR-VAT-STORE-001
type: functional-requirement
title: Store VAT returns as the single VatReturn register via the generic API
status: active
derived-from:
  - UC-PREPARE-VAT-RETURN-001
  - BR-VAT-SINGLE-ENTITY-001
  - BR-VAT-GENERIC-API-001
verification:
  - scenario: A draft return POSTed to the generic OpenRegister endpoint for VatReturn is stored with no Shillinq controller in the call path
  - scenario: A case-insensitive scan of all register schemas finds exactly one schema naming the periodic VAT declaration
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-vat-btw-filing/spec.md
  confidence: high
  recovered-from: documentation
---

## Requirement

The product MUST store periodic BTW declarations exclusively as the
`VatReturn` register (TERM-VAT-RETURN), declared with at least:
`administrationId`, `periodType`, `periodStart`, `periodEnd`, `rubrieken`,
`verschuldigdeOmzetbelasting`, `voorbelasting`, `teBetalenOfTeruggave`,
`state` (`draft|submitted|accepted|rejected|corrected`), `submittedAt`,
`acceptedAt`, `digipoortMessageId`, `attachmentUri`, `correctionOf` —
exposed through OpenRegister's generic CRUD surface with no per-app
controller and no imperative VAT calculation service.

## Rationale

REQ-VBTW-001/REQ-VBTW-002 at the recovered baseline: one canonical entity,
declarative behaviour, generic API ownership.

## Acceptance Scenarios

Creating, reading and submitting a return works through the generic
endpoint alone; no route under the Shillinq app namespace serves VAT
returns; schema field set matches the declared minimum.
