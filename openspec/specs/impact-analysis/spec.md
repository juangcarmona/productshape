# impact-analysis Specification

<!-- pdac-scope: cited -->

## Purpose

Structural impact traversal over the product graph in both directions.

## Requirements

### Requirement: Structural impact is deterministic and clearly labeled

`product-definition impact <ID>` SHALL traverse the compiled graph distinguishing direct from transitive reachability and incoming from outgoing edges, honour `--depth` and `--direction`, and present results as structural impact with no semantic claim.

{pdac:cite id="FR-IMPACT" digest="sha256:d8963994d38c88aa8d701b52d8208cb2bea5e4fef8aafbf50d1108da6bb8e00a"}

{pdac:cite id="UC-IMPACT" digest="sha256:d544afd2aa8ffb32d243cfce1f4c213d97f453f9c18a1bb04f4af76250e9bfb9"}

#### Scenario: Direct versus transitive

- **WHEN** impact runs on a business rule referenced by a use case that a journey includes
- **THEN** the use case is reported as direct incoming impact and the journey as transitive

#### Scenario: Depth limit

- **WHEN** `--depth 1` is passed
- **THEN** only direct neighbours are reported

### Requirement: Inspect reports the full local picture of one artifact

`product-definition inspect <ID>` SHALL report the artifact's metadata, canonical path, content digest, outgoing relationships and derived incoming relationships, and SHALL fail clearly on an unknown ID. It SHALL NOT claim to report in-flight work that the command does not inspect.

{pdac:cite id="FR-INSPECT" digest="sha256:0f431eea26efe1bb48290926c26a8d744672e965fdec68d37ea245e5634a8da8"}

{pdac:cite id="UC-INSPECT" digest="sha256:04c6c89c9e90f1e0aa4f690a73555357f3e3a37d20f02440cbfcee14acf5685d"}

#### Scenario: Incoming relationships shown

- **WHEN** inspect runs on an actor
- **THEN** the journeys and use cases referencing it appear as derived incoming relationships

#### Scenario: Unknown ID

- **WHEN** inspect runs with an ID that does not exist
- **THEN** the command exits non-zero naming the unknown ID

#### Scenario: Content digest shown

- **WHEN** an artifact is inspected so a consumer can cite it
- **THEN** inspect reports the artifact's current content digest
