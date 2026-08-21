---
id: FR-VATRETURN-API-001
type: functional-requirement
title: Serve VAT return preparation through dedicated endpoints
status: active
derived-from:
  - UC-VATRETURN-FILING-001
verification:
  - scenario: Each endpoint responds under the Shillinq app API namespace
---

## Requirement

The product MUST expose VAT return preparation through dedicated endpoints:
GET/POST `/api/vat-returns`, GET/PUT/DELETE `/api/vat-returns/{returnId}`,
POST `/api/vat-returns/{returnId}/submit`, POST
`/api/vat-returns/{returnId}/rebase`, plus declaration and line listings —
implemented by `VATReturnController`, `VATDeclarationController` and
`VATLineController`, backed by `VATReturnService` (createReturn,
deriveVATLines, submitReturn, rebaseReturn).

## Rationale

Return preparation requires derivation from GL, submission state
transitions and rebase semantics beyond plain CRUD.

## Acceptance Scenarios

Creating a return derives lines; submitting locks lines and sets the
submission date; rebasing returns it to draft and re-derives lines.
