---
id: SB-REFUND-002
type: structured-behaviour
title: Refund one day late
status: active
illustrates:
  - BR-REFUND-001
given:
  - An order was delivered on March 1
when: The customer requests a refund on April 1
then:
  - The request is rejected
  - The customer is told the window has closed
uses-terms:
  - TERM-REFUND
  - TERM-DELIVERY
---
## Intent

The day after the window is outside it.

## Boundaries

None.
