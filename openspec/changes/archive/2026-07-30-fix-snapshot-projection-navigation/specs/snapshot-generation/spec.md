# snapshot-generation — delta

## MODIFIED Requirements

### Requirement: The focused neighbourhood orbits relationship groups around the selected artifact

The focused neighbourhood SHALL anchor on the page's selected artifact and show one hop. What surrounds the anchor SHALL be the artifact's relationship groups rather than its individual artifacts: each satellite SHALL state the artifact kind at the other end and the exact number of relationships it represents, and the relationship type SHALL annotate the line connecting it to the anchor. Incoming and outgoing groups SHALL occupy opposite sides of the anchor, so direction is carried by position and remains determinable with colour removed.

The arrangement SHALL be re-allocated whenever a group is opened or closed, so that an opened group is given the room its members need. No satellite, member or label SHALL overlap another, and nothing SHALL be placed outside the visible canvas, at any combination of open and closed groups. A group small enough to read at a glance SHALL arrive already open.

Activating a group SHALL expand or collapse it and SHALL NOT change the selected artifact; activating a member SHALL select that artifact. Both SHALL be operable by keyboard, and expanded state SHALL be exposed to assistive technology as state.

The projection SHALL support panning, zooming and returning to a fitted view, each operable by pointer and by keyboard. Pan and zoom are reader state and SHALL NOT be persisted anywhere.

A satellite or member SHALL reveal its identity on hover, and SHALL reveal the same on keyboard focus, so nothing needed is available only to a pointer. The equivalent relationship list SHALL remain available whether or not this projection is used.

Placement SHALL remain a pure function of the model and of which groups are open: identical model content with identical groups open SHALL produce an identical arrangement.

#### Scenario: Groups orbit, not artifacts

- **WHEN** the reader opens the focused neighbourhood for an artifact with several relationship types
- **THEN** one satellite appears per relationship type and other-end kind, each stating its exact count, with the relationship type labelling the line rather than the node

#### Scenario: Expanding re-organises rather than colliding

- **WHEN** the reader expands a group large enough that its members would not fit its previous sector
- **THEN** the arrangement is re-allocated so the expanded group has room, and no satellite, member or label overlaps another

#### Scenario: Nothing is drawn off-canvas

- **WHEN** every group of the most connected artifact in the model is expanded
- **THEN** every satellite, member and label remains inside the visible canvas

#### Scenario: Collapsing returns the room

- **WHEN** the reader collapses a group they had expanded
- **THEN** the arrangement returns to what it was before the group was opened

#### Scenario: The canvas can be navigated

- **WHEN** the reader drags, scrolls or uses the zoom and fit controls, and then does the same with the arrow keys, plus, minus and zero
- **THEN** the view pans, zooms and returns to a fitted view by either means

#### Scenario: The hardest artifact stays legible

- **WHEN** the reader opens the focused neighbourhood for the most connected artifact in the model
- **THEN** the projection shows one satellite per group rather than one node per relationship, and its size tracks the number of relationship types rather than the artifact's degree

#### Scenario: Direction is positional

- **WHEN** an artifact has both incoming and outgoing relationships, and the projection is viewed with colour removed
- **THEN** incoming and outgoing groups remain distinguishable by which side of the anchor they occupy

#### Scenario: The two gestures do different things

- **WHEN** the reader activates a group, and then activates one of its members
- **THEN** the group expands or collapses without changing the selected artifact, and the member becomes the selected artifact

#### Scenario: Nothing is pointer-only

- **WHEN** the reader moves through satellites and members by keyboard
- **THEN** each reveals the same identity that hovering it reveals
