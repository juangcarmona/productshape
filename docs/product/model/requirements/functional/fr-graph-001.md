---
id: FR-GRAPH-001
type: functional-requirement
title: Compile the product graph with derived reverse relationships
status: active
derived-from:
  - UC-INSPECT-001
  - BR-RELATIONSHIPS-001
verification:
  - scenario: The graph contains every artifact and every authored relationship as a typed edge
  - scenario: Reverse views are derived from canonical edges and never authored
  - scenario: Recompiling identical content yields byte-identical graph output
---

## Requirement

The product MUST compile a product graph from the authored artifacts alone. The graph MUST contain
every artifact as a node and every authored relationship as a typed edge in its canonical
direction, and MUST additionally expose derived incoming views (for example, which requirements
derive from a given use case) computed from the canonical edges rather than authored anywhere. The
graph MUST be rebuildable at any time from the authored files, and identical repository content
MUST yield identical graph output.

## Rationale

Relationships are authored once, in one canonical direction, so the model never holds two copies
of the same fact that can drift apart. But readers and tools need both directions: an author asks
what a use case is derived into just as often as what a requirement derives from. Deriving reverse
views at compile time gives everyone the full picture while keeping a single authored source per
edge. Making the graph reproducible and disposable keeps it firmly non-canonical — it can be
deleted, regenerated or diffed in review, and a stable byte-identical output means a changed graph
always signals a changed model.

## Acceptance Scenarios

- A model with actors, journeys, use cases, rules, terms and requirements is compiled. The graph
  contains one node per artifact and one typed edge per authored relationship, each in its
  canonical direction as defined by the relationship model.
- A use case is referenced by two functional requirements via `derived-from`. The graph's derived
  incoming view for that use case lists both requirements, although no artifact authors that
  reverse edge.
- The generated graph output is deleted and recompiled from the same content, once per supported
  platform. Every rebuild produces byte-identical output carrying its versioned schema identifier.
