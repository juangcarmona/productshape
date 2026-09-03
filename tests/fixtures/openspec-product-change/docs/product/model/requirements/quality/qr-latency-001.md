---
id: QR-LATENCY-001
type: quality-requirement
title: Checkout responds within two seconds
status: active
quality-attribute: performance
applies-to:
  - UC-CHECKOUT-001
verification:
  - id: S1
    scenario: Checkout of a ten-item cart completes within two seconds under normal load
---

## Requirement

Checkout MUST present the computed total within two seconds of the shopper confirming the cart.

## Measurement

The 95th percentile of checkout response time over a normal-load day stays at or below two seconds.
