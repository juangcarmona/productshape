---
id: SB-REFUND-001
type: structured-behaviour
title: Refund on the last day
status: active
illustrates:
  - BR-REFUND-001
given:
  - An order was delivered on March 1
when: The customer requests a refund on March 31
then:
  - The request is accepted
uses-terms:
  - TERM-REFUND
  - TERM-DELIVERY
---
## Intent

The last day of the window is inside the window.

## Boundaries

None.
