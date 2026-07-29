---
id: TERM-PRODUCT-SNAPSHOT
type: domain-term
title: Product Snapshot
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms:
  - snapshot page
---

## Definition

A generated, read-only, self-contained static projection of the product graph at a recorded
source revision — one HTML file rendering every artifact, its relationships in both directions,
a graph visualization and a search index, explorable in a browser with no repository, tooling or
server. A snapshot is derived and regenerable at any time; it is read-only by nature — there is
nothing on it to edit — and it is never authoritative.

## Distinguish From

- **The Product Graph.** The graph is the derived structure the toolkit computes and reasons
  over; the snapshot is one rendering of that structure for human exploration. The graph exists
  for tools and validation, the snapshot for people without the repository.
- **A Product Handoff.** Both record the source revision they were generated from, so staleness
  is deterministically answerable. But a handoff packages the subgraph one delivery increment
  needs, for consumption by an SDD framework; a snapshot projects the whole model, for
  consumption by a person.
- **The Product Context document.** Also a generated readable projection — but scoped to one
  handoff and rendered as prose for a delivery reader. The snapshot covers the entire model and
  is navigational rather than linear.
- **A web application.** A snapshot involves no server, no database, no session and no editing;
  it is a file. The product's constraints continue to forbid interactive web applications.

## Usage

The graph command's HTML format (`prodshape graph --format html`) generates a Product Snapshot
from the current model, stamping the source revision into the page. The Product Explorer's journey is built on it: it is the artifact that
crosses the boundary between the repository and the people who will never open one. Its recorded
revision is how anyone judges whether a shared snapshot still reflects the current model — the
same currency question Product Handoffs answer with the same mechanism.
