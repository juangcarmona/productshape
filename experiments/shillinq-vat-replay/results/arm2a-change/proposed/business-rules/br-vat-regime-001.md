---
id: BR-VAT-REGIME-001
type: business-rule
title: VAT derivation honours the administration's VAT regime
status: active
applies-to:
  - BC-BOOKKEEPING
  - UC-PREPARE-VAT-RETURN-001
  - UC-REVIEW-VAT-POSITION-001
---

## Rule

Every administration MUST carry exactly one VAT regime (TERM-VAT-REGIME):
`standard` or `kor`, with reverse-charge (verleggingsregeling) treatment
applied per transaction where the law designates it. Derivation of VAT
lines and preparation of VAT returns MUST honour the regime in force for
the period being derived: under `standard`, lines are classified
`collected`, `paid` or `reverse-charge` and aggregate into the return's
rubrieken; under `kor`, no VAT is charged or reclaimed for domestic
supplies within the exemption. A regime change MUST take effect only at a
filing-period boundary and MUST NOT rewrite lines or returns of closed
periods.

## Rationale

Standard, KOR and reverse charge are statutory arrangements of Wet OB 1968,
not presentation options. Deriving a period under the wrong regime produces
a materially false statutory filing. Anchoring the regime to the
administration and to period boundaries keeps every historical return
explicable by the regime that governed its period.

## Examples

A ZZP administration under `kor` records sales without charging BTW and its
purchase VAT produces no reclaimable `paid` position within the exemption.
A construction subcontractor under `standard` posts an invoice under the
verleggingsregeling: the line is classified `reverse-charge` and reported
in the shifted rubriek rather than as `collected` at a rate.

## Exceptions

Statutory situations where KOR obligations still arise (for example
reverse-charge acquisitions that remain reportable under KOR) follow the
law; the open questions on KOR filing behaviour must be resolved before
this rule is approved.
