---
id: CHG-EXAMPLE-001
type: product-change
title: Example Product Change
status: draft
base-revision: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
operations:
  add: []
  modify: []
  remove: []
---

<!--
Product change: an explicit delta against the current product model.
- base-revision: the Git commit of the baseline this change was created against.
- operations.add / modify: every listed ID needs a complete proposed future-state artifact
  under this change's proposed/ directory (modify keeps the existing ID).
- operations.remove: listed IDs are removed at promotion; no tombstone files.
- The baseline under docs/product/model must not change while this change is active.
Contract: docs/specification/product-changes.md
-->

## Problem

<!-- The product problem or opportunity motivating this change. -->

## Intended Product Outcome

<!-- What is true about the product after this change, in behaviour terms. -->

## Rationale

<!-- Why this evolution, and why now. -->

## Affected Product Areas

<!-- The actors, journeys, use cases, rules, terms, contexts and requirements affected. -->

## Open Questions

<!-- Unresolved product decisions. Keep them visible; do not invent answers. -->

## Product Acceptance

<!-- How the product owner recognizes the change as correctly realized. -->

## Out of Scope

<!-- What this change deliberately does not cover. -->
