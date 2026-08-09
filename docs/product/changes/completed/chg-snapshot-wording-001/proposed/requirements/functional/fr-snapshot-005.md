---
id: FR-SNAPSHOT-005
type: functional-requirement
title: Disclose relationship projections progressively, never the whole graph
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
  - BR-RELATIONSHIPS-001
  - CON-NO-GRAPH-DATABASE
verification:
  - scenario: The snapshot provides exactly two graph projections — the kind-level aggregate and the Focused Topology — and no third
  - scenario: No surface renders every artifact of the model simultaneously, and no control produces a drawing of the whole graph
  - scenario: No surface maintains a persistent whole-product canvas, whole-product fit, globally stable node positions or any global spatial memory
  - scenario: No projection arranges artifacts into product-owned visual bands or any universal global grouping
  - scenario: Navigation never depends on interpreting a graph layout — every traversal is available through the Reader, the Catalog, search and deep links
  - scenario: Every artifact and every canonical relationship remains reachable, and reachability is verified as completeness instead of simultaneous rendering
  - scenario: Selecting an artifact in any projection makes it the page's single selected artifact, and no projection holds a selection of its own
  - scenario: Identical model content produces identical projections
---

## Requirement

The Product Snapshot MUST NOT treat the compiled graph as one universal visualization. It MUST provide exactly two Graph Projections and MUST NOT provide a third:

- the **kind-level aggregate**, which communicates composition and traceability by artifact kind and relationship type with exact counts, on the Overview as FR-SNAPSHOT-003 requires;
- the **Focused Topology**, which projects the selected artifact's relationship neighbourhood locally, boundedly and progressively, as FR-SNAPSHOT-009 requires.

The following are prohibited on every surface, at every scale, behind every control:

- rendering every artifact of the model simultaneously, or any drawing of the whole graph;
- a persistent canvas containing the entire product model, or whole-product fit as an experience;
- globally stable artifact positions, or any design that asks the reader to build a global spatial memory of the product;
- product-owned visual bands, lanes or strata, or any universal global grouping or orientation rule whose purpose is to make a whole-product picture work;
- navigation that depends primarily on graph layout: every traversal a projection offers MUST also be available through the Artifact Reader, the Catalog, search and deep links.

Completeness is a property of reachability: every artifact and every canonical relationship MUST be reachable and readable through the Explorer's surfaces. Completeness MUST NOT be demonstrated by simultaneous rendering, and scalability MUST NOT be demonstrated by laying out the whole product model at once.

Selecting an artifact in either projection MUST make it the page's single selected artifact as FR-SNAPSHOT-006 defines; a projection MUST NOT hold a selection of its own. No projection MAY display a node, relationship or direction the compiled graph does not contain, and identical model content MUST produce identical projections.

## Rationale

Two directions have now failed on the same premise, differently decorated. A whole-model circle was illegible. A banded map of every artifact was legible and meaningless — geometry a reader could derive from each identifier. A relationship-derived whole-product canvas would have asked the reader to learn a global arrangement no question of theirs requires. The premise underneath all three is that understanding the product means seeing all of it at once; the Explorer replaces that premise, not just its renderings. The reader's questions — what is this made of, where is the thing I need, what does it say, what does it touch — are answered by aggregation, discovery, reading and one bounded neighbourhood at a time.

The prohibitions are stated as properties rather than as the withdrawal of named features because the failure is reproducible under any label: a "minimap", an "expert view" or a default-on filter canvas would each reintroduce it. Requiring every traversal to survive without the visual keeps the projections what they should be — accelerators over the same canonical relationships the Reader already carries as text — and keeps the product usable by every reader, on every device, at every scale the model reaches.

## Acceptance Scenarios

- The snapshot is inspected: exactly two projections exist, and exercising every control at the reference model scale never yields a rendering of every artifact at once, a whole-product canvas, bands or a whole-graph drawing.
- Every traversal demonstrated through the Focused Topology is repeated using only the Reader, the Catalog, search and deep links, reaching the same artifacts and relationships.
- Reachability is verified as completeness: every artifact and every canonical relationship of the compiled model is reached and read through the Explorer's surfaces, without any of it having been rendered simultaneously.
- A node selected in either projection becomes the page's selected artifact everywhere.
- Two snapshots generated from identical model content produce identical aggregates and identical Focused Topology projections for the same focus and reader state.
