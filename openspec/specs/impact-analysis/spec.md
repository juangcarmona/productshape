# impact-analysis Specification

## Purpose

Structural impact traversal over the product graph in both directions.

## Requirements

### Requirement: Structural impact is deterministic and clearly labeled

`product-definition impact <ID>` SHALL traverse the compiled graph distinguishing direct from transitive reachability and incoming from outgoing edges, honour `--depth` and `--direction`, and present results as structural impact with no semantic claim.

{pdac:cite id="FR-IMPACT-001" digest="sha256:4fdcb320229452fdb9edcc4017a34c60c00e34eb4f14b25b00f3bbbf344ad8a8"}

{pdac:cite id="UC-IMPACT-001" digest="sha256:c36c3450af4e2dfbdb22bf4d240825057cbc04a39fd72e4824bbe4bae5eee539"}

#### Scenario: Direct versus transitive

- **WHEN** impact runs on a business rule referenced by a use case that a journey includes
- **THEN** the use case is reported as direct incoming impact and the journey as transitive

#### Scenario: Depth limit

- **WHEN** `--depth 1` is passed
- **THEN** only direct neighbours are reported

### Requirement: Inspect reports the full local picture of one artifact

`product-definition inspect <ID>` SHALL report the artifact's metadata, canonical path, content digest, outgoing relationships and derived incoming relationships, and SHALL fail clearly on an unknown ID. It SHALL NOT claim to report in-flight work that the command does not inspect.

{pdac:cite id="FR-INSPECT-001" digest="sha256:ca3cfa5a689ff34cae3df0a22b178f115516befccda7f3786ddfe88a9d62b7b7"}

{pdac:cite id="UC-INSPECT-001" digest="sha256:9534181e055ab2ed438d61424dfa4af110d7ed2ebe2e95546f45e5737b96046c"}

#### Scenario: Incoming relationships shown

- **WHEN** inspect runs on an actor
- **THEN** the journeys and use cases referencing it appear as derived incoming relationships

#### Scenario: Unknown ID

- **WHEN** inspect runs with an ID that does not exist
- **THEN** the command exits non-zero naming the unknown ID

#### Scenario: Content digest shown

- **WHEN** an artifact is inspected so a consumer can cite it
- **THEN** inspect reports the artifact's current content digest
