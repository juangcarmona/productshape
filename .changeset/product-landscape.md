---
'@prodshape/core': minor
---

Product Snapshot: the layered map becomes the Product Landscape

The layered model map placed artifacts in four bands but collapsed the large kinds into counted cells, so
most artifacts were a number rather than a thing. It is replaced by the Product Landscape: the complete
product in four permanently visible bands with **every artifact as its own node**, carrying its
human-readable title as its identity, the identifier in monospace beneath, and its kind as a thin accent
bar rather than a filled surface.

- **Nothing is aggregated and nothing is hidden.** Counted cells, the rendered-artifact budget and the
  aggregate connectors are gone; every artifact in the compiled model has a node, and no scoping is
  required to reach that state.
- **Placement is stable and deterministic** — a grid within each band, ordered by the compiled graph's own
  sort, derived from the model alone. Panning and zooming move the camera, never the artifacts.
- **Navigable rather than a poster** — pan, zoom and fit by pointer and by keyboard bring nodes to readable
  detail. Simultaneous legibility of every title at a whole-product fit is explicitly not attempted.
- **Verified at 730 artifacts** against five integrity properties: stable placement, individual
  reachability, 730 of 730 selectable, no clipping, no overlap. Landscape render 65 ms.

Also adds a source-hygiene test. A literal U+0000 had been used twice as a map-key delimiter in
`snapshot.ts`, which works at runtime but makes the file a _binary_ file to grep, ripgrep and GitHub's blob
view — so the package's largest source file silently stopped being searchable. Both instances reached main.
The test fails on any control character in TypeScript sources.
