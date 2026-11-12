---
id: UC-PAY
type: use-case
title: Pay for an order
status: active
primary-actor: ACT-CUSTOMER
supporting-actors:
  - ACT-PAYMENT-SERVICE
governed-by:
  - BR-PAYMENT
uses-terms:
  - TERM-PAYMENT
  - TERM-ORDER
bounded-context: BC-PAYMENTS
---
## Goal

The customer pays for an order.

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
