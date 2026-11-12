---
id: JRN-REFUND
type: journey
title: Get money back
status: active
primary-actor: ACT-CUSTOMER
steps:
  - use-case: UC-VIEW-ORDER-HISTORY
  - use-case: UC-REQUEST-REFUND
  - use-case: UC-APPROVE-REFUND
---
## Intended Outcome

The customer gets money back for a delivered order.

## Entry Conditions

The order has been delivered.

## Journey Narrative

The customer finds the order, requests a refund and support approves it.

## Variants and Branches

Support may reject the request.

## Completion Conditions

The money is returned or the customer knows why not.
