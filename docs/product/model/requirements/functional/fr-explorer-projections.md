---
id: FR-EXPLORER-PROJECTIONS
type: functional-requirement
title: Show the product as a map in three views, every one an accelerator over the Reader
status: active
derived-from:
  - UC-EXPLORER-BROWSE
  - BR-RELATIONSHIPS
  - CON-NO-GRAPH-DATABASE
verification:
  - scenario: The Product Explorer provides the kind-level aggregate and three map views — the Overview map, the Focus view and the Columns view — and no other graph projection
  - scenario: The Overview map draws one region per artifact kind present, with every artifact of that kind as a compact chip inside it
  - scenario: The Columns view draws one column per artifact kind in the stated order, with every artifact as a box and every canonical relationship as a line
  - scenario: Use cases and domain terms are grouped by the one bounded context the model records for each, and an artifact whose bounded context is absent or not unique is still drawn, in a group labelled as having no single context
  - scenario: Every map view can be panned by dragging and zoomed by wheel or pinch, and both are also operable from the keyboard and from visible controls
  - scenario: Hovering or keyboard-focusing an artifact on a map lights it and its direct neighbours and the relationships between them, and dims the rest, without changing the selection
  - scenario: Clicking or pressing Enter on an artifact in the Overview map or the Focus view, double-clicking it in the Columns view, or choosing the Focus action from the Reader opens the Focus view on it
  - scenario: Navigation never depends on interpreting a map — every traversal is available through the Reader, the Catalog, search and deep links
  - scenario: Every artifact and every canonical relationship remains reachable and readable through the Reader, whether or not any map is drawn
  - scenario: Selecting an artifact in any view makes it the page's single selected artifact, and no view holds a selection of its own
  - scenario: Identical model content, viewport and reader state produce identical map layouts; no layout depends on the clock or on unseeded randomness
  - scenario: No map draws a node, relationship or direction the compiled graph does not contain, and no position, size or ordering implies importance, lifecycle or sequence the model does not record
---

## Requirement

The Product Explorer MUST present the compiled graph through the kind-level aggregate — on the Overview, as FR-EXPLORER-ORIENTATION requires — and through exactly three **map views**, and MUST provide no other graph projection:

- the **Overview map**, which draws one region per artifact kind present in the model, each region holding every artifact of that kind as a compact chip identified by its stable identifier, as FR-EXPLORER-ORIENTATION requires;
- the **Focus view**, which draws one selected artifact with its direct neighbours around it and the rest of the model as a quiet background, as FR-EXPLORER-TOPOLOGY requires;
- the **Columns view**, which draws one column per artifact kind, in this order: actors, journeys, use cases, bounded contexts, business rules, domain terms, functional requirements, quality requirements, constraints, structured behaviours — with every artifact present as a box and every canonical relationship as a line between two boxes. A kind outside this list is drawn in a further column after them; a kind absent from the model has no column.

Inside the Overview map and the Columns view, use cases and domain terms MUST be grouped by their bounded context, each group labelled with that context. The grouping uses only what the model records: a use case's bounded context and a domain term's defining context. An artifact for which the model records no bounded context, or more than one, MUST still be drawn, in a group labelled as having no single context. Within a kind or a group, artifacts MUST be ordered by a deterministic rule computed from the compiled graph alone.

Every map view MUST be pannable by dragging and zoomable by wheel and by pinch, and both MUST also be operable from the keyboard and from visible controls, including a control that fits the whole drawing to the viewport. Hovering an artifact, or moving keyboard focus onto it, MUST light that artifact, its direct neighbours and the relationships between them, and MUST dim everything else, without changing the selected artifact. Clicking an artifact or pressing Enter on it in the Overview map or the Focus view, double-clicking it in the Columns view, or choosing the Focus action the Reader offers, MUST open the Focus view on that artifact. In the Columns view a single click or Enter selects the artifact, keeping it and its neighbours lit until the reader selects another or clears the selection.

Completeness is a property of reachability, not of drawing: every artifact and every canonical relationship MUST be reachable and readable through the Artifact Reader, the Catalog, search and deep links, so that no traversal depends on interpreting a map. A map is an accelerator over the Reader, never the only route.

Selecting an artifact in any view MUST make it the page's single selected artifact as FR-EXPLORER-ADDRESSING defines; no view holds a selection of its own. No map MAY draw a node, relationship or direction the compiled graph does not contain, and no position, size, colour, ordering or animation MAY imply importance, maturity, lifecycle, sequence or causality the model does not record. For identical model content, an identical viewport and identical reader state, every map MUST be laid out identically: layout MUST NOT depend on the clock or on unseeded randomness.

## Rationale

The earlier prohibition on drawing the whole product rested on two failed designs: a whole-model circle that was illegible, and a banded map that was legible but said nothing a reader could not derive from the identifiers. A map built on the same three ideas readers already use to talk about a product — what kinds of thing it holds, which context each belongs to, and what touches what — has since proved the opposite in front of real audiences: grouping by kind and context, lighting a neighbourhood on hover, and centring one artifact with its neighbours around it made the model's shape legible at a glance where the aggregate table and the bounded projection did not.

The guarantees that made the old rule worth having are kept rather than discarded. Every traversal still exists without the visual, so the map never gatekeeps. Nothing is drawn that the graph does not contain, and nothing is implied by position that the model does not record. Layout is reproducible, so two people looking at the same file and the same view are looking at the same picture. The order of the Columns view is fixed and stated because it is the order in which the methodology explains a product — who, through which journeys and use cases, in which contexts, under which rules and language, demanding what, proved how — and a stated order is a convention, not a claim of importance.

## Acceptance Scenarios

- The Product Explorer is opened: the Overview map shows one region per kind present, every artifact appears as a chip, and the kind-level aggregate is still available on the Overview. No other projection exists.
- The Columns view shows its columns in the stated order; use cases and domain terms sit under labels naming their bounded contexts; every relationship of the compiled graph is drawn once.
- A model in which one use case records no bounded context is drawn: that use case appears in a group labelled as having no single context, and nothing else changes.
- The reader drags, wheels and pinches each map, then does the same with the keyboard and the visible zoom and fit controls, reaching the same states.
- Hovering a chip and tabbing onto it both light exactly that artifact and its direct neighbours; the address and the selection do not change.
- Clicking a chip on the Overview map, pressing Enter on a neighbour in the Focus view, double-clicking a box in the Columns view and choosing Focus in the Reader each open the Focus view on that artifact.
- Every traversal demonstrated on a map is repeated using only the Reader, the Catalog, search and deep links, reaching the same artifacts and relationships.
- Two windows of the same size open the same address on the same file: every map is laid out identically.
