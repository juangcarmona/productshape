# snapshot-generation — delta

## ADDED Requirements

### Requirement: Relationships are grouped by type and kind with exact counts

An artifact's relationships SHALL be presented grouped within each direction, by relationship type and by the artifact kind at the other end, rather than as one undifferentiated list. Every group SHALL state the exact number of relationships it contains. Grouping and ordering SHALL be derived from the compiled graph and SHALL be identical for identical model content.

#### Scenario: Neighbours arrive grouped, not spilled

- **WHEN** a reader selects an artifact that declares several relationships of different types
- **THEN** its relationships appear in groups labelled by relationship type and by the artifact kind at the other end, each stating how many relationships it contains

#### Scenario: Counts are faithful to the compiled graph

- **WHEN** the groups shown for an artifact are compared with the relationships the compiled graph records for it
- **THEN** the group counts sum to exactly that artifact's relationships in that direction, with none missing and none invented

#### Scenario: Grouping is deterministic

- **WHEN** two snapshots are generated from identical model content
- **THEN** the same artifact's groups appear in the same order with the same members

### Requirement: Large relationship groups start collapsed and expand on request

A relationship group large enough to overwhelm the view SHALL start collapsed, showing its exact count rather than its members, and SHALL reveal its members only when the reader expands it. Expansion SHALL be operable by keyboard, and the collapsed or expanded state SHALL be exposed to assistive technology as state rather than conveyed only by appearance. A group small enough to read at a glance SHALL be shown expanded, so nothing is hidden without reason.

#### Scenario: A high-degree artifact stays readable

- **WHEN** a reader selects the most connected artifact in the model
- **THEN** its neighbours appear as counted groups, the large ones collapsed, and nothing expands until the reader expands it

#### Scenario: Expanding reveals exactly what was counted

- **WHEN** the reader expands a collapsed group that reported a count
- **THEN** exactly that many related artifacts are revealed, each selectable in one step

#### Scenario: Expansion is keyboard-operable and exposed as state

- **WHEN** the reader reaches a collapsed group by keyboard and activates it
- **THEN** it expands, and its expanded state is reported to assistive technology

### Requirement: A complete non-visual relationship list is always available

Every incoming and outgoing relationship of the selected artifact SHALL be readable as text, with its relationship type and its direction, without requiring any visualization. This list SHALL be complete: no relationship the compiled graph records for the artifact may be reachable only through a drawing.

#### Scenario: Relationships are understandable with no graph

- **WHEN** a reader who cannot or does not use a visualization selects an artifact
- **THEN** every relationship in both directions is readable as text, with type and direction, and each related artifact is selectable

#### Scenario: Absence is reported rather than left blank

- **WHEN** the selected artifact has no relationships in a direction
- **THEN** that direction states that there are none
