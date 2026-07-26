# cli — delta

## ADDED Requirements

### Requirement: The allowed frontmatter for a kind is available from the command line

The CLI SHALL expose `prodshape schema [kind]`, printing the allowed frontmatter for one document
kind, or listing every kind with its ID prefix when the argument is omitted. Output SHALL be derived
from the bundled schemas so it cannot disagree with validation, and SHALL be available as text and
as `--format json` under a stable schema identifier.

The command SHALL NOT require a product repository: it is a reference lookup over bundled data, and
it is needed before initialization. `kind` SHALL accept the frontmatter `type` value and the
artifact ID prefix, case-insensitively; no other alias SHALL be accepted, because the specification
does not define one. An unknown kind SHALL exit 2 as an invalid invocation, listing the known kinds.

#### Scenario: Reference lookup outside a repository

- **WHEN** `prodshape schema actor` runs in a directory with no product definition
- **THEN** it prints the actor frontmatter contract and exits 0

#### Scenario: ID prefix accepted as an alias

- **WHEN** `prodshape schema UC` runs
- **THEN** it prints the use-case contract, identically to `prodshape schema use-case`

#### Scenario: Unknown kind rejected as an invalid invocation

- **WHEN** `prodshape schema usecase` runs
- **THEN** the command exits 2 and reports the known kinds
