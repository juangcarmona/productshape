# Requirement Coverage

## ADDED Requirements

### Requirement: Implemented requirements need resolvable coverage evidence before closure

The coverage check SHALL verify that every requirement the sidecar handoff implements is mapped in `product-coverage.yaml` to specification and verification evidence whose paths resolve, SHALL report every unmapped or uncovered requirement with PRODUCT043 before closure, and SHALL NOT infer coverage from file names or placement. Exposed as `product-definition coverage check <sdd-change>`; implements product requirement FR-COVERAGE-001 (CHG-TRACEABILITY-001 / SLI-TRACEABILITY-001).

#### Scenario: Uncovered requirement reported before closure

- **WHEN** the handoff implements a requirement that the coverage mapping omits or marks uncovered
- **THEN** the check reports PRODUCT043 naming the requirement and exits 1

#### Scenario: Dangling evidence path

- **WHEN** a coverage entry declares evidence at a path that does not exist
- **THEN** the check fails naming the path

#### Scenario: Deterministic pass on full coverage

- **WHEN** every implemented requirement is covered with resolvable evidence
- **THEN** the check exits 0 and repeated runs produce the identical report
