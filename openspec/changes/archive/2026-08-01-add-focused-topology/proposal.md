# Proposal: add-focused-topology

## Why

**SLI-EXPLORER-003** (work item `github:juangcarmona/productshape#48`, handoff `HOF-GITHUB-48`)
delivers the Product Explorer's third capability: traverse relationships through a visual
projection that is local, bounded and progressive — and withdraws the layered whole-product map in
the same increment that lands its accepted replacement, leaving exactly two projections.

## What Changes

- The **layered map is withdrawn**: renderer, nav, styles, screenshot scenes and measures; its
  routes (`#/graph`, `#/graph/layers`) resolve in place to the Focused Topology.
- The focused projection becomes the **Focused Topology** proper:
  - **disclosure is addressable** (`?x=<open group indices>`, `x=-` for none, absent for the small-
    groups default), replaces the history entry on toggle, and restores from a fresh window;
  - **refocusing resets disclosure**: selecting a member navigates (history grows) to a newly
    focused projection — nothing accumulates;
  - **dense fallback**: a group opened past the legibility threshold renders as a structured list
    below the drawing (every entry selectable) instead of an illegible fan, and says so in its
    accessible name.
- The measurement harness swaps the layered-map figures for **group-expansion latency**, measured
  at the three reference scales.

## Capabilities

### Modified Capabilities

- `snapshot-generation`: exactly two projections; the focused neighbourhood requirement becomes the
  Focused Topology with addressable disclosure, reset-on-refocus and the dense structured-list
  fallback.

## Impact

- `packages/core/src/snapshot.ts`, `snapshot.test.ts`, `scripts/measure-snapshot.mts`,
  `scripts/screenshot-snapshot.mts`, `docs/assets/snapshot/` (layered captures removed).
- Out of scope: rendering technique or layout algorithm as product rules; multi-focus canvases;
  depth controls.
