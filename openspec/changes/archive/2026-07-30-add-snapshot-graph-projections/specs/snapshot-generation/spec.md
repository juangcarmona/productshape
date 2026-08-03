# snapshot-generation — delta

## MODIFIED Requirements

### Requirement: Graph visualization with node-selection highlighting

The page SHALL provide exactly three graph projections — the kind-level aggregate, the layered model map and the focused neighbourhood — and SHALL NOT provide an unstructured drawing of the whole graph. No projection SHALL be rendered in the opening view. Selecting a node in any projection SHALL make that artifact the page's single selected artifact; a projection SHALL NOT hold a selection of its own. Every node, relationship and direction a projection draws SHALL exist in the compiled graph, no projection SHALL imply importance, health, ownership or ordering the model does not record, and identical model content SHALL produce identical arrangements.

#### Scenario: Exactly three projections, and no whole-graph drawing

- **WHEN** the snapshot is inspected for the views it offers
- **THEN** the kind-level aggregate, the layered model map and the focused neighbourhood are present, and no control anywhere opens an unstructured drawing of the entire graph

#### Scenario: Selecting a node moves the page's one selection

- **WHEN** the reader selects a node in either visual projection
- **THEN** that artifact becomes the page's single selected artifact, and leaving the projection keeps it selected

#### Scenario: Projections invent nothing

- **WHEN** a projection is compared with the compiled graph
- **THEN** every node, relationship and direction it draws exists in the graph, and it draws nothing else

## ADDED Requirements

### Requirement: The focused neighbourhood orbits relationship groups around the selected artifact

The focused neighbourhood SHALL anchor on the page's selected artifact and show one hop. What surrounds the anchor SHALL be the artifact's relationship groups rather than its individual artifacts: each satellite SHALL state its relationship type, the artifact kind at the other end, and the exact number of relationships it represents. Incoming and outgoing groups SHALL occupy opposite sides of the anchor, so direction is carried by position and remains determinable with colour removed.

Opening a satellite SHALL reveal its members while leaving the other satellites in place. A group small enough to read at a glance SHALL arrive already open. Activating a group SHALL expand or collapse it and SHALL NOT change the selected artifact; activating a member SHALL select that artifact. Both SHALL be operable by keyboard, and expanded state SHALL be exposed to assistive technology as state.

A satellite or member SHALL reveal its identity on hover, and SHALL reveal the same on keyboard focus, so nothing needed is available only to a pointer. The equivalent relationship list SHALL remain available whether or not this projection is used.

#### Scenario: Groups orbit, not artifacts

- **WHEN** the reader opens the focused neighbourhood for an artifact with several relationship types
- **THEN** one satellite appears per relationship type and other-end kind, each stating its exact count

#### Scenario: The hardest artifact stays legible

- **WHEN** the reader opens the focused neighbourhood for the most connected artifact in the model
- **THEN** the projection shows one satellite per group rather than one node per relationship, and its size tracks the number of relationship types rather than the artifact's degree

#### Scenario: Direction is positional

- **WHEN** an artifact has both incoming and outgoing relationships, and the projection is viewed with colour removed
- **THEN** incoming and outgoing groups remain distinguishable by which side of the anchor they occupy

#### Scenario: Opening a group leaves the rest in place

- **WHEN** the reader opens one satellite
- **THEN** its members fan out beside it and every other satellite stays where it was

#### Scenario: The two gestures do different things

- **WHEN** the reader activates a group, and then activates one of its members
- **THEN** the group expands or collapses without changing the selected artifact, and the member becomes the selected artifact

#### Scenario: Nothing is pointer-only

- **WHEN** the reader moves through satellites and members by keyboard
- **THEN** each reveals the same identity that hovering it reveals

### Requirement: The layered model map arranges artifacts in four fixed bands

The layered model map SHALL place real artifacts in four bands, assigning every artifact kind as follows: Product context holds Actors and Bounded Contexts; Product behaviour holds Journeys and Use Cases; Rules and language holds Business Rules and Domain Terms; Product commitments holds Functional Requirements, Quality Requirements and Constraints. This assignment is owned by the product, SHALL be identical for every model the snapshot projects, and SHALL NOT be configurable by an adopter or derived per model.

Bands SHALL organize the view only. Band membership and band order SHALL NOT imply lifecycle stage, causality, sequence, precedence or dependency, and the projection SHALL NOT present them as doing so. Every relationship SHALL display its authored direction, including where it crosses bands and where it runs counter to band order. Only bands the model populates SHALL be rendered.

The map SHALL remain legible as the model grows: it SHALL support filtering, SHALL group and collapse, SHALL state the exact count of whatever it has hidden or collapsed, and SHALL NOT render every node and every edge by default for a large model.

#### Scenario: Every kind lands in its band

- **WHEN** the reader opens the layered map for a model containing all nine artifact kinds
- **THEN** actors and bounded contexts appear in Product context, journeys and use cases in Product behaviour, business rules and domain terms in Rules and language, and the three requirement kinds in Product commitments

#### Scenario: The assignment does not vary by model

- **WHEN** the layered map is opened for two unrelated product models with different kind proportions
- **THEN** the band assignment is the same in both, and nothing in either file or its configuration can change it

#### Scenario: Bands carry no lifecycle or causal meaning

- **WHEN** the layered map is inspected for what it says about the relationship between bands
- **THEN** nothing states or implies that one band precedes, causes, depends on or supersedes another

#### Scenario: Authored direction survives band crossing

- **WHEN** a relationship runs from a band lower in the order to one higher in it
- **THEN** it displays the direction the model authored, not the direction the band order suggests

#### Scenario: Only populated bands appear

- **WHEN** the map is opened for a model containing no bounded contexts
- **THEN** the bands the model populates are rendered, with no empty band shown and none invented

#### Scenario: It holds back rather than spilling at scale

- **WHEN** the map is opened for a materially larger model
- **THEN** it does not render every node and edge, it offers filtering, and it states the exact number of artifacts and relationships it has collapsed or hidden

### Requirement: The active graph mode is part of the addressable state

The active projection SHALL be represented in the address, so a projection view is directly linkable and is restored by browser Back and Forward alongside the selected artifact.

#### Scenario: A projection view is linkable

- **WHEN** the reader opens a projection and copies the address
- **THEN** opening that address restores the same projection and the same selected artifact

#### Scenario: Back restores the previous projection

- **WHEN** the reader moves between projections and presses Back
- **THEN** the previous projection and selection are restored
