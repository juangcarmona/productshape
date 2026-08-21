---
id: FR-VAT-REPORT-001
type: functional-requirement
title: VAT report by type per filing period
status: active
derived-from:
  - UC-REVIEW-VAT-POSITION-001
verification:
  - scenario: For a period with collected, paid and reverse-charge lines, the report shows one total per VAT type and a net position equal to the aggregation of the period's lines
  - scenario: The report's totals equal the corresponding rubriek amounts of the period's draft return whenever one exists
  - scenario: A period without VAT-applicable transactions produces an empty report with zero totals, not an error
  - scenario: A non-member requesting the report receives a masked 404
---

## Requirement

The product MUST provide, for one administration and one filing period, a
VAT report aggregating the period's derived VAT lines by VAT type —
`collected`, `paid` and `reverse-charge` — with a total per type and the
resulting net position, available at any time during or after the period.
Every reported total MUST be decomposable into the lines it aggregates.
The report MUST agree with the rubriek amounts of the period's VAT return,
since both are aggregations of the same lines. Access is bound to
administration membership.

## Rationale

The stakeholder's operators need to see VAT by type (paid, collected,
reverse charge) without exporting GL data to external tools. Defining the
report as an aggregation of the same derived lines that feed the return
guarantees the report and the filing can never disagree.

## Acceptance Scenarios

Given a period with two `collected` lines (210 + 42), one `paid` line (63)
and one `reverse-charge` line, the report shows collected 252, paid 63, the
reverse-charge total, and a net position of 189 plus the reverse-charge
effect; drilling into collected lists exactly the two source lines.
