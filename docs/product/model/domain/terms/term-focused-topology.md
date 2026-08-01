---
id: TERM-FOCUSED-TOPOLOGY
type: domain-term
title: Focused Topology
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms:
  - focused projection
---

## Definition

The Product Explorer's visual relationship projection: local, bounded and progressive. The selected
artifact is the focus; its immediate canonical relationships appear grouped by relationship meaning
and, where useful, by artifact type; collapsed groups always expose their complete count; and the
reader deliberately expands a group or follows a path. Selecting another artifact produces a newly
focused projection rather than accumulating the whole traversal indefinitely.

Three properties bound it. It is **local**: it projects the neighbourhood of one focus, never the
whole product. It is **bounded**: what it shows at any moment is limited, and everything it holds
back is counted rather than silently omitted. It is **progressive**: detail appears because the
reader asked, and dense relationship sets fall back to structured lists or another legible
representation rather than to a denser drawing.

## Distinguish From

- **A whole-graph drawing.** The Focused Topology never renders every artifact and every
  relationship, at any scale, through any control. Breadth belongs to the Overview's aggregate and
  the Catalog, not to a bigger picture.
- **The relationship groups on the Artifact Reader.** The Reader presents the same canonical
  relationships as text — grouped, counted, directed and navigable. The Focused Topology is the
  visual form of that same information; neither adds an edge the other lacks, and the model can be
  navigated as a graph entirely through the Reader without interpreting a node-link diagram.
- **Structural impact analysis.** `prodshape impact` answers exhaustive reachability to a depth for
  someone with the repository. The Focused Topology serves comprehension of one neighbourhood at a
  time for someone without it.

## Usage

The projection is deterministic for the same model, the same focus and the same explicit reader
state. It draws only nodes, relationships and directions the compiled graph contains, and no visual
device of it may invent lifecycle, maturity, importance, sequence, causality or dependency that is
absent from the canonical relationships. Every related artifact it shows or counts remains
reachable through expansion, the Reader, the Catalog, search and deep links.
