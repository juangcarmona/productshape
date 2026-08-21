---
id: UC-PREPARE-VAT-RETURN-001
type: use-case
title: Prepare and submit a periodic VAT return
status: active
primary-actor: ACT-VAT-ADMINISTRATOR
bounded-context: BC-BOOKKEEPING
governed-by:
  - BR-VAT-SINGLE-ENTITY-001
  - BR-VAT-GENERIC-API-001
  - BR-ADMIN-MEMBERSHIP-001
  - BR-VAT-LINE-DERIVATION-001
  - BR-VAT-REGIME-001
uses-terms:
  - TERM-VAT-RETURN
  - TERM-VAT-LINE
  - TERM-VAT-REGIME
  - TERM-ADMINISTRATION
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-vat-btw-filing/spec.md
  confidence: high
  recovered-from: documentation
---

## Goal

The VAT administrator files a correct BTW return for one administration and
one period, derived from that administration's general ledger and
transmitted electronically to the Belastingdienst.

## Trigger

A BTW filing period of an administration the actor is a member of closes.

## Preconditions

The actor holds membership with the `vat-administrator` role in the
administration; GL postings for the period exist; the administration's VAT
regime (TERM-VAT-REGIME) is set for the period.

## Main Flow

1. The actor opens the period's draft VAT return for their administration.
2. The product derives the rubriek amounts from the period's VAT lines
   (TERM-VAT-LINE), themselves derived from GL postings on VAT-applicable
   accounts under the administration's regime (BR-VAT-LINE-DERIVATION-001,
   BR-VAT-REGIME-001, BR-VAT-GENERIC-API-001: declared calculations,
   generic API).
3. The actor reviews the amounts — drilling into the underlying VAT lines
   where needed — and corrects source postings if needed; lines and
   rubrieken are re-derived.
4. The actor submits the return; it transitions `draft → submitted`, and
   the product transmits it electronically to the Belastingdienst,
   recording the transmission reference on the return.
5. The Belastingdienst outcome moves it to `accepted`, `rejected` or, on a
   later correction, `corrected`.

## Alternative Flows

A correction after acceptance creates a new `VatReturn` in state `corrected`
referencing the superseded return (`correctionOf`). Under the `kor` regime
the period's filing follows the exemption's statutory obligations (open
question pending: nil return versus no return).

## Failure Conditions

A non-member reaching for the administration's return receives a masked 404
(BR-ADMIN-MEMBERSHIP-001). A submission with incomplete rubrieken is
rejected with the missing fields named. A failed electronic transmission
leaves the return auditable with its transmission attempt recorded, for the
actor to retry.

## Postconditions

Exactly one `VatReturn` records the filing for that administration and
period, with its rubriek amounts reconciling line-by-line to the general
ledger and its full lifecycle history — including the electronic
transmission reference and outcome — auditable.
