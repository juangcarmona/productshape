---
id: TERM-PRODUCT-SNAPSHOT
type: domain-term
title: Product Snapshot
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms:
  - snapshot page
  - snapshot explorer
---

## Definition

A generated, read-only, self-contained projection of the product graph at a recorded source revision — one HTML file containing every artifact, its relationships in both directions, a search index and the graph projections, explorable in a browser with no repository, tooling or server.

Completeness is a property of the file, not of the display: the snapshot holds the whole model and makes all of it reachable, while presenting it progressively through the Product Explorer — an orientation view first, discovery through the Catalog, one selected artifact at a time in the Reader, and relationship neighbourhoods only when the reader asks. A snapshot is derived and regenerable at any time; it is read-only by nature — there is nothing on it to edit and it retains nothing the reader does — and it is never authoritative.

## Distinguish From

- **The Product Graph.** The graph is the derived structure the toolkit computes and reasons over; the snapshot is a set of renderings of that structure for human exploration. The graph exists for tools and validation, the snapshot for people without the repository.
- **A Graph Projection.** A projection is one purpose-built rendering of part or an aggregation of the graph. The snapshot is the file that carries the projections — the kind-level aggregate and the Focused Topology — and never treats either as the universal view.
- **A consumer document.** A consumer document uses citations to bind its own delivery or design statements to canonical product text. A snapshot instead projects the whole model for human exploration and carries no delivery state.
- **A web application.** A snapshot involves no server, no database, no session, no stored state and no editing; it is a file. Its interactivity only chooses which of its own embedded content is displayed. The product's constraints continue to forbid interactive web applications.

## Usage

The graph command's HTML format (`prodshape graph --format html`) generates a Product Snapshot from the current model, stamping the source revision into the page. The Product Explorer's journey is built on it: it is the artifact that crosses the boundary between the repository and the people who will never open one. Its recorded revision lets a reader judge whether a shared snapshot still reflects the current model. Because the artifact a reader has selected is addressable within the file, a snapshot is also how one person points another at one specific part of the product definition.
