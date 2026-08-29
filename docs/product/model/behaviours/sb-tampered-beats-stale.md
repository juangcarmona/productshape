---
id: SB-TAMPERED-BEATS-STALE
type: structured-behaviour
title: A tampered embedding is reported even when its target also moved
status: active
illustrates:
  - UC-CITATIONS-VERIFY-001
uses-terms:
  - TERM-CITATION
given:
  - An embedded projection was edited by hand
  - The cited target's canonical text has also changed since the citation was recorded
when: Citations are verified
then:
  - The citation reports status tampered with PRODUCT062
  - No stale status or PRODUCT061 accompanies it
---

## Intent

Establish the precedence every citation consumer relies on: a hand-edited embedding is a faithfulness defect, and an unrelated canonical edit can never downgrade it to a staleness warning nobody must act on.

## Boundaries

This example does not assert the full status evaluation order, which the verifying requirement carries. It does not cover an embedding faithful to its recorded digest whose target moved, which is ordinary staleness.
