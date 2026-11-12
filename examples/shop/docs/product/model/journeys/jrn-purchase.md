---
id: JRN-PURCHASE
type: journey
title: Buy products
status: active
primary-actor: ACT-CUSTOMER
steps:
  - use-case: UC-BROWSE-CATALOG
  - use-case: UC-SEARCH-PRODUCTS
  - use-case: UC-ADD-TO-CART
  - use-case: UC-CHECKOUT
  - use-case: UC-PAY
---
## Intended Outcome

The customer receives a confirmed, paid order.

## Entry Conditions

The customer wants something the shop sells.

## Journey Narrative

The customer finds products, adds them to the cart, checks out and pays.

## Variants and Branches

The customer may search instead of browsing.

## Completion Conditions

The order is confirmed and paid.
