---
id: UC-REQUEST-REFUND
type: use-case
title: Request a refund
status: active
primary-actor: ACT-CUSTOMER
supporting-actors: []
governed-by:
  - BR-REFUND-001
uses-terms:
  - TERM-REFUND
  - TERM-DELIVERY
bounded-context: BC-PAYMENTS
---
## Goal

The customer asks for money back for a delivered order.

## Trigger

The actor starts it from the shop.

## Preconditions

The actor is signed in.

## Main Flow

1. The actor asks for it.
2. The shop does it and shows the result.

## Alternative Flows

None.

## Failure Conditions

If the shop cannot complete it, nothing changes and the actor is told why.

## Postconditions

The outcome is visible to the actor.
