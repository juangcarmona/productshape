# distribution — delta

## ADDED Requirements

### Requirement: Initialization can be reported without being applied

Initialization SHALL be expressible as a plan computed without modifying the filesystem, classifying every target as one of: created (absent), preserved (present and not to be replaced), regenerated (present, owned by the installation lock, unmodified, and to be rewritten identically), overwritten (present and to be replaced because force is set), or a conflict (present, not owned by the lock or modified by hand).

The plan SHALL carry the content it would write, so that applying it writes exactly what was reported. The number of files a reported plan would create SHALL equal the number applying it creates.

A plan carrying conflicts SHALL NOT be applied. Reporting a plan SHALL exit non-zero when conflicts are present, so the report is usable as a pre-installation gate.

The provider preflight SHALL be shared between reporting and applying rather than duplicated.

#### Scenario: Reporting writes nothing

- **WHEN** initialization is reported for an empty repository
- **THEN** every path it would create is listed and no file is written

#### Scenario: Populated repository reported without loss

- **WHEN** initialization is reported for a repository that is already initialized
- **THEN** existing authored files are reported as preserved, managed files as regenerated, and nothing as overwritten

#### Scenario: Report and application agree

- **WHEN** a plan is reported and then applied to the same repository
- **THEN** the created count reported equals the created count applied

### Requirement: Health checks cover model validation and authoring templates

The health report SHALL include the outcome of baseline validation — error count, warning count and artifact count — when the caller supplies it, and SHALL NOT compute it itself, so the distribution package remains independent of the validation core. Producing the report SHALL NOT write any file.

The health report SHALL include the state of the authoring templates, distinguishing three cases: all present, none present, and some present. A repository with no installed templates SHALL be reported as healthy with an informational detail, because authoring from the specification without installed templates is legitimate. A partial set SHALL be reported as a failure.

#### Scenario: Validation outcome reported

- **WHEN** the health report is produced for a repository whose model validates cleanly
- **THEN** the model validation check passes and states the artifact count

#### Scenario: Diagnosis does not mutate

- **WHEN** the health report is produced
- **THEN** no generated output is written as a side effect

#### Scenario: Absent templates are not a failure

- **WHEN** a repository has no installed authoring templates
- **THEN** the templates check passes with an informational detail

#### Scenario: Partial templates are a failure

- **WHEN** some but not all authoring templates are present
- **THEN** the templates check fails naming the missing ones
