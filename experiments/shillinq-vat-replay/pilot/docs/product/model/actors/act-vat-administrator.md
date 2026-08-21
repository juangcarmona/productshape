---
id: ACT-VAT-ADMINISTRATOR
type: actor
title: VAT Administrator
status: active
actor-kind: human
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-vat-btw-filing/spec.md
  confidence: high
  recovered-from: documentation
---

## Purpose

A member of an administration who is responsible for its periodic BTW
compliance: preparing, reviewing and submitting VAT returns.

## Goals

File correct VAT returns on time, with amounts that reconcile to the general
ledger, and keep the filing history auditable.

## Responsibilities

Reviews derived rubriek amounts, corrects source postings where needed,
submits the return, and records the Belastingdienst outcome.

## Boundaries

Acts only within administrations where they hold membership with the
`vat-administrator` role. Does not administer other tenants' books and does
not change statutory calculation rules.
