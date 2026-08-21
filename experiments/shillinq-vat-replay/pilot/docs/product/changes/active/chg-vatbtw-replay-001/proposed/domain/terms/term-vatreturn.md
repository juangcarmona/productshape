---
id: TERM-VATRETURN
type: domain-term
title: VATReturn
status: active
defined-in: BC-BOOKKEEPING
synonyms:
  - VAT return
  - BTW return
---

## Definition

A Dutch VAT return for a fiscal period (quarter / month / year),
regime-typed (standard / KOR / reverse-charge) per Wet OB 1968. Tracks
`totalVATCollected` (sales / AR), `totalVATPaid` (purchases / AP deductible)
and the derived `vatBalance`. Fields: `administrationId`, `returnNumber`,
`period`, `periodYear`, `periodNumber`, `regime`, `startDate`, `endDate`,
`statusCode`, `submissionDate`, `verificationDate`, `filingReference`,
`totalTaxableAmount`, `totalVATCollected`, `totalVATPaid`, `vatBalance`,
`notes`. Operator-driven lifecycle
`draft → submitted → verified → filed`; once submitted, linked VATLine
records are immutable until the return is explicitly rebased to draft.

## Distinguish From

`VATDeclaration` (per-rubriek grouping within a return) and `VATLine`
(a single derived line from GL).

## Usage

Created from GL transactions in the period where `Account.vatApplicable` is
true; reviewed, submitted, verified and filed by the operator.
