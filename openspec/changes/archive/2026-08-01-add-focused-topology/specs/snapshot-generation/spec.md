# snapshot-generation — delta

## REMOVED Requirements

### Requirement: The layered model map arranges artifacts in four fixed bands

**Reason**: CHG-SNAPSHOT-004 withdraws the whole-product map: placement a reader can derive from
each identifier carries no topological meaning, and no arrangement may replace it in which every
artifact is rendered simultaneously. Its routes resolve in place to the Focused Topology.

## MODIFIED Requirements

### Requirement: Graph visualization with node-selection highlighting

The page SHALL provide exactly two graph projections — the kind-level aggregate and the Focused
Topology — and SHALL NOT provide a drawing of the whole graph or any arrangement in which artifact
kind determines position. No projection SHALL be rendered in the opening view. Selecting a node in
the projection SHALL make that artifact the page's single selected artifact.

The Focused Topology SHALL be local, bounded and progressive: anchored on the selected artifact,
its immediate canonical relationships grouped by relationship meaning and artifact type with
complete counts, direction distinguished other than by colour alone, expansion only on deliberate
action. Its disclosure SHALL be carried in the address and SHALL replace the history entry on
toggle; refocusing on a member SHALL be a navigation to a newly focused projection with disclosure
reset — the traversal never accumulates. A group opened past the legibility threshold SHALL render
as a structured list below the drawing, named as such, with every entry selectable.

#### Scenario: Exactly two projections

- **WHEN** the generated page is inspected and every control exercised
- **THEN** only the kind-level aggregate and the Focused Topology exist, and the withdrawn map
  routes resolve in place to the Focused Topology

#### Scenario: Disclosure is addressable, not history

- **WHEN** a group is toggled and the resulting address is opened in a fresh window
- **THEN** the same groups are open, and toggling never grew the browser history

#### Scenario: Refocus resets

- **WHEN** a member is selected from an expanded projection
- **THEN** a newly focused projection appears with default disclosure, and Back returns to the
  previous focus with its disclosure intact

#### Scenario: Dense sets stay legible

- **WHEN** a group larger than the legibility threshold is opened
- **THEN** it is presented as a structured list below the drawing rather than a fan, its
  accessible name says so, and every entry remains selectable
