---
id: FR-ORDER-TRACKING
type: functional-requirement
title: Show the order state
status: active
derived-from:
  - UC-TRACK-ORDER
verification:
  - scenario: A dispatched order shows as dispatched with an expected delivery date.
uses-terms:
  - TERM-ORDER
  - TERM-DELIVERY
---
## Requirement

The product MUST show each order state and the expected delivery date.

## Rationale

Customers want to know when it arrives.
