# Impact Analysis (Change Awareness)

## MODIFIED Requirements

### Requirement: Inspect reports the full local picture of one artifact

`product-definition inspect <ID>` SHALL report the artifact's metadata, canonical path, outgoing relationships and derived incoming relationships, SHALL additionally list the active Product Changes whose operations affect the artifact, the delivery slices implementing or affecting it and the handoffs referencing it, and SHALL fail clearly on an unknown ID.

#### Scenario: Incoming relationships shown

- **WHEN** inspect runs on an actor
- **THEN** the journeys and use cases referencing it appear as derived incoming relationships

#### Scenario: Unknown ID

- **WHEN** inspect runs with an ID that does not exist
- **THEN** the command exits non-zero naming the unknown ID

#### Scenario: Affecting change listed

- **WHEN** an active change modifies the inspected artifact
- **THEN** inspect lists that change ID under affecting changes
