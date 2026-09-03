---
id: FR-CHECKOUT-001
type: functional-requirement
title: Checkout computes the total under the pricing rules
status: active
derived-from:
  - UC-CHECKOUT-001
verification:
  - id: S1
    scenario: A cart with one discounted item checks out at the listed price minus the discount
---

## Requirement

Checkout MUST compute the order total from the cart's items under the active pricing rules before payment is taken.

## Rationale

The total the shopper confirms must be the total the pricing rules produce, or confirmations are meaningless.
