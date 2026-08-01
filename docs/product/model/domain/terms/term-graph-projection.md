---
id: TERM-GRAPH-PROJECTION
type: domain-term
title: Graph Projection
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms:
  - projection
---

## Definition

One purpose-built rendering of the product graph — a subset of it, an aggregation of it, or a
neighbourhood within it — chosen because it answers a specific reading question. A projection is
defined by what it selects, what it aggregates, how it arranges what remains, and which question
that arrangement serves. It never claims to be the graph.

Two projections serve distinct questions. The **kind-level aggregate** groups artifacts and
relationships by kind, answering how the families of artifacts compose and trace to one another.
The **Focused Topology** projects one selected artifact's immediate canonical relationships —
locally, boundedly and progressively — answering what this artifact connects to and through what.

There is deliberately no projection that draws the whole graph. Composition is answered better by
aggregation, discovery by the Catalog, and an artifact's connections by focusing on it; a
whole-graph drawing answers no question those leave open, and at any real scale it reproduces the
illegibility that motivated projections in the first place.

## Distinguish From

- **The Product Graph.** The graph is the single derived structure compiled from the authored
  artifacts: complete, typed and directed. A projection is a rendering decision made over that
  structure. The graph has one definition; projections are plural by design, because no single
  arrangement answers every question.
- **A Product Snapshot.** The snapshot is the generated file that carries the projections along
  with the artifact content and the search index. The projections are what the snapshot shows; the
  snapshot is what a reader is given.
- **A diagram of the model.** A diagram is one drawing, usually of everything, and is judged by how
  faithfully it reproduces the structure. A projection is judged by whether it answers its
  question, which routinely means deliberately omitting or aggregating structure that a faithful
  drawing would include.
- **A filter or a query.** Filtering narrows what a reader sees within a projection. The projection
  is the prior decision about what to select, aggregate and arrange at all.

## Usage

A projection never invents structure: every node, every relationship and every direction it shows
comes from the compiled graph, and no projection may imply importance, health, ownership, ordering,
lifecycle, sequence, causality or dependency the model does not record. Aggregation is allowed and
is the point of the kind-level aggregate; fabrication is not. Because the same product content must
always produce the same reading, a projection is deterministic for the same model and the same
explicit reader state.

Every projection has an equivalent that needs no visual: the relationships the Focused Topology
draws are always also readable as grouped, counted, directed text on the Artifact Reader, so
nothing a projection communicates depends on seeing it.
