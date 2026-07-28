## Purpose

Specify the generation of the Product Snapshot: a static, self-contained, read-only HTML page
projecting the whole product model for people without the repository, produced by
`prodshape graph --format html` — self-containment, determinism, revision stamping, honest
diagnostics, and readable by-kind rendering with status badges.

## Requirements

### Requirement: HTML is an output format of the graph command

The system SHALL generate a Product Snapshot when the graph command is invoked with the HTML
format (`prodshape graph --format html`). Generation SHALL produce exactly one self-contained
HTML file under the generated-output area and SHALL report the output path. Generation SHALL
never modify any authored file.

#### Scenario: Engineer generates a snapshot

- **WHEN** an engineer runs `prodshape graph --format html` in a repository with a valid product model
- **THEN** exactly one HTML file is written under the generated-output area and its path is reported

#### Scenario: Generation is read-only towards the model

- **WHEN** a snapshot is generated
- **THEN** no file under the product model directory is created, modified or deleted

### Requirement: The snapshot is one self-contained file

The generated page SHALL function completely when opened from local disk with no server and no
network access: no external scripts, styles, fonts, images or data are referenced. All CSS and
any data the page needs SHALL be embedded in the single file.

#### Scenario: Offline open from local disk

- **WHEN** the generated file is opened in a browser from `file://` with networking disabled
- **THEN** every capability of the page works and no network request is attempted

#### Scenario: No external references in the output

- **WHEN** the generated HTML is inspected
- **THEN** it contains no `http(s)://` resource references required for rendering

### Requirement: Every artifact is rendered, organized by kind, with a status badge

The page SHALL present all product artifacts organized by kind (actors, journeys, use cases,
business rules, domain terms, bounded contexts, functional requirements, quality requirements,
constraints). Each artifact's view SHALL render its Markdown body and its frontmatter metadata,
and SHALL display the artifact's status visibly (draft, active, deprecated, retired).

#### Scenario: Browse by kind

- **WHEN** a reader opens the snapshot
- **THEN** artifacts are grouped and navigable by kind, and every artifact of the model is present

#### Scenario: Status is visible

- **WHEN** a reader views any artifact
- **THEN** the artifact's status is displayed as a visible badge

### Requirement: The source revision is stamped on the page

The page SHALL display the source revision of the model it was generated from, placed where a
reader finds it without searching.

#### Scenario: Reader checks currency

- **WHEN** a reader opens the snapshot
- **THEN** the model's source revision is visible on the page without scrolling into artifact content

### Requirement: Generation is deterministic

Identical model content SHALL yield a byte-identical HTML file across runs and platforms. Output
SHALL NOT embed timestamps, random values, or environment-dependent content; artifact ordering
SHALL be stable; line endings SHALL be normalized.

#### Scenario: Double generation is byte-identical

- **WHEN** the snapshot is generated twice from the same commit
- **THEN** the two files are byte-identical

#### Scenario: Cross-platform stability

- **WHEN** the snapshot is generated from the same content on different platforms
- **THEN** the files are byte-identical

### Requirement: Generation reports honest diagnostics

When artifacts cannot be parsed, generation SHALL report diagnostics naming each affected file
and SHALL NOT emit a snapshot that silently omits part of the model.

#### Scenario: Unparseable artifact blocks silent omission

- **WHEN** one artifact file is unparseable and generation is attempted
- **THEN** a diagnostic names the file and no snapshot lacking the artifact is emitted silently

### Requirement: The page is read-only

The page SHALL offer no capability to create, edit, annotate or approve anything: no forms, no
editable fields, no controls that mutate state beyond client-side presentation.

#### Scenario: No mutating controls

- **WHEN** the generated page is inspected and exercised
- **THEN** nothing on it accepts input that creates, edits or approves product knowledge
