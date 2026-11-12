---
id: FR-CHECKOUT
type: functional-requirement
title: Confirm paid orders
status: active
derived-from:
  - UC-CHECKOUT
  - BR-PAYMENT
verification:
  - scenario: An order with an authorised payment is confirmed; one without is not.
uses-terms:
  - TERM-ORDER
---
## Requirement

The product MUST confirm an order only when its payment is authorised.

## Rationale

Follows the payment rule.
