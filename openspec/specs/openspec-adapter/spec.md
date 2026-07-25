# openspec-adapter Specification

## Purpose

Sidecar-based handoff placement and coverage validation inside native OpenSpec changes, without invading their ownership.

## Requirements

### Requirement: Sidecars integrate without touching native OpenSpec artifacts

The adapter SHALL place `product-handoff.yaml` and `product-context.md` inside a named native
OpenSpec change directory (`openspec/changes/<name>/`), regenerate them without modifying
`proposal.md`, `design.md`, `tasks.md` or `specs/`, and preserve product artifact IDs throughout.

#### Scenario: Sidecar placement

- **WHEN** handoff create runs with --adapter openspec --sdd-change <name>
- **THEN** the sidecars exist in that change directory and every native file is byte-unchanged

### Requirement: Requirement coverage is validated deterministically

`product-definition coverage check <sdd-change-dir>` SHALL validate `product-coverage.yaml`
against its schema, verify it references the sidecar handoff, report every requirement the handoff
implements that lacks a `covered` mapping (PRODUCT043), and verify that referenced specification
and verification paths exist — never inferring evidence from file names.

#### Scenario: Uncovered requirement blocks closure

- **WHEN** the handoff implements FR-X and the coverage file lacks FR-X or maps it as uncovered
- **THEN** coverage check reports PRODUCT043 for FR-X and exits 1

#### Scenario: Complete coverage passes

- **WHEN** every implemented requirement is covered with existing specification and verification paths
- **THEN** coverage check exits 0

### Requirement: Missing evidence paths are errors

The adapter SHALL report an error naming the missing path for every coverage entry whose
`specification` or `verification` path does not exist in the repository.

#### Scenario: Dangling evidence path

- **WHEN** a coverage entry references a test file that does not exist
- **THEN** coverage check reports the missing path and exits 1
