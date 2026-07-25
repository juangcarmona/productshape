# artifact-parsing Specification

## Purpose

TBD - created by archiving change establish-product-definition-foundation. Update Purpose after archive.

## Requirements

### Requirement: Markdown artifacts parse deterministically

`packages/core` SHALL parse a Markdown artifact file into YAML frontmatter and body, reporting invalid YAML as a diagnostic rather than throwing, and SHALL normalize content to LF before computing any content digest.

#### Scenario: Parsing a valid artifact

- **WHEN** a well-formed artifact file is parsed
- **THEN** frontmatter fields and the body are returned without loss

#### Scenario: Parsing broken frontmatter

- **WHEN** an artifact file contains invalid YAML frontmatter
- **THEN** parsing yields an error diagnostic identifying the source file instead of an exception

### Requirement: Frontmatter validates against the artifact schema

`packages/core` SHALL select the JSON Schema matching the artifact's `type` field and validate the frontmatter against it, mapping schema violations to diagnostics.

#### Scenario: Unknown artifact type

- **WHEN** an artifact declares an unknown `type`
- **THEN** validation reports a diagnostic naming the unknown type

#### Scenario: Prefix mismatch

- **WHEN** an artifact declares `type: actor` with `id: FR-EXAMPLE-001`
- **THEN** schema validation reports the invalid ID pattern for that type

### Requirement: Conformance fixtures exercise valid and invalid artifacts

The repository SHALL contain fixtures with, per artifact kind, a minimal valid artifact, plus representative invalid artifacts (invalid prefix, missing required field, invalid YAML, unknown property), and a test suite that asserts the expected outcome for each fixture.

#### Scenario: Running the conformance suite

- **WHEN** `pnpm test` runs
- **THEN** every valid fixture passes and every invalid fixture produces its expected diagnostic
