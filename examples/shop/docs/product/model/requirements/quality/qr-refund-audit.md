---
id: QR-REFUND-AUDIT
type: quality-requirement
title: Auditable refunds
status: active
quality-attribute: auditability
applies-to:
  - UC-REQUEST-REFUND
  - UC-APPROVE-REFUND
verification:
  - scenario: Every approved refund can be traced to its request and approver.
uses-terms: []
---
## Requirement

Every refund decision MUST record who decided, when and against which request.

## Measurement

Share of refund decisions with a complete record, checked monthly; the threshold is 100%.
