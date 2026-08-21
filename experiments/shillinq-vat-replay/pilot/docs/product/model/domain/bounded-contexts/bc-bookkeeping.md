---
id: BC-BOOKKEEPING
type: bounded-context
title: Bookkeeping (NL statutory)
status: active
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-vat-btw-filing/spec.md
  confidence: high
  recovered-from: documentation
---

## Responsibility

Dutch statutory bookkeeping for administrations managed in Shillinq: general
ledger, periodic statutory filings (BTW/omzetbelasting), and the compliance
workflows around them.

## Language

Inside this context, statutory terms carry their Wet OB 1968 meaning. The
periodic VAT declaration is the VAT Return (TERM-VAT-RETURN); the tenant is
the Administration (TERM-ADMINISTRATION).

## Boundaries

Excludes payroll, procurement and booking/reservation contexts; excludes the
tax authority's own processing of a submitted filing.

## External Relationships

Consumes the OpenRegister object store for persistence; produces filings for
the Belastingdienst via SBR/Digipoort.
