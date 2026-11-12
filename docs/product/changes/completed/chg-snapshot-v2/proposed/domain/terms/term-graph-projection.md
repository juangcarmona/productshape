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

One purpose-built rendering of the product graph — a subset of it, an aggregation of it, or an arrangement of all of it — chosen because it answers a specific reading question. A projection is defined by what it selects, what it aggregates, how it arranges what remains, and which question that arrangement serves. It never claims to be the graph.

The Product Explorer has four. The **kind-level aggregate** groups artifacts and relationships by kind with exact counts, answering how the families of artifacts compose and trace to one another. The **Overview map** shows every artifact as a chip in its kind's region, grouped by bounded context, answering what the product is made of. The **Focus view** centres one artifact among its neighbours, answering what this artifact connects to and through what. The **Columns view** lays every artifact out in one column per kind with every relationship drawn, answering how a thread runs across the kinds.

## Distinguish From

- **The Product Graph.** The graph is the single derived structure compiled from the authored artifacts: complete, typed and directed. A projection is a rendering decision made over that structure. The graph has one definition; projections are plural by design, because no single arrangement answers every question.
- **A Product Snapshot.** The snapshot is the generated file that carries the projections along with the artifact content and the search index. The projections are what the snapshot shows; the snapshot is what a reader is given.
- **A diagram of the model.** A diagram is a drawing someone arranged, judged by how faithfully it reproduces the structure. A projection is laid out by a fixed, deterministic rule from the graph alone, and judged by whether it answers its question.
- **A filter or a query.** Filtering narrows what a reader sees. The projection is the prior decision about what to select, aggregate and arrange at all.

## Usage

A projection never invents structure: every node, every relationship and every direction it shows comes from the compiled graph, and no projection may imply importance, health, ownership, ordering, lifecycle, sequence, causality or dependency the model does not record. Aggregation and arrangement by kind and by bounded context are allowed, because the model records both; fabrication is not. Because the same product content must always produce the same reading, a projection is deterministic for the same model, viewport and explicit reader state.

Every projection has an equivalent that needs no visual: the relationships the maps draw are always also readable as grouped, counted, directed text on the Artifact Reader, so nothing a projection communicates depends on seeing it.
