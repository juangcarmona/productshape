---
id: BR-PAYMENT
type: business-rule
title: Paid before confirmed
status: active
applies-to:
  - UC-CHECKOUT
  - UC-PAY
uses-terms:
  - TERM-ORDER
  - TERM-PAYMENT
---
## Rule

An order is confirmed only after its payment is authorised.

## Rationale

The shop must not ship what it has not been paid for.

## Examples

A declined card leaves the order unconfirmed.

## Exceptions

None.
