---
id: TERM-PRODUCT-GRAPH
type: domain-term
title: Product Graph
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms: []
---

## Definition

The derived directed graph whose nodes are product artifacts and whose typed edges are the
canonical relationships declared in artifact frontmatter, together with the reverse indexes
computed from them. The graph is compiled from the authored files on demand and is the structure
over which reachability, structural impact and reference validation are computed.

## Distinguish From

- **A graph database.** The product graph is explicitly not a database or a stored system of
  record. It is a compilation result: rebuild it whenever needed, discard it freely, and expect
  the same graph from the same files every time.
- **The artifact files themselves.** The files are canonical; the graph is derived from them.
  Nothing may be authored "in the graph" — an edge exists only because some artifact's
  frontmatter declares the canonical direction of that relationship.
- **A diagram.** Diagrams are one rendering of the graph for humans. The graph itself is the
  typed structure that tooling traverses, whether or not anything is drawn.

## Usage

The graph compiler builds the product graph during validation, inspection and handoff generation.
Structural impact queries ("what is reachable from this artifact, in this direction, to this
depth") and reachability diagnostics ("is this requirement connected to any actor") are answered
by traversing it. Derived views such as a bounded context's owned terms are read from the graph,
never from authored files.
