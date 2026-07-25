# product-changes Specification

## Purpose

The Product Change overlay lifecycle: draft through approval, implementation and terminal states, with overlay validation.

## Requirements

### Requirement: Product Changes compile as overlays without touching the baseline

`product-definition change validate <ID>` (and `validate --change <ID>`) SHALL compile an overlay
— the baseline with the change's additions added, modifications replaced by their proposed
future-state artifacts and removals deleted — and run full structural validation over that overlay
graph, while no baseline file is read differently, modified or moved.

#### Scenario: Overlay validates a proposed artifact

- **WHEN** a change proposes a use case referencing a baseline actor
- **THEN** the overlay resolves the reference and validation succeeds with the baseline unchanged

#### Scenario: Modified artifact replaces its baseline version

- **WHEN** a change modifies JRN-X with a proposed future state adding a step
- **THEN** the overlay contains the proposed journey and validation checks the new step's target

### Requirement: Operation errors are detected

Change validation SHALL report: additions whose IDs already exist in the baseline (PRODUCT020),
modifications of IDs absent from the baseline (PRODUCT021), removals of IDs absent from the
baseline (PRODUCT022), overlays producing duplicate IDs (PRODUCT023), removals leaving dangling
references from active overlay artifacts (PRODUCT024), and mismatches between `operations` and the
`proposed/` directory in either direction (PRODUCT026).

#### Scenario: Addition collides with the baseline

- **WHEN** operations.add lists an ID that already exists in the baseline
- **THEN** PRODUCT020 is reported naming the colliding ID

#### Scenario: Removal leaves a dangling reference

- **WHEN** operations.remove deletes a business rule still referenced by an active overlay use case
- **THEN** PRODUCT024 is reported with the referencing artifact and field

#### Scenario: Proposed artifact not declared

- **WHEN** a file exists under proposed/ whose ID appears in neither operations.add nor operations.modify
- **THEN** PRODUCT026 is reported

### Requirement: Concurrent changes must not overlap

Validation of any active change SHALL cross-check all other active changes and report overlapping
`modify` or `remove` operations as PRODUCT025 naming both changes.

#### Scenario: Two changes modify one artifact

- **WHEN** two active changes both list UC-X under operations.modify
- **THEN** PRODUCT025 is reported for the validated change, naming the other change

### Requirement: Approved changes with open questions warn

Validation SHALL report warning PRODUCT108 for a change whose status is `approved` or later while
its Open Questions body section still contains unresolved entries.

#### Scenario: Approval with open questions

- **WHEN** an approved change's Open Questions section contains list entries
- **THEN** PRODUCT108 is reported as a warning
