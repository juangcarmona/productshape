---
id: ACT-FIXTURE-004
type: actor
title: Actor With Provenance Missing Confidence
status: draft
actor-kind: human
provenance:
  source: docs/legacy/spec.md
  recovered-from: inference
---

## Purpose

Provenance without a confidence records evidence but not how far to trust it.

## Goals

Prove that `confidence` is required whenever provenance is present.

## Responsibilities

Fail schema validation with PRODUCT002.

## Boundaries

Nothing beyond conformance testing.
