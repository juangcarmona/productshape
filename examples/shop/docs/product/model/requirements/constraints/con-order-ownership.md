---
id: CON-ORDER-OWNERSHIP
type: constraint
title: Only the owner acts on an order
status: active
applies-to:
  - UC-REQUEST-REFUND
  - UC-CANCEL-ORDER
  - UC-TRACK-ORDER
  - UC-VIEW-ORDER-HISTORY
uses-terms:
  - TERM-ORDER
---
## Constraint

Only the customer who placed an order may see it, cancel it or request its refund.

## Rationale

Security: orders contain personal data and money.

## Consequences

Every order operation must check the requester is the order owner.
