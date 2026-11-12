---
id: TERM-FOCUSED-TOPOLOGY
type: domain-term
title: Focus view
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms:
  - focused topology
  - focused projection
---

## Definition

The Product Explorer's view of one artifact in its neighbourhood. The selected artifact is drawn at the centre; its direct canonical neighbours are drawn around it, grouped by artifact kind, with the kinds placed on either side by the fixed order of the Columns view; each neighbour names the relationship connecting it to the focus and counts its own other relationships; and every other artifact of the model sits behind them as a faded background the reader can select. Choosing any artifact makes it the new focus; a breadcrumb and browser Back retrace the way.

It replaced the Focused Topology, which drew counted relationship groups the reader opened one at a time. The identifier is kept because artifact identifiers are immutable; the earlier name survives as a synonym.

## Distinguish From

- **The Overview map and the Columns view.** Both show every artifact in a layout that does not depend on any selection. The Focus view is the only map arranged around one artifact.
- **The relationship groups on the Artifact Reader.** The Reader presents the same canonical relationships as text — grouped, counted, directed and navigable. The Focus view draws that same information; neither adds an edge the other lacks.
- **Structural impact analysis.** `prodshape impact` answers exhaustive reachability to a depth for someone with the repository. The Focus view serves comprehension of one neighbourhood at a time for someone without it.

## Usage

The view is deterministic for the same model, focus, viewport and disclosure state. It draws only nodes, relationships and directions the compiled graph contains, and no visual device of it may invent lifecycle, maturity, importance, sequence, causality or dependency absent from the canonical relationships. Groups too large to draw legibly start collapsed with their complete counts. Every neighbour it shows or counts remains reachable through the Reader, the Catalog, search and deep links.
