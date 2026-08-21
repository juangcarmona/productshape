---
id: UC-VATRETURN-FILING-001
type: use-case
title: Prepare, submit and file a VAT return
status: active
primary-actor: ACT-VAT-ADMINISTRATOR
bounded-context: BC-BOOKKEEPING
uses-terms:
  - TERM-VATRETURN
---

## Goal

The operator prepares a VAT return for a period, reviews the derived VAT
lines, submits it, and records verification and filing.

## Trigger

A filing period ends, or the operator starts return preparation manually.

## Preconditions

GL transactions exist for the period with `Account.vatApplicable` set.

## Main Flow

1. The operator creates a return for a period (POST `/api/vat-returns`).
2. `VATReturnService::createReturn()` derives VAT lines from GL and groups
   them into declarations.
3. The operator reviews lines and declarations.
4. The operator submits the return (POST `/api/vat-returns/{id}/submit`);
   lines become immutable.
5. The return is verified and then filed with the tax authority reference.

## Alternative Flows

A submitted return is rebased back to draft
(POST `/api/vat-returns/{id}/rebase`); lines are deleted and re-derived.

## Failure Conditions

Submission with totals below zero is rejected; a non-draft return cannot be
deleted.

## Postconditions

The return holds `statusCode`, totals and the filing reference; the audit
trail records each transition.
