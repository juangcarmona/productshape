---
id: BR-CANCEL
type: business-rule
title: Cancel before dispatch
status: active
applies-to:
  - UC-CANCEL-ORDER
uses-terms:
  - TERM-ORDER
---
## Rule

An order can be cancelled only before it is dispatched.

## Rationale

After dispatch the order is in transit and the refund path applies.

## Examples

An order dispatched this morning cannot be cancelled this afternoon.

## Exceptions

None.
