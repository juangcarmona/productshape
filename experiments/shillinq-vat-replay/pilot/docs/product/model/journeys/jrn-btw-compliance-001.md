---
id: JRN-BTW-COMPLIANCE-001
type: journey
title: Quarterly BTW compliance
status: active
primary-actor: ACT-VAT-ADMINISTRATOR
steps:
  - use-case: UC-PREPARE-VAT-RETURN-001
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-vat-btw-filing/spec.md
  confidence: high
  recovered-from: documentation
---

## Intended Outcome

Every filing period of the administration ends with an accepted VAT return
whose amounts reconcile to the general ledger.

## Entry Conditions

The administration is configured for monthly or quarterly BTW filing and the
actor is one of its members.

## Journey Narrative

Through the period, bookkeeping postings accumulate VAT-relevant amounts.
When the period closes, the administrator prepares the return
(UC-PREPARE-VAT-RETURN-001), submits it, and tracks the Belastingdienst
outcome until acceptance — or files a correction.

## Variants and Branches

Rejection leads to correction of source postings and resubmission; a
post-acceptance discovery leads to a `corrected` return (suppletie).

## Completion Conditions

The period's return is in state `accepted` (or superseded by an accepted
correction) and retained as the audit record.
