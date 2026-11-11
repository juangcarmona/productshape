---
id: QR-RESOLVE
type: quality-requirement
title: Short links keep resolving
status: active
quality-attribute: reliability
applies-to:
  - UC-SHORTEN
verification:
  - scenario: A short link created earlier still resolves after the service restarts
---

## Requirement

Once issued, a short link MUST keep resolving to its original URL.

## Measurement

A previously issued link resolves correctly after a service restart.

## Verification

Automated check that issued links survive a restart.
