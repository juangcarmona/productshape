---
id: UC-REVIEW-VAT-POSITION-001
type: use-case
title: Review the VAT position of a period
status: active
primary-actor: ACT-VAT-ADMINISTRATOR
bounded-context: BC-BOOKKEEPING
governed-by:
  - BR-VAT-LINE-DERIVATION-001
  - BR-VAT-REGIME-001
  - BR-ADMIN-MEMBERSHIP-001
uses-terms:
  - TERM-VAT-LINE
  - TERM-VAT-REGIME
  - TERM-VAT-RETURN
  - TERM-ADMINISTRATION
---

## Goal

The VAT administrator sees, at any point during or after a filing period,
how much VAT their administration has collected (sales/AR), paid
(purchases/AP) and shifted under reverse charge, with every amount
traceable to general-ledger transactions.

## Trigger

The actor opens the VAT position of a filing period of an administration
they are a member of — routinely during the period, or while preparing the
period's return.

## Preconditions

The actor holds membership with the `vat-administrator` role in the
administration; general-ledger postings exist; the administration's VAT
regime (TERM-VAT-REGIME) is set.

## Main Flow

1. The actor selects an administration and a filing period.
2. The product presents the period's derived VAT lines
   (BR-VAT-LINE-DERIVATION-001), each traceable to its GL transaction.
3. The product presents the VAT report for the period: totals by VAT type —
   collected, paid, reverse charge — and the resulting net position,
   consistent with the administration's regime (BR-VAT-REGIME-001).
4. The actor drills from any total to its lines and from any line to its
   source transaction.
5. Where a source posting is wrong, the actor corrects it in the general
   ledger; the affected lines and totals are re-derived.

## Alternative Flows

For a closed period whose return is already filed, the review is read-only
against the lines as they stood at filing. Under the `kor` regime the
report shows the exemption position rather than a payable/receivable
position.

## Failure Conditions

A non-member requesting an administration's VAT position receives a masked
404 (BR-ADMIN-MEMBERSHIP-001). A period with no VAT-applicable transactions
yields an empty report, not an error.

## Postconditions

The actor knows the administration's VAT position by type for the period;
no bookkeeping state has changed unless the actor corrected source
postings, in which case lines and totals reflect the re-derivation.
