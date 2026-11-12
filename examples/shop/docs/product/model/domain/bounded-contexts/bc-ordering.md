---
id: BC-ORDERING
type: bounded-context
title: Ordering
status: active
---
## Responsibility

Catalogue, cart, checkout and the life of an order until delivery.

## Language

Orders, carts, products and deliveries.

## Boundaries

Money movement belongs to Payments.

## External Relationships

Payments authorises charges and issues refunds for orders placed here.
