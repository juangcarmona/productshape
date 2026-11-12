---
id: UC-TRACK-ORDER
type: use-case
title: Track an order
status: active
primary-actor: ACT-CUSTOMER
supporting-actors: []
governed-by: []
uses-terms:
  - TERM-ORDER
  - TERM-DELIVERY
bounded-context: BC-ORDERING
---
## Goal

The customer sees where an order is and when it will be delivered.

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
