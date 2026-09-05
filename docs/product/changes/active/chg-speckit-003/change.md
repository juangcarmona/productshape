---
id: CHG-SPECKIT-003
type: product-change
title: Host the product workflow in Spec Kit through a separate product-authoring extension
status: draft
base-revision: 'f1a1612e1b382a75869b07688c3dd3a7aea626a3'
operations:
  add: []
  modify:
    - FR-SPECKIT-001
  remove: []
---

## Problem

FR-SPECKIT-001 forbids write authority for a Spec Kit extension and states no hosted product workflow. The `pdac-product` extension applies Product Changes to the accepted model. The lane exists in the implementation and not in the definition.

## Intended Product Outcome

FR-SPECKIT-001 states a third mechanism: a hosted product workflow that governs, through a separate product-authoring extension, under the same obligations FR-OPENSPEC-001 states for OpenSpec. The grounding extension keeps its no-write-authority statement.

## Rationale

The definition is authoritative over both hosts. Stating the lane on the same terms makes the shared rail an obligation instead of a habit.

## Affected Product Areas

Delivery integration: FR-SPECKIT-001 only.

## Open Questions

None.

## Product Acceptance

FR-SPECKIT-001 carries scenarios S12 to S15 for the hosted lane and a paragraph stating its obligations. S8 names the grounding extension explicitly.

## Out of Scope

Implementation, recovery, releases and catalog listings. No diagnostic code changes.
