---
id: FR-CANCEL
type: functional-requirement
title: Cancel undispatched orders
status: active
derived-from:
  - UC-CANCEL-ORDER
  - BR-CANCEL
verification:
  - scenario: An undispatched order can be cancelled; a dispatched one cannot.
uses-terms:
  - TERM-ORDER
---
## Requirement

The product MUST let a customer cancel an order that has not been dispatched.

## Rationale

Follows the cancellation rule.
