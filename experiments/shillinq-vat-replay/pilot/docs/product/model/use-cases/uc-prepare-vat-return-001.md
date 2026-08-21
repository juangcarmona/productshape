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
uses-terms:
  - TERM-VAT-RETURN
  - TERM-ADMINISTRATION
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-vat-btw-filing/spec.md
  confidence: high
  recovered-from: documentation
---

## Goal

The VAT administrator files a correct BTW return for one administration and
one period, derived from that administration's general ledger.

## Trigger

A BTW filing period of an administration the actor is a member of closes.

## Preconditions

The actor holds membership with the `vat-administrator` role in the
administration; GL postings for the period exist.

## Main Flow

1. The actor opens the period's draft VAT return for their administration.
2. The product derives the rubriek amounts from GL postings
   (BR-VAT-GENERIC-API-001: declared calculations, generic API).
3. The actor reviews the amounts and corrects source postings if needed.
4. The actor submits the return; it transitions `draft → submitted`.
5. The Belastingdienst outcome moves it to `accepted`, `rejected` or, on a
   later correction, `corrected`.

## Alternative Flows

A correction after acceptance creates a new `VatReturn` in state `corrected`
referencing the superseded return (`correctionOf`).

## Failure Conditions

A non-member reaching for the administration's return receives a masked 404
(BR-ADMIN-MEMBERSHIP-001). A submission with incomplete rubrieken is
rejected with the missing fields named.

## Postconditions

Exactly one `VatReturn` records the filing for that administration and
period, with its full lifecycle history auditable.
