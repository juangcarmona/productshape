# artifact-parsing Specification

<!-- pdac-scope: cited -->

## Purpose

The parsing contract that turns canonical Markdown-plus-frontmatter files into typed product artifacts.

## Requirements

### Requirement: Markdown artifacts parse deterministically

`src/packages/core` SHALL parse a Markdown artifact file into YAML frontmatter and body, reporting invalid YAML as a diagnostic rather than throwing, and SHALL normalize content to LF before computing any content digest.

{pdac:cite id="FR-PARSE" digest="sha256:9e000f65f0b5073a26da7b30dc8fc6d8112c262634c8329a5eea75ce694d6a09"}

{pdac:cite id="CON-MARKDOWN" digest="sha256:8f07fa7e54a8123f1333a005b30af1c922b4f2be9a8b980d6e674e91edf1fcd6"}

#### Scenario: Parsing a valid artifact

- **WHEN** a well-formed artifact file is parsed
- **THEN** frontmatter fields and the body are returned without loss

#### Scenario: Parsing broken frontmatter

- **WHEN** an artifact file contains invalid YAML frontmatter
- **THEN** parsing yields an error diagnostic identifying the source file instead of an exception

### Requirement: Frontmatter validates against the artifact schema

`src/packages/core` SHALL select the JSON Schema matching the artifact's `type` field and validate the frontmatter against it, mapping schema violations to diagnostics.

#### Scenario: Unknown artifact type

- **WHEN** an artifact declares an unknown `type`
- **THEN** validation reports a diagnostic naming the unknown type

#### Scenario: Prefix mismatch

- **WHEN** an artifact declares `type: actor` with `id: FR-EXAMPLE`
- **THEN** schema validation reports the invalid ID pattern for that type

### Requirement: Conformance fixtures exercise valid and invalid artifacts

The repository SHALL contain fixtures with, per artifact kind, a minimal valid artifact, plus representative invalid artifacts (invalid prefix, missing required field, invalid YAML, unknown property), and a test suite that asserts the expected outcome for each fixture.

#### Scenario: Running the conformance suite

- **WHEN** `pnpm test` runs
- **THEN** every valid fixture passes and every invalid fixture produces its expected diagnostic

### Requirement: Model discovery is complete and deterministic

The core SHALL discover every Markdown artifact under the configured model root (excluding `index.md`), in deterministic order with POSIX-normalized repository-relative paths, and load each through the established parsing and schema-validation contract.

{pdac:cite id="QR-DETERMINISM" digest="sha256:96900884875f14787927c8bc1d20f1c1e083171167609ec1b754dfb097610409"}

#### Scenario: Deterministic discovery order

- **WHEN** the model is loaded twice
- **THEN** artifacts are enumerated in the same order with identical paths

#### Scenario: Navigation index exempt

- **WHEN** `docs/product/model/index.md` exists
- **THEN** it is not treated as a product artifact
