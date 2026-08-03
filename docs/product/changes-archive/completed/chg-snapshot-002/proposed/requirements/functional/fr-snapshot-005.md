---
id: FR-SNAPSHOT-005
type: functional-requirement
title: Explore relationships through three purpose-specific graph projections
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
  - BR-RELATIONSHIPS-001
  - CON-NO-GRAPH-DATABASE
verification:
  - scenario: The snapshot provides exactly three graph projections — kind-level aggregate, layered model map and focused neighbourhood — and no unstructured whole-model drawing
  - scenario: The kind-level projection aggregates artifacts and relationships by kind and relationship type with exact counts
  - scenario: The layered projection assigns every artifact kind to its fixed band — context, behaviour, rules and language, commitments — and renders only the bands the model populates
  - scenario: Band membership and band order imply no lifecycle, causality, sequence or relationship direction, and every relationship displays its authored direction including where it crosses bands or runs counter to band order
  - scenario: The layered projection supports filtering, grouping and collapsing, states exact hidden counts, and does not render every node and edge by default for a large model
  - scenario: The focused projection anchors on the selected artifact, shows one hop by default, and distinguishes incoming from outgoing relationships other than by colour alone
  - scenario: Focused neighbours are grouped by relationship type and artifact kind, large groups start collapsed with exact counts, and expansion happens only on reader action
  - scenario: An equivalent labelled list of typed, directed relationships is always available for the focused projection without requiring the visual
  - scenario: Selecting a node in any projection makes that artifact the page's single selected artifact
  - scenario: No projection displays a node, relationship or direction absent from the compiled graph, and none implies importance, health, ownership or ordering the model does not record
  - scenario: Identical model content produces identical projection arrangements
---

## Requirement

The Product Snapshot MUST NOT treat the compiled graph as one universal visualization. It MUST provide exactly three Graph Projections, each serving a distinct reading task, and MUST NOT provide an additional unstructured whole-model drawing.

**Kind-level aggregate projection.** MUST aggregate the model's artifacts and relationships by artifact kind and relationship type, with exact counts, communicating composition and traceability without rendering individual artifacts. This is the snapshot's primary orientation projection.

**Layered model map.** The snapshot's broad-topology expert view. It MUST arrange real artifacts in fixed semantic bands, assigning every artifact kind as follows:

| Band                | Artifact kinds                                             |
| ------------------- | ---------------------------------------------------------- |
| Product context     | Actors, Bounded Contexts                                   |
| Product behaviour   | Journeys, Use Cases                                        |
| Rules and language  | Business Rules, Domain Terms                               |
| Product commitments | Functional Requirements, Quality Requirements, Constraints |

This assignment is owned by the product and is identical for every product model the snapshot projects. It MUST NOT be configurable by an adopter, and MUST NOT be derived per model. A future canonical artifact kind MUST receive an explicit band through a ProductShape Product Change before the layered map can place it.

Bands organize the view only. Band membership and band order MUST NOT imply lifecycle stage, causality, sequence, precedence, dependency or relationship direction, and the projection MUST NOT present them as doing so. Every relationship MUST display its authored direction, including where it crosses bands and where it runs counter to band order. The projection MUST render only the bands the model populates, and MUST NOT introduce artifact kinds, bands or lifecycle stages absent from the compiled graph.

Because it is the broad-topology view, the layered map MUST remain legible as the model grows: it MUST support filtering, MUST group and collapse artifacts and relationships, MUST state the exact count of whatever it has hidden or collapsed, and MUST NOT render every node and every edge by default for a large model. It MUST support node selection and fitting the view to what is displayed.

**Focused neighbourhood projection.** MUST anchor on the page's selected artifact and show one hop by default. Incoming and outgoing relationships MUST be distinguishable by means other than colour alone, and every relationship MUST state its type and its direction explicitly. Neighbours MUST be grouped by relationship type and artifact kind. A group large enough to overwhelm the projection MUST start collapsed, showing its exact count, and MUST expand only when the reader asks. An equivalent labelled list of the same typed, directed relationships MUST always be available, so nothing this projection communicates depends on being able to see it.

Selecting an artifact in any projection MUST make it the page's single selected artifact as defined by FR-SNAPSHOT-006; a projection MUST NOT hold a selection of its own.

No projection MAY display a node, relationship or direction that the compiled graph does not contain, and none MAY imply importance, centrality, health, ownership, sequence or ordering the model does not record. Aggregation is permitted and is the purpose of the kind-level projection; inference is not. For identical model content, every projection MUST produce an identical arrangement.

## Rationale

The current snapshot draws all 73 artifacts on one circle with all 196 relationships as chords. Every node is equidistant from the centre, so position carries no information; every relationship is a line across the interior, so density is the only thing the drawing communicates. It answers no question a reader actually has. The measurements confirm this is structural rather than cosmetic: the same layout at 365 artifacts draws 1,645 chords and at 730 artifacts draws 3,290, and the most connected artifact reaches degree 171. A prettier version of that drawing would be no more legible.

Different questions need different renderings, which is why the requirement names three rather than demanding a better one. "What is this product made of and how does it trace" is answered by aggregation: in the current baseline the 196 relationships reduce to 16 kind-and-type combinations, which is a readable table. "How is the product stratified" is answered by bands: the four bands cover all nine artifact kinds with none left over — 6 artifacts in context, 20 in behaviour, 16 in rules and language, 31 in commitments — and 180 of the 196 relationships cross bands in only six distinct band-pair directions, so the arrangement carries real signal. "What does this artifact connect to" is answered only by anchoring on that artifact, because a relationship is meaningless without a subject.

There is deliberately no fourth unstructured whole-model view. It would answer no question the other three leave open: composition and traceability are answered better by aggregation, topology is answered better by bands, and an artifact's connections are answered better by anchoring. What it would reliably reproduce is the original problem — every node and every edge rendered at once, at a scale where the measurements show that becomes 3,290 edges — so retaining it as an "expert view" would preserve the failure under a different label. The layered map takes that role instead, and earns it by filtering, grouping, collapsing and reporting exactly what it has hidden. An expert needs a view that stays readable at scale, not one that stops being readable precisely when expertise is required.

Fixing the band assignment in the product, rather than deriving it per model or exposing it as configuration, is what makes the layered map mean the same thing everywhere. A reader who has learned to read one product's map can read another's; two people comparing products are comparing the same axes; and the projection cannot be quietly re-tuned into telling a more flattering story about a particular model. The cost is that a new artifact kind cannot be placed until the product decides where it belongs — which is the correct cost, because that decision is a semantic one about the methodology and belongs in a Product Change rather than in a configuration file.

Band order is explicitly not a direction of flow. The measured edges run behaviour to rules, behaviour to context, commitments to behaviour and rules to context: not a monotone top-to-bottom cascade. Stating that bands carry no lifecycle or causal meaning, and requiring the authored direction to survive band crossing, prevents the layout from rewriting the model's semantics into a tidier story than the model tells — the same failure mode as fabricating importance, arriving through geometry instead of through labels.

Grouping and collapsing high-degree neighbourhoods with exact counts is what keeps the most connected artifacts usable. The current baseline's busiest artifact has 27 relationships and the synthetic ten-times model reaches 171; in both cases a reader is better served by "governed-by: 6 use cases" with the option to open it than by 27 or 171 simultaneous entries. Showing the exact count rather than "many" keeps the collapsed state honest — the reader knows precisely what they are choosing not to look at.

The always-available relationship list exists because a drawing is the one thing some readers cannot use, and because the relationships are the substance rather than the illustration. If the list is complete, the visual is an accelerator; if the visual is the only path, the substance is conditional on eyesight and a pointing device.

Determinism of arrangement follows the product's existing determinism commitment into the reading experience: a layout that shifts between openings makes two readers unable to describe the same picture to each other, and makes a snapshot's visual output untestable.

## Acceptance Scenarios

- The snapshot is inspected for its projections. Exactly three exist — kind-level aggregate, layered model map, focused neighbourhood — and no control anywhere opens an unstructured drawing of the whole model.
- The reader opens the kind-level projection and can state which kinds govern which, which derive from which, and how many relationships each combination holds. The counts match the compiled graph exactly.
- The reader opens the layered map for the current baseline. Actors and bounded contexts appear in Product context; journeys and use cases in Product behaviour; business rules and domain terms in Rules and language; functional requirements, quality requirements and constraints in Product commitments.
- The same band assignment is observed in a snapshot generated from an unrelated product model with different kind proportions; nothing in either file or its configuration changes it.
- Nothing in the layered map states or implies that one band precedes, causes, depends on or supersedes another. A relationship running from a functional requirement up to a use case and one running from a use case across to a domain term both display their authored direction, regardless of where their bands sit relative to each other.
- The layered map is opened for the largest representative model. It does not render every node and edge; it offers filtering and grouping, and it states the exact number of artifacts and relationships currently collapsed or hidden. Expanding a group reveals exactly that number.
- A snapshot is generated from a model with no bounded contexts. The layered map renders the bands the model populates and does not show an empty band or invent one.
- The reader selects a use case and opens the focused projection. The anchor is unmistakable, incoming and outgoing relationships are told apart without relying on colour, and each edge names its relationship type.
- The reader selects the most connected artifact in the baseline (27 relationships). Neighbours appear as groups by relationship type and kind, groups large enough to overwhelm the view are collapsed with their exact counts, and nothing expands until the reader expands it.
- With the visual projection hidden or unavailable, the reader can still read every incoming and outgoing relationship of the selected artifact, with type and direction, as a labelled list.
- The reader selects a node in the layered map, leaves the projection, and finds that node is the page's selected artifact.
- A projection is inspected against `prodshape graph` output: every node, relationship and direction it draws exists in the compiled graph, and it draws nothing else.
- Two snapshots generated from identical model content on different platforms produce identical projection arrangements.
