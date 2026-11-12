---
id: SB-CANCEL
type: structured-behaviour
title: Cancel after dispatch
status: active
illustrates:
  - BR-CANCEL
given:
  - An order has been dispatched
when: The customer tries to cancel it
then:
  - The cancellation is refused
  - The customer is offered the refund path
uses-terms:
  - TERM-ORDER
---
## Intent

Dispatch closes cancellation.

## Boundaries

None.
