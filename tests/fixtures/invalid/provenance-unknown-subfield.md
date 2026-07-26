---
id: ACT-FIXTURE-003
type: actor
title: Actor With Unknown Provenance Subfield
status: draft
actor-kind: human
provenance:
  source: docs/legacy/spec.md
  confidence: medium
  recovered-by: an-author
---

## Purpose

Provenance is a closed object: `recovered-by` is not one of its fields.

## Goals

Prove that a typo inside provenance is rejected rather than silently ignored.

## Responsibilities

Fail schema validation with PRODUCT002.

## Boundaries

Nothing beyond conformance testing.
