# snapshot-generation — delta

## MODIFIED Requirements

### Requirement: The layered model map arranges artifacts in four fixed bands

The map SHALL present the product as a **Product Landscape**: one persistent spatial arrangement placing
real artifacts in four bands, permanently visible, assigning every artifact kind as follows. Product
context holds Actors and Bounded Contexts; Product behaviour holds Journeys and Use Cases; Rules and
language holds Business Rules and Domain Terms; Product commitments holds Functional Requirements, Quality
Requirements and Constraints. This assignment is owned by the product, SHALL be identical for every model
the snapshot projects, and SHALL NOT be configurable by an adopter or derived per model. Only bands the
model populates SHALL be rendered.

Bands SHALL organize the view only. Band membership and band order SHALL NOT imply lifecycle stage,
sequence, precedence, causality, dependency or relationship direction, and the landscape SHALL NOT present
them as doing so.

Every artifact SHALL be present as its own stable, individually reachable node. An artifact SHALL NOT be
reduced to an anonymous mark, SHALL NOT be represented only by a count, SHALL NOT be aggregated away, and
SHALL NOT be silently omitted. The reader SHALL NOT be required to scope the model before entering the
landscape.

A node SHALL present the artifact's human-readable title as its primary identity whenever it is shown at
readable detail, with kind and identifier available as secondary information. Artifact-kind colour SHALL be
an accent rather than a large filled surface. Simultaneous legibility of every title in a viewport fitted
to the whole product SHALL NOT be required.

The landscape SHALL be navigable to readable detail by panning, zooming and returning to a fitted view,
each operable by pointer and by keyboard. Pan and zoom are reader state and SHALL NOT be persisted
anywhere.

An artifact's position SHALL be derived from the compiled model alone and SHALL be identical for identical
model content. Selecting a node SHALL make that artifact the page's single selected artifact; the
landscape SHALL NOT hold a selection of its own. The landscape SHALL NOT draw a node the compiled graph
does not contain, and SHALL NOT imply importance, centrality, health, ownership, sequence or ordering the
model does not record.

At each model scale named in the scalability requirement, on its named reference environment, the
landscape SHALL satisfy five integrity properties: deterministic stable placement, individual
reachability, individual selection, no clipping, and no node overlap. The number of artifacts
aggregated away SHALL be recorded separately and SHALL be zero.

Whole-landscape rendering SHALL complete within 250 ms at the 95th percentile at each of those scales,
covering the interval from the landscape being requested until it is ready for interaction. The measured
interval and the sampling protocol producing the percentile are defined by the measurement harness.

#### Scenario: Every artifact kind lands in its band

- **WHEN** the reader opens the landscape for a model containing all nine artifact kinds
- **THEN** actors and bounded contexts appear in Product context, journeys and use cases in Product
  behaviour, business rules and domain terms in Rules and language, and the three requirement kinds in
  Product commitments

#### Scenario: The assignment does not vary by model

- **WHEN** the landscape is opened for two unrelated product models with different kind proportions
- **THEN** the band assignment is the same in both, and nothing in either file or its configuration can
  change it

#### Scenario: Only populated bands appear

- **WHEN** the landscape is opened for a model containing no bounded contexts
- **THEN** the bands the model populates are rendered, with no empty band shown and none invented

#### Scenario: Bands carry no lifecycle or causal meaning

- **WHEN** the landscape is inspected for what it says about the relationship between bands
- **THEN** nothing states or implies that one band precedes, causes, depends on or supersedes another

#### Scenario: Every artifact is individually represented

- **WHEN** the landscape is opened for any model
- **THEN** every artifact in the compiled model has its own node, none is replaced by a count or an
  anonymous mark, and no scoping was required to reach that state

#### Scenario: A node identifies itself by title at readable detail

- **WHEN** a node is inspected or viewed at a zoom where its label renders
- **THEN** its human-readable title is its primary identity, with kind and identifier available, and its
  kind colour is an accent rather than a fill

#### Scenario: Readable detail is reachable by pointer and by keyboard

- **WHEN** the reader pans, zooms and refits the landscape, first with pointer and controls and then with
  the keyboard
- **THEN** the view moves and returns to a fitted view by either means

#### Scenario: Placement is stable and deterministic

- **WHEN** the landscape is rendered twice from identical model content, and again after the reader has
  panned and zoomed
- **THEN** every artifact occupies the same position each time

#### Scenario: The landscape holds at every named reference scale

- **WHEN** the landscape is measured at each named reference model scale on the named reference
  environment
- **THEN** every artifact holds a stable position, is individually reachable and can be selected;
  landscape rendering stays within its measured budget; and no node or label is clipped, overlapping or
  inaccessible
