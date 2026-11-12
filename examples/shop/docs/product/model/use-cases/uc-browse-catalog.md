---
id: UC-BROWSE-CATALOG
type: use-case
title: Browse the catalogue
status: active
primary-actor: ACT-CUSTOMER
supporting-actors: []
governed-by: []
uses-terms: []
bounded-context: BC-ORDERING
---
## Goal

The customer looks through the products on sale.

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
