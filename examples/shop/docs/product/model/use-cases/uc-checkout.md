---
id: UC-CHECKOUT
type: use-case
title: Check out
status: active
primary-actor: ACT-CUSTOMER
supporting-actors: []
governed-by:
  - BR-PAYMENT
uses-terms:
  - TERM-CART
  - TERM-ORDER
bounded-context: BC-ORDERING
---
## Goal

The customer turns a cart into an order.

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
