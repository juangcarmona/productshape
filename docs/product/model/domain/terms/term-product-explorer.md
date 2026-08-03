---
id: TERM-PRODUCT-EXPLORER
type: domain-term
title: Product Explorer
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms:
  - explorer
---

## Definition

The Product Snapshot's exploration experience: four coordinated surfaces through which a reader understands the complete product model — an **Overview** that communicates the aggregate shape, a **Catalog** for large-scale discovery through search, filters and browsing, an **Artifact Reader** in which the selected artifact and its canonical relationships dominate, and a **Focused Topology** that projects one artifact's relationship neighbourhood visually, locally and progressively.

The Explorer exposes the complete product model through overview, search, catalogues, artifact reading and progressively disclosed relationship projections. **Completeness means that every artifact and canonical relationship is reachable — not that every node is simultaneously rendered.** No surface draws the whole product at once, and no surface needs to.

The four surfaces are one instrument: they share one selection state, one navigation mechanism and one addressable exploration state, so moving between them never loses the reader's place.

## Distinguish From

- **A whole-product canvas.** The Explorer has no surface whose job is to render every artifact simultaneously, no globally stable node positions to memorize, and no navigation that depends on interpreting a dense node-link diagram. Reachability, not simultaneous visibility, is its completeness claim.
- **A Graph Projection.** A projection is one purpose-built rendering of part of the graph. The Explorer is the whole experience; two of its parts — the kind-level aggregate and the Focused Topology — are projections.
- **The Product Snapshot.** The snapshot is the generated file; the Explorer is what opening it is like. The file carries the model completely; the Explorer discloses it progressively.
- **An editor or platform.** The Explorer is read-only. Product knowledge evolves through the Product Change workflow, never through the snapshot.

## Usage

The Explorer opens on the Overview. A reader locates artifacts through the Catalog, reads them in the Reader, and traverses relationships either as text in the Reader or visually through the Focused Topology — whichever serves the question. Every artifact and every canonical relationship is reachable through more than one of these routes, so nothing the model records depends on any single surface being usable.
