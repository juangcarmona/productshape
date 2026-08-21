---
id: BR-VAT-SINGLE-ENTITY-001
type: business-rule
title: One canonical VAT return entity
status: active
applies-to:
  - UC-PREPARE-VAT-RETURN-001
  - BC-BOOKKEEPING
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-vat-btw-filing/spec.md
  confidence: high
  recovered-from: documentation
---

## Rule

All statutory BTW filing state lives in the single `VatReturn` entity
(TERM-VAT-RETURN). No second schema, register, model or table may represent
the periodic VAT declaration, under any name, spelling or language variant.

## Rationale

A statutory filing must have one system of record. Two models of the same
declaration produce diverging amounts, diverging lifecycles and an
unauditable filing history (REQ-VBTW-001: "the `VatReturn` schema as the
canonical entity. No custom PHP model, no custom database table, no parallel
storage").

## Examples

Adding a suppletie feature extends `VatReturn` (state `corrected`); it does
not introduce a `Suppletie` entity. A Dutch-named request for "btw-aangifte"
resolves to `VatReturn`, not to a new `BtwAangifte` schema.

## Exceptions

None. A feature that genuinely needs a different filing entity (e.g. ICP
declaration) is a different term, not a variant of the VAT return.
