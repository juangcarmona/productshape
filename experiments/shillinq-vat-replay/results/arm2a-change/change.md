---
id: CHG-VAT-FILING-CAPABILITY-001
type: product-change
title: VAT/BTW filing capability - period tracking, typed reporting, regime variants and electronic submission
status: draft
base-revision: '47511e9'
operations:
  add:
    - TERM-VAT-LINE
    - TERM-VAT-REGIME
    - BR-VAT-LINE-DERIVATION-001
    - BR-VAT-REGIME-001
    - UC-REVIEW-VAT-POSITION-001
    - FR-VAT-LINES-001
    - FR-VAT-REPORT-001
    - FR-VAT-REGIME-001
    - FR-VAT-ESUBMIT-001
  modify:
    - UC-PREPARE-VAT-RETURN-001
    - JRN-BTW-COMPLIANCE-001
  remove: []
---

## Problem

The Product Definition covers preparing and submitting a periodic BTW return
(UC-PREPARE-VAT-RETURN-001) but says nothing about how the VAT amounts that
feed the return are tracked through the period. Operators of Dutch
administrations (SMB, ZZP, government entities) cannot see collected VAT
(sales/AR) versus paid VAT (purchases/AP) per period, cannot produce a VAT
report broken down by type (collected, paid, reverse charge), and the
definition is silent on VAT regime variants (standard, small-business
exemption/KOR, reverse charge). Electronic submission to the Belastingdienst
is named only as a future capability (BR-VAT-GENERIC-API-001, Exceptions).
As a result, operators today export general-ledger data and prepare returns
in external tax software, losing the audit trail between the ledger and the
filed return. VAT is a top-5 customer-requested capability.

## Intended Product Outcome

Once accepted, the Product Definition states that:

- Per-transaction VAT lines (TERM-VAT-LINE) are derived from general-ledger
  transactions whose account is VAT-applicable, classified as collected,
  paid or reverse charge, and scoped to one administration and one filing
  period (BR-VAT-LINE-DERIVATION-001, FR-VAT-LINES-001). VAT lines feed the
  return's rubrieken; they are derived records, never hand-authored, so the
  chain GL transaction → VAT line → return rubriek is auditable end to end.
- The VAT administrator can review the administration's VAT position during
  and after a period, including a VAT report by type — collected, paid,
  reverse charge (UC-REVIEW-VAT-POSITION-001, FR-VAT-REPORT-001).
- Each administration operates under exactly one VAT regime
  (TERM-VAT-REGIME): standard, small-business exemption (KOR) or with
  reverse-charge treatment where the verleggingsregeling applies, and
  derivation of lines and returns honours that regime (BR-VAT-REGIME-001,
  FR-VAT-REGIME-001).
- Submitting a return transmits it electronically to the Belastingdienst
  and records the transmission reference and outcome on the return
  (FR-VAT-ESUBMIT-001), so the filing history is auditable inside the
  product instead of in external tax software.
- The existing single `VatReturn` entity, its recovered lifecycle
  (`draft → submitted → accepted | rejected | corrected`) and the
  generic-API ownership rules remain in force; the new capability is
  expressed within them, not beside them.

## Rationale

VAT is a top-5 customer-requested capability and the current workaround
(export GL data, prepare the return in external tax software) destroys the
audit trail that the bookkeeping context exists to preserve. The baseline
already fixes the system of record (BR-VAT-SINGLE-ENTITY-001) and the API
ownership (BR-VAT-GENERIC-API-001); this change adds the missing product
substance — period tracking, typed reporting, regime variants, electronic
submission — as declarative behaviour of the existing model rather than as
a parallel structure. Where the stakeholder's requested shape (a second
`VATDeclaration` register, dedicated `/api/vat-returns` endpoints served by
a `VATReturnController`/`VATReturnService`, a `draft → submitted →
verified → filed` lifecycle) conflicts with the recovered baseline rules,
the conflict is surfaced under Open Questions instead of being decided
here.

## Affected Product Areas

- Bookkeeping (NL statutory) bounded context: new domain terms VAT Line and
  VAT Regime alongside VAT Return and Administration.
- The quarterly BTW compliance journey: gains an in-period review step
  before preparation and submission.
- VAT return preparation and submission: now explicitly fed by derived VAT
  lines, governed by the administration's VAT regime, and completed by
  electronic transmission to the Belastingdienst.
- VAT reporting: a new report of VAT by type (collected, paid, reverse
  charge) per period.
- Access control: all new records and reports remain bound to
  administration membership (BR-ADMIN-MEMBERSHIP-001).

## Open Questions

- The request asks for three registers — `VATReturn`, `VATDeclaration` and
  `VATLine` — but BR-VAT-SINGLE-ENTITY-001 forbids a second entity that
  represents the periodic VAT declaration under any name. What does
  `VATDeclaration` represent that `VatReturn` does not (for example, the
  transmitted submission message as a distinct record)? Should it be
  dropped, folded into `VatReturn`, or defined as a genuinely different
  statutory artifact — and if the latter, should BR-VAT-SINGLE-ENTITY-001
  be revisited?
- The request asks for REST endpoints under `/api/vat-returns` implemented
  by a `VATReturnController` backed by a `VATReturnService`, plus
  per-return declaration and line listing endpoints. BR-VAT-GENERIC-API-001
  and FR-VAT-STORE-001 forbid per-app controllers, custom VAT HTTP
  endpoints and imperative VAT calculation services. Is a dedicated API
  surface an actual product need (e.g. for external integrators), or is
  the generic OpenRegister surface acceptable? If dedicated endpoints are
  required, BR-VAT-GENERIC-API-001 must be explicitly revised by a human
  product decision first.
- The request names a return lifecycle `draft → submitted → verified →
  filed`; the baseline (TERM-VAT-RETURN, FR-VAT-STORE-001,
  UC-PREPARE-VAT-RETURN-001) fixes `draft → submitted → accepted |
  rejected | corrected`. Do `verified` and `filed` map onto the existing
  states (e.g. verified ≈ accepted), or is a lifecycle change intended —
  and if so, what happens to `rejected` and to the `corrected` suppletie
  flow that depends on it?
- What is the requested `rebase` action on a VAT return meant to do? If it
  means "re-derive the return's lines and rubrieken from the current
  general ledger while in draft", is it restricted to drafts, and how does
  it relate to the existing correction flow (`corrected` returns) after
  submission?
- Under the small-business exemption (KOR) the administration charges no
  VAT and reclaims no input VAT. Should a KOR administration file nil
  returns, be exempted from filing periods entirely, or keep derived lines
  for audit while producing no return?
- Which electronic submission channel is intended — direct SBR/Digipoort,
  or via an intermediary/PKIoverheid service? BR-VAT-GENERIC-API-001 states
  Digipoort integration "requires its own product decision"; does approval
  of this change constitute that decision?
- The request lists update and delete among the return endpoints. Should a
  VAT return be deletable at all, and if so only in `draft` — given that a
  submitted return is a statutory audit record?
- Government entities are named as a target segment. Do they need distinct
  treatment (e.g. BTW-compensatiefonds declarations), or are they in scope
  only as ordinary administrations?
- May a VAT administrator override or exclude an individual derived VAT
  line, or are corrections made exclusively in the source GL postings with
  re-derivation, as the baseline flow implies?

## Product Acceptance

A human recognises the intended outcome when the accepted definition:

- defines VAT Line and VAT Regime as terms of the Bookkeeping context,
  distinguished from the VAT Return;
- contains a use case in which the VAT administrator reviews collected,
  paid and reverse-charge VAT for a period of their administration, and a
  requirement for a VAT report by those types;
- requires VAT lines to be derived only from GL transactions on
  VAT-applicable accounts, traceable line-by-line to their source
  transactions;
- requires each administration to carry exactly one VAT regime (standard,
  KOR, reverse charge treatment) that governs derivation;
- requires submission of a return to transmit it electronically to the
  Belastingdienst and to record the transmission reference and outcome;
- still contains exactly one VAT return entity with the baseline
  lifecycle, and no artifact contradicting BR-VAT-SINGLE-ENTITY-001 or
  BR-VAT-GENERIC-API-001.

## Out of Scope

- Implementation and technical design: controllers, services, routes,
  schema files, register configuration, Digipoort connectivity, message
  formats (XBRL/SBR), and any naming of code-level components. The
  requested `VATReturnController`/`VATReturnService` and `/api/vat-returns`
  route shape are implementation proposals, not product definition, and
  are additionally in tension with BR-VAT-GENERIC-API-001 (see Open
  Questions).
- Changing the VAT return lifecycle or replacing the single `VatReturn`
  entity (pending the open questions above).
- ICP declarations (intra-community supplies) and the BTW-compensatiefonds.
- Payroll taxes and non-NL VAT jurisdictions.
- Delivery, verification, release and deployment state.
