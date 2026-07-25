# Delivery Slices

An approved Product Change MAY be divided into one or more **Delivery Slices**. A slice is an
implementable, verifiable product increment that preserves meaningful product behaviour through the
stack. A slice is not necessarily one requirement, one use case, one technical layer, one endpoint
or one screen — and slicing by technical layer is exactly what slices exist to avoid.

## Structure

Slices are YAML files under their Product Change's `slices/` directory
(schema `delivery-slice/v1alpha1`):

```yaml
schema: product-definition-as-code/delivery-slice/v1alpha1
id: SLI-HANDOFF-001
title: Generate a Product Handoff for one backlog item
status: approved
product-change: CHG-HANDOFF-001
outcome: A product engineer can generate a stable SDD input for one delivery increment.
implements:
  - requirement: FR-HANDOFF-001
    coverage: full
affects:
  - UC-HANDOFF-001
  - TERM-PRODUCT-HANDOFF
depends-on: []
verification:
  - The handoff includes the selected requirement and its transitive product context.
out-of-scope:
  - Creating a GitHub issue through the GitHub API.
```

Field rules:

- `product-change` MUST reference the Product Change whose directory contains the slice.
- `implements[].requirement` MUST reference a Functional Requirement, Quality Requirement or
  Constraint present in the change's overlay (baseline or proposed).
- `implements[].coverage` is `full` or `partial`. When `partial`, the entry MUST include a precise
  `scope` field describing which part of the requirement the slice covers.
- `affects` lists product artifacts the slice touches beyond the implemented requirements.
- `depends-on` lists other slices of the same change that must be completed first.
- `verification` (non-empty) states how the increment is verified in product terms.
- `out-of-scope` states explicit exclusions.

## Lifecycle

`deliverySliceStatus`: `draft` → `proposed` → `approved` → `in-progress` → `completed`, with
`cancelled` reachable from any non-completed state. Cancelling a slice is the explicit waiver
recognized by promotion.

## Authority and approval

Slice files are the authoritative delivery decomposition of their Product Change. AI MAY propose
slices; a human MUST approve them (status `approved` is a human decision). Deterministic tooling
validates references, coverage declarations and dependency cycles; it does not judge whether a
slice is a _good_ increment — that judgment belongs to the slicing skill and its human reviewer.
