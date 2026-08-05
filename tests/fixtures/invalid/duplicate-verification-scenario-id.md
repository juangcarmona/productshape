---
id: FR-DUP-SCENARIO-001
type: functional-requirement
title: Requirement with duplicate verification scenario ids
status: draft
derived-from:
  - UC-FIXTURE-001
verification:
  - id: S1
    scenario: First scenario sharing the id
  - id: S1
    scenario: Second scenario sharing the id
---

## Requirement

The fixture MUST trigger a duplicate verification scenario id diagnostic.

## Rationale

Scenario ids must be unique within an artifact so a citation anchor resolves to exactly one scenario.

## Acceptance Scenarios

Validation reports PRODUCT005 on the `verification[].id` field.
