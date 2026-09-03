---
id: UC-CHECKOUT-001
type: use-case
title: Check out the cart
status: active
primary-actor: ACT-SHOPPER
bounded-context: BC-SALES
governed-by:
  - BR-PRICING-001
uses-terms:
  - TERM-CART
---

## Goal

Convert the shopper's cart into a confirmed order at the correct price.

## Trigger

The shopper starts checkout from a non-empty cart.

## Preconditions

The cart holds at least one purchasable item.

## Main Flow

The shopper confirms the cart, the total price is computed under the pricing rules, payment is taken and the order is confirmed.

## Alternative Flows

The shopper edits the cart during checkout and the total is recomputed before payment.

## Failure Conditions

Payment is declined and no order is created.

## Postconditions

A confirmed order exists and the cart is empty.
