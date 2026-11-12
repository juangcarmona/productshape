---
id: UC-SEARCH-PRODUCTS
type: use-case
title: Search products
status: active
primary-actor: ACT-CUSTOMER
supporting-actors: []
governed-by: []
uses-terms: []
bounded-context: BC-ORDERING
---
## Goal

The customer finds products by name or category.

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
