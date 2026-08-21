---
id: TERM-VAT-RETURN
type: domain-term
title: VAT Return
status: active
defined-in: BC-BOOKKEEPING
synonyms:
  - VatReturn
  - BTW-aangifte
  - omzetbelasting return
  - periodic VAT filing
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-vat-btw-filing/spec.md
  confidence: high
  recovered-from: documentation
---

## Definition

The single statutory declaration of BTW (omzetbelasting) owed or refundable
by one administration for one filing period (month or quarter), per
Wet OB 1968 art. 14/14a/17. It is one product entity: the `VatReturn`
register schema, whose lifecycle is
`draft → submitted → accepted | rejected | corrected`.

There is exactly one VAT return entity in the product. Any artifact, schema
or feature that models the periodic BTW declaration models THIS entity, under
this name, whatever spelling or language the request arrives in.

## Distinguish From

An ICP declaration (intra-community supplies), a suppletie (correction filing
is a `VatReturn` in state `corrected`, not a separate entity), and VAT lines
or rate tariffs that feed the return's rubrieken.

## Usage

Prepared from GL postings, reviewed by a vat-administrator, submitted to the
Belastingdienst, and retained as the audit record of the filing.
