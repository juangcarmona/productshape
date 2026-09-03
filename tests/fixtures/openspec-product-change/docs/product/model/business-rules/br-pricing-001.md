---
id: BR-PRICING-001
type: business-rule
title: Discounts apply to the listed price only
status: active
applies-to:
  - UC-CHECKOUT-001
uses-terms:
  - TERM-CART
---

## Rule

A discount MUST be computed against an item's listed price, and applying several discounts to one item MUST never price it below zero.

## Rationale

Discount arithmetic against already-discounted prices compounds unpredictably and produces totals nobody set.

## Examples

- A 10 percent voucher on a 20 euro item prices it at 18 euro, even when a 5 euro promotion also applies.

## Exceptions

None.
