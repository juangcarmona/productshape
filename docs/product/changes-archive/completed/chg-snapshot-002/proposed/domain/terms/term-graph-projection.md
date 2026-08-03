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

One purpose-built rendering of the product graph — a subset of it, an aggregation of it, or a neighbourhood within it — chosen because it answers a specific reading question. A projection is defined by what it selects, what it aggregates, how it arranges what remains, and which question that arrangement serves. It never claims to be the graph.

Three projections serve distinct questions. The **kind-level aggregate** groups artifacts and relationships by kind, answering how the families of artifacts compose and trace to one another. The **layered model map** places real artifacts in four fixed semantic bands — product context, product behaviour, rules and language, product commitments — answering how the product is stratified; it is the broad-topology view, and it stays legible at scale by filtering, grouping and collapsing rather than by drawing everything. The **focused neighbourhood** anchors on one selected artifact and shows one hop of typed, directed relationships, answering what this artifact connects to.

There is deliberately no fourth projection that simply draws the whole graph. Such a view answers no question the three leave open, and at any real scale it reproduces the illegibility that motivated projections in the first place. Breadth is served by aggregating and by banding, not by rendering more at once.

## Distinguish From

- **The Product Graph.** The graph is the single derived structure compiled from the authored artifacts: complete, typed and directed. A projection is a rendering decision made over that structure. The graph has one definition; projections are plural by design, because no single arrangement answers every question.
- **A Product Snapshot.** The snapshot is the generated file that carries the projections along with the artifact content and the search index. The projections are what the snapshot shows; the snapshot is what a reader is given.
- **A diagram of the model.** A diagram is one drawing, usually of everything, and is judged by how faithfully it reproduces the structure. A projection is judged by whether it answers its question, which routinely means deliberately omitting or aggregating structure that a faithful drawing would include.
- **A filter or a query.** Filtering narrows what a reader sees within a projection. The projection is the prior decision about what to select, aggregate and arrange at all.

## Usage

A projection never invents structure: every node, every relationship and every direction it shows comes from the compiled graph, and no projection may imply importance, health, ownership or ordering the model does not record. Aggregation is allowed and is the point of the kind-level aggregate; fabrication is not. Because the same product content must always produce the same reading, a projection's arrangement is deterministic.

An arrangement can fabricate meaning as readily as a label can, which is why the layered map's bands are defined as organizing devices only: they carry no lifecycle stage, causality, sequence or direction, and a relationship crossing them or running counter to their order still displays the direction the model authored. The band assignment itself is owned by the product and identical for every model projected, so the map means the same thing wherever it is read; placing a new artifact kind is a product decision, not a per-model or adopter one.

Every projection has an equivalent that needs no visual: the relationships a focused neighbourhood draws are always also available as a labelled list of typed, directed relationships, so nothing a projection communicates depends on seeing it.
