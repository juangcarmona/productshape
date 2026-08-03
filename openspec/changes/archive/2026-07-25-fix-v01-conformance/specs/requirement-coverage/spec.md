# requirement-coverage — delta

## MODIFIED Requirements

### Requirement: Implemented requirements need resolvable coverage evidence before closure

The coverage check SHALL verify that every requirement the sidecar handoff implements is mapped in `product-coverage.yaml` to specification and verification evidence whose paths resolve, SHALL report every unmapped or uncovered requirement with PRODUCT043 before closure, and SHALL NOT infer coverage from file names or placement. Entries with status `covered` or `partial` SHALL declare at least one specification path and at least one verification path — empty evidence arrays SHALL fail schema validation. Evidence paths SHALL be repository-relative or SDD-change-relative: absolute paths, paths containing `..` segments, and paths whose resolved form escapes the repository root SHALL be rejected. Coverage entries for requirements the handoff does not implement SHALL be reported with PRODUCT043. Exposed as `product-definition coverage check <sdd-change>`; implements product requirement FR-COVERAGE-001 (CHG-TRACEABILITY-001 / SLI-TRACEABILITY-001).

#### Scenario: Uncovered requirement reported before closure

- **WHEN** the handoff implements a requirement that the coverage mapping omits or marks uncovered
- **THEN** the check reports PRODUCT043 naming the requirement and exits 1

#### Scenario: Dangling evidence path

- **WHEN** a coverage entry declares evidence at a path that does not exist
- **THEN** the check fails naming the path

#### Scenario: Deterministic pass on full coverage

- **WHEN** every implemented requirement is covered with resolvable evidence
- **THEN** the check exits 0 and repeated runs produce the identical report

#### Scenario: Empty evidence rejected

- **WHEN** a coverage entry declares status covered with an empty specification or verification array
- **THEN** schema validation fails and the check exits 1

#### Scenario: Evidence escaping the repository rejected

- **WHEN** a coverage entry declares evidence at `../../outside-file` that exists outside the repository
- **THEN** the check fails naming the path as escaping the repository

#### Scenario: Unrelated coverage entry rejected

- **WHEN** the coverage mapping contains an entry for a requirement the handoff does not implement
- **THEN** the check reports PRODUCT043 naming the unrelated requirement
