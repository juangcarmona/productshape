---
id: UC-VIEW-ORDER-HISTORY
type: use-case
title: View order history
status: active
primary-actor: ACT-CUSTOMER
supporting-actors: []
governed-by: []
uses-terms:
  - TERM-ORDER
bounded-context: BC-ORDERING
---
## Goal

The customer sees past orders and their state.

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
