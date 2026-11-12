---
id: UC-APPROVE-REFUND
type: use-case
title: Approve a refund
status: active
primary-actor: ACT-SUPPORT-AGENT
supporting-actors:
  - ACT-PAYMENT-SERVICE
governed-by:
  - BR-REFUND-001
uses-terms:
  - TERM-REFUND
bounded-context: BC-PAYMENTS
---
## Goal

A support agent approves a refund request and the money is returned.

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
