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

A generated, read-only, self-contained projection of the product graph at a recorded source
revision — one HTML file containing every artifact, its relationships in both directions, a search
index and the graph projections, explorable in a browser with no repository, tooling or server.

Completeness is a property of the file, not of the display: the snapshot holds the whole model and
makes all of it reachable, while presenting it progressively — an orientation view first, then one
selected artifact at a time, with broader topology shown only when the reader asks for it. A
snapshot is derived and regenerable at any time; it is read-only by nature — there is nothing on it
to edit and it retains nothing the reader does — and it is never authoritative.

## Distinguish From

- **The Product Graph.** The graph is the derived structure the toolkit computes and reasons
  over; the snapshot is a set of renderings of that structure for human exploration. The graph
  exists for tools and validation, the snapshot for people without the repository.
- **A Graph Projection.** A projection is one purpose-built rendering of part or an aggregation
  of the graph. The snapshot is the file that carries three of them — kind-level aggregate, layered
  model map, focused neighbourhood — and never treats any single one as the universal view.
- **A Product Handoff.** Both record the source revision they were generated from, so staleness
  is deterministically answerable. But a handoff packages the subgraph one delivery increment
  needs, for consumption by an SDD framework; a snapshot projects the whole model, for
  consumption by a person.
- **The Product Context document.** Also a generated readable projection — but scoped to one
  handoff and rendered as prose for a delivery reader. The snapshot covers the entire model and
  is navigational rather than linear.
- **A web application.** A snapshot involves no server, no database, no session, no stored state
  and no editing; it is a file. Its interactivity only chooses which of its own embedded content
  is displayed. The product's constraints continue to forbid interactive web applications.

## Usage

The graph command's HTML format (`prodshape graph --format html`) generates a Product Snapshot
from the current model, stamping the source revision into the page. The Product Explorer's journey
is built on it: it is the artifact that crosses the boundary between the repository and the people
who will never open one. Its recorded revision is how anyone judges whether a shared snapshot
still reflects the current model — the same currency question Product Handoffs answer with the same
mechanism. Because the artifact a reader has selected is addressable within the file, a snapshot is
also how one person points another at one specific part of the product definition.
