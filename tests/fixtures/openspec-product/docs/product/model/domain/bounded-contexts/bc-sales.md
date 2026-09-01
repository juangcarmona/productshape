---
id: BC-SALES
type: bounded-context
title: Sales
status: active
---

## Responsibility

Carts, pricing and checkout: everything between selecting items and confirming an order.

## Language

Cart, listed price, discount, order.

## Boundaries

Fulfilment and shipping live outside this context.

## External Relationships

Hands confirmed orders to fulfilment; consumes catalog prices as listed prices.
