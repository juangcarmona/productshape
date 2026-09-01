---
id: JRN-PURCHASE-001
type: journey
title: Purchase a cart
status: active
primary-actor: ACT-SHOPPER
steps:
  - use-case: UC-CHECKOUT-001
---

## Intended Outcome

The shopper turns an assembled cart into a confirmed order.

## Entry Conditions

The shopper has at least one item in the cart.

## Journey Narrative

The shopper reviews the cart, checks out and receives a confirmation.

## Variants and Branches

An empty cart cannot enter checkout; the shopper returns to browsing.

## Completion Conditions

An order confirmation exists for the cart's content.
