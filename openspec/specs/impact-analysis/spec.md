# impact-analysis Specification

## Purpose

Structural impact traversal over the product graph in both directions.

## Requirements

### Requirement: Structural impact is deterministic and clearly labeled

`product-definition impact <ID>` SHALL traverse the compiled graph distinguishing direct from transitive reachability and incoming from outgoing edges, honour `--depth` and `--direction`, and present results as structural impact with no semantic claim.

#### Scenario: Direct versus transitive

- **WHEN** impact runs on a business rule referenced by a use case that a journey includes
- **THEN** the use case is reported as direct incoming impact and the journey as transitive

#### Scenario: Depth limit

- **WHEN** `--depth 1` is passed
- **THEN** only direct neighbours are reported

### Requirement: Inspect reports the full local picture of one artifact

`product-definition inspect <ID>` SHALL report the artifact's metadata, canonical path, content digest, outgoing relationships and derived incoming relationships, and SHALL fail clearly on an unknown ID. It SHALL NOT claim to report in-flight work that the command does not inspect.

#### Scenario: Incoming relationships shown

- **WHEN** inspect runs on an actor
- **THEN** the journeys and use cases referencing it appear as derived incoming relationships

#### Scenario: Unknown ID

- **WHEN** inspect runs with an ID that does not exist
- **THEN** the command exits non-zero naming the unknown ID

#### Scenario: Content digest shown

- **WHEN** an artifact is inspected so a consumer can cite it
- **THEN** inspect reports the artifact's current content digest
