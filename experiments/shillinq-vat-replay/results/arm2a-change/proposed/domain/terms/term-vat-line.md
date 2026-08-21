---
id: TERM-VAT-LINE
type: domain-term
title: VAT Line
status: active
defined-in: BC-BOOKKEEPING
synonyms:
  - VatLine
  - BTW-regel
  - VAT transaction line
---

## Definition

A single derived record of the VAT effect of one general-ledger transaction
in one administration: the transaction reference, the VAT-applicable account,
the taxable base, the VAT amount, the applicable rate, the filing period it
falls in, and its VAT type — `collected` (VAT charged on sales/AR), `paid`
(input VAT on purchases/AP) or `reverse-charge` (VAT shifted under the
verleggingsregeling). VAT lines are derived from the general ledger, never
hand-authored; the lines of a period feed the rubrieken of that period's VAT
return.

## Distinguish From

The VAT Return (TERM-VAT-RETURN), which is the periodic statutory
declaration the lines aggregate into; a general-ledger posting, which is the
source record a line is derived from and carries no filing classification;
and a VAT rate tariff, which is configuration, not a transaction record.

## Usage

Accumulated through the filing period as postings arrive, reviewed by the
VAT administrator to track collected versus paid VAT, aggregated into the
period's VAT report by type, and rolled up into the rubrieken of the
period's VAT return, giving every rubriek amount a line-by-line audit trail
back to the general ledger.
