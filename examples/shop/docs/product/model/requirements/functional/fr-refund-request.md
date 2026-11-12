---
id: FR-REFUND-REQUEST
type: functional-requirement
title: Accept refund requests in the window
status: active
derived-from:
  - UC-REQUEST-REFUND
  - BR-REFUND-001
verification:
  - scenario: A request inside the window is accepted; one outside it is rejected.
uses-terms:
  - TERM-REFUND
  - TERM-DELIVERY
---
## Requirement

The product MUST accept a refund request only within the refund window counted from delivery.

## Rationale

Follows the refund window rule.
