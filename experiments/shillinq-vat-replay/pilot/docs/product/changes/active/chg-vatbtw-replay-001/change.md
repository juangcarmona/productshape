---
id: CHG-VATBTW-REPLAY-001
type: product-change
title: VAT/BTW filing capability (VATReturn, VATDeclaration, VATLine)
status: draft
base-revision: "fa992fb"
operations:
  add:
    - TERM-VATRETURN
    - UC-VATRETURN-FILING-001
    - FR-VATRETURN-REGISTERS-001
    - FR-VATRETURN-API-001
  modify: []
  remove: []
---

<!--
ARM 1 TRANSCRIPTION NOTE (experiment metadata, not part of the replayed
content): this change is a mechanical transcription of the product-visible
deltas of Shillinq OpenSpec change 2026-06-14-bookkeeping-vat-btw-filing
(proposal.md summary/why; tasks.md backend section), performed WITHOUT
product judgment, to measure what the deterministic gate alone reports.
-->

## Problem

VAT compliance is mandatory for Dutch registered businesses. Belastingdienst
requires quarterly (or monthly) electronic filing. The current bookkeeping
foundation (T1/T2) has no VAT return workflow; operators must export GL data
and manually prepare returns in external tax software, creating
reconciliation gaps, lost audit trail, compliance risk and duplicated data
entry.

## Intended Product Outcome

Introduce the VAT/BTW filing capability: prepare and submit VAT returns,
track collected VAT (sales/AR) and paid VAT (purchases/AP) by period,
generate VAT reports by type, and support regime variants (standard, KOR,
reverse charge). The capability declares the `VATReturn`, `VATDeclaration`
and `VATLine` registers, the VAT-return lifecycle
`draft → submitted → verified → filed`, and VAT reconciliation aggregations,
served by dedicated VAT return endpoints backed by `VATReturnService`.

## Rationale

VAT is derived from GL transactions marked `vatApplicable: true`; returns
are generated automatically; operators review and submit electronically.
VAT/BTW is a top-5 customer-requested capability alongside accounts payable
and general ledger.

## Affected Product Areas

Bookkeeping: adds the VAT return entity and its filing workflow, VAT
declarations and VAT lines, and the VAT return preparation API.

## Open Questions

None.

## Product Acceptance

An operator can create a draft VAT return for a period, see derived VAT
lines grouped by rate and type, submit the return, and rebase a submitted
return back to draft.

## Out of Scope

Electronic transmission to Digipoort; OSS/EU one-stop-shop scheme; ICP
declaration; UK MTD.
