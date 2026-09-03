---
id: SB-DISCOUNT-STACKING
type: structured-behaviour
title: Stacked discounts never price an item below zero
status: active
illustrates:
  - BR-PRICING-001
uses-terms:
  - TERM-CART
given:
  - A cart holds an item listed at 5 euro
  - Two promotions of 3 euro each apply to that item
when: The shopper checks out the cart
then:
  - The item's price in the total is 0 euro, never negative
---

## Intent

Make the floor of discount stacking observable: several discounts may empty an item's price, never invert it.

## Boundaries

This example does not fix rounding rules or the order in which discounts are listed on the receipt.
