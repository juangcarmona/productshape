# distribution — delta

## ADDED Requirements

### Requirement: The recommended model layout is scaffolded and committable

Initialization SHALL scaffold one directory per artifact kind under the model directory, and the three change lifecycle directories, and SHALL place a tracked placeholder file in each so the structure survives a commit — Git does not track empty directories.

The per-kind layout SHALL be a recommendation, not a requirement: artifact discovery walks the model directory recursively and keys on the frontmatter `type`, so no diagnostic SHALL be produced for an artifact in any other location under the model directory. Initialization SHALL offer `--flat` to opt out of the per-kind directories, and SHALL still create the model directory itself so validation has a directory to read.

The change lifecycle directories SHALL NOT be affected by `--flat`: they are read by change discovery and written by promotion, and are not taxonomy.

The scaffolded directories SHALL be the same set that promotion writes into, verified by a check rather than by convention.

#### Scenario: Structure survives a fresh clone

- **WHEN** a newly initialized repository is committed and cloned
- **THEN** every scaffolded directory is present

#### Scenario: Artifacts validate outside the recommended layout

- **WHEN** an artifact is placed directly under the model directory rather than its kind directory
- **THEN** validation reports no diagnostic about its location

#### Scenario: Flat layout still validates

- **WHEN** a repository is initialized with `--flat`
- **THEN** the model directory exists with no per-kind subdirectories, and `validate` exits 0

#### Scenario: Scaffold and promotion targets cannot diverge

- **WHEN** the scaffold list and the promotion target map are compared
- **THEN** they contain the same directories, and a change to either alone fails the check
