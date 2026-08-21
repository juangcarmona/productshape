---
id: FR-VAT-REGIME-001
type: functional-requirement
title: Administrations carry a VAT regime that governs derivation
status: active
derived-from:
  - UC-PREPARE-VAT-RETURN-001
  - UC-REVIEW-VAT-POSITION-001
  - BR-VAT-REGIME-001
verification:
  - scenario: Every administration exposes exactly one VAT regime value, standard or kor, and derivation for a period uses the regime in force for that period
  - scenario: Under kor, domestic supplies within the exemption derive no collected VAT and purchases derive no reclaimable paid VAT
  - scenario: A transaction designated under the verleggingsregeling derives a reverse-charge line and is reported in the shifted rubriek, not as collected VAT at a rate
  - scenario: A regime change takes effect only from the next filing period; lines and returns of closed periods are unchanged
---

## Requirement

Every administration MUST carry exactly one VAT regime (TERM-VAT-REGIME):
`standard` or `kor`. Derivation of VAT lines and preparation of VAT returns
MUST apply the regime in force for the period being derived: `standard`
derives collected, paid and reverse-charge lines at the applicable rates;
`kor` applies the small-business exemption, deriving no charged VAT and no
reclaimable input VAT for supplies within it. Transactions designated under
the verleggingsregeling MUST be derived and reported as `reverse-charge` in
any regime. Regime changes MUST take effect only at a filing-period
boundary and MUST NOT alter closed periods.

## Rationale

The stakeholder requires support for the standard, KOR and reverse-charge
regime variants; BR-VAT-REGIME-001 makes the regime a statutory property of
the administration, and this requirement makes it observable and binding on
every derivation so historical filings stay explicable.

## Acceptance Scenarios

Two administrations with identical postings, one `standard` and one `kor`:
the standard one derives collected and paid lines and a payable position;
the kor one derives no charged VAT for exempt domestic supplies. Switching
the standard administration to kor mid-quarter leaves the current quarter
standard and applies kor from the next quarter.
