---
id: CON-CARD-DATA
type: constraint
title: No stored card data
status: active
applies-to:
  - UC-PAY
uses-terms:
  - TERM-PAYMENT
---
## Constraint

The shop never stores payment card data; the payment service holds it.

## Rationale

Security and compliance: card data is handled only by the payment service.

## Consequences

Payment always goes through the payment service.
