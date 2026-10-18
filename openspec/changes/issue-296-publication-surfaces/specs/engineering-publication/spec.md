<!-- pdac-scope: cited -->

# Spec Delta

## Purpose

The engineering publication surface lets readers inspect distinct, source-aware outputs from ProductShape's own engineering process without treating a generated view as its canonical source.

## ADDED Requirements

### Requirement: Engineering outputs are presented as distinct publications

The portal MUST distinguish Product, architecture and E2E outputs and show only outputs that have been produced.
<!-- pdac:cite id="FR-ENGINEERING-PORTAL-001" digest="sha256:641a6d2ae3bbb10951584e3b2b648ba12b59c8aebab1f0e6787aed751f53b1c5" -->

#### Scenario: Product Snapshot remains distinct

- **WHEN** the Product Snapshot is available in the engineering portal
- **THEN** it is identified as a read-only projection of the Product Definition model and remains separate from architecture documentation and E2E reports

#### Scenario: Architecture Snapshot remains distinct

- **WHEN** ProductShape's Architecture Snapshot is available
- **THEN** the portal identifies it separately from the Product Snapshot and links to ProductShape's canonical architecture documentation

#### Scenario: Unavailable output is not implied

- **WHEN** an Architecture Snapshot or E2E report has not been produced
- **THEN** the portal does not display it as an available output or imply that a report or run exists

### Requirement: Published outputs identify their source

Each available snapshot MUST identify its source revision. Each E2E report MUST identify its originating commit or run and recorded result, and link to relevant source evidence.
<!-- pdac:cite id="FR-ENGINEERING-PORTAL-001" digest="sha256:641a6d2ae3bbb10951584e3b2b648ba12b59c8aebab1f0e6787aed751f53b1c5" -->

#### Scenario: Snapshot source revision is visible

- **WHEN** the reader opens an available Product Snapshot or Architecture Snapshot
- **THEN** the portal identifies the source revision represented by that snapshot and links to its canonical source

#### Scenario: E2E run and result are visible

- **WHEN** an E2E journey report is published
- **THEN** the portal identifies its originating commit or run, reports the result recorded by that run, and links to the report's source evidence
