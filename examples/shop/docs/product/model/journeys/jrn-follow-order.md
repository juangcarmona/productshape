---
id: JRN-FOLLOW-ORDER
type: journey
title: Follow an order
status: active
primary-actor: ACT-CUSTOMER
steps:
  - use-case: UC-TRACK-ORDER
  - use-case: UC-CANCEL-ORDER
---
## Intended Outcome

The customer knows where the order is, or cancels it in time.

## Entry Conditions

The customer has an order.

## Journey Narrative

The customer tracks the order and may cancel it before dispatch.

## Variants and Branches

Most customers only track.

## Completion Conditions

The customer knows the order state.
