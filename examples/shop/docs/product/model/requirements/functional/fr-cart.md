---
id: FR-CART
type: functional-requirement
title: Keep the cart
status: active
derived-from:
  - UC-ADD-TO-CART
verification:
  - scenario: A product added to the cart is still there at checkout.
uses-terms:
  - TERM-CART
---
## Requirement

The product MUST keep the products a customer adds to the cart until checkout or removal.

## Rationale

Customers build a purchase over several visits.
