---
id: JRN-BTW-COMPLIANCE-001
type: journey
title: Quarterly BTW compliance
status: active
primary-actor: ACT-VAT-ADMINISTRATOR
steps:
  - use-case: UC-REVIEW-VAT-POSITION-001
  - use-case: UC-PREPARE-VAT-RETURN-001
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-vat-btw-filing/spec.md
  confidence: high
  recovered-from: documentation
---

## Intended Outcome

Every filing period of the administration ends with an accepted VAT return
whose amounts reconcile line-by-line to the general ledger, with the
administration's VAT position visible throughout the period rather than
only at filing time.

## Entry Conditions

The administration is configured for monthly or quarterly BTW filing under
its VAT regime (standard, KOR, or with reverse-charge treatment where
applicable) and the actor is one of its members.

## Journey Narrative

Through the period, bookkeeping postings accumulate VAT-relevant amounts,
which the product derives into VAT lines by type — collected, paid, reverse
charge. The administrator reviews the running VAT position and its report
whenever needed (UC-REVIEW-VAT-POSITION-001), correcting source postings
early. When the period closes, the administrator prepares the return from
the derived lines (UC-PREPARE-VAT-RETURN-001), submits it for electronic
transmission to the Belastingdienst, and tracks the outcome until
acceptance — or files a correction.

## Variants and Branches

Rejection leads to correction of source postings, re-derivation and
resubmission; a post-acceptance discovery leads to a `corrected` return
(suppletie). Under the KOR regime the period's review shows the exemption
position and the filing step follows the exemption's statutory obligations.

## Completion Conditions

The period's return is in state `accepted` (or superseded by an accepted
correction) and retained as the audit record, together with the VAT lines
that substantiate its amounts.
