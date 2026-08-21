---
id: FR-VATRETURN-REGISTERS-001
type: functional-requirement
title: Declare the VATReturn, VATDeclaration and VATLine registers
status: active
derived-from:
  - UC-VATRETURN-FILING-001
verification:
  - scenario: The three registers validate and load with lifecycle and aggregations declared
---

## Requirement

The product MUST declare three registers: `VATReturn` (return period,
status, submission date, tax authority reference, amounts), `VATDeclaration`
(per-rubriek grouping) and `VATLine` (single derived line from GL), with the
VAT-return lifecycle `draft → submitted → verified → filed` and VAT
reconciliation aggregations (sum VAT from GL by rate and type).

## Rationale

VAT is derived declaratively from GL transactions; returns are generated
automatically for operator review.

## Acceptance Scenarios

Register validation passes with the three schemas declared; a return's
totals equal the sum of its lines by rate and type.
