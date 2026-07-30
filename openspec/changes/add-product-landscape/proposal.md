# Proposal: add-product-landscape

## Why

The snapshot's layered model map places artifacts in four bands and collapses the large kinds into counted
cells. It communicates composition, but it is not somewhere a reader can be: nodes are anonymous marks, and
opening the focused neighbourhood replaces it entirely, so nothing about where the reader was survives.

Product Change **CHG-SNAPSHOT-003**'s first delivery slice, **SLI-SNAPSHOT-007** (work item
`github:juangcarmona/productshape#38`, handoff `HOF-GITHUB-38`), replaces the layered map with the Product
Landscape: the complete product in four permanently visible bands, every artifact its own stable,
individually reachable node identified by its title.

It also carries the change's scale evidence, deliberately. Whether a landscape of individually represented
artifacts holds at 730 is what determines whether the three slices built on it are viable, so deferring
that measurement would mean building the foundation on an assumption.

## What Changes

- The layered model map is replaced by the **Product Landscape**. Four bands, permanently visible, every
  artifact kind in its fixed product-owned band, only populated bands rendered.
- **Every artifact is its own node**, carrying its human-readable title as its identity, with kind and
  identifier secondary. No anonymous marks, no collapsed counted cells standing in for artifacts, no
  aggregation, and no requirement to scope the model before entering.
- **Positions are stable and derived from the model alone** — identical for identical content, unchanged
  across re-renders. The landscape becomes a place rather than a picture.
- **Navigable rather than a poster.** Pan, zoom and fit by pointer and keyboard bring nodes to readable
  detail; simultaneous legibility of every title at a whole-product fit is explicitly not attempted.
- **Kind colour becomes an accent** rather than a filled surface, so a field of many nodes reads as text.
- **Measured at all three reference scales**, including 730 artifacts, against the SLI-SNAPSHOT-007
  landscape integrity properties, with artifacts-aggregated-away reported separately, and with
  whole-landscape rendering verified against the canonical 250 ms p95 budget `QR-SCALABILITY-001` now
  states.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `snapshot-generation`: the layered-model-map requirement becomes the Product Landscape — individually
  represented titled artifacts, stable placement, navigation to readable detail, and the integrity
  properties that replace the unsatisfiable simultaneous-legibility reading.

## Impact

- **`packages/core`**: the layered renderer is replaced. Band lanes stay; counted cells and their
  collapse-by-budget logic go, since every artifact is now represented. Node geometry becomes a
  deterministic grid within each band, derived from the graph's existing sort. Pan, zoom and fit are reused
  from the focused projection rather than reinvented.
- **Determinism**: unchanged as a contract. Positions are a pure function of the compiled model; nothing
  settles, nothing is seeded.
- **What this slice does not touch**: the focused neighbourhood keeps working exactly as it does today.
  Merging it into the landscape as a state is `SLI-SNAPSHOT-008`, and this slice deliberately leaves the
  existing behaviour in place rather than half-building the next one.
- **Verification**: band assignment and populated-band rendering, individual representation with no
  aggregation, stable placement across re-renders, reachability and selectability of every artifact,
  geometry free of overlap and clipping, and the three-scale measurement including 730.
