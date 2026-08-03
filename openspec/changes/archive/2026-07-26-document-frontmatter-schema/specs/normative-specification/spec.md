# normative-specification — delta

## ADDED Requirements

### Requirement: The allowed frontmatter of every document kind is documented and generated

The specification SHALL contain a frontmatter reference enumerating, for every document kind that has a JSON Schema, each allowed property with whether it is required, its type, its permitted values or pattern, and any constraint the schema carries. Nested properties and array elements SHALL be enumerated alongside their parent. The reference SHALL state that frontmatter is a closed contract and that an unrecognised property is `PRODUCT002`.

The tables SHALL be generated from the canonical schemas, not restated by hand, and a conformance check SHALL fail when the reference and the schemas disagree. Coverage SHALL be verified in both directions, without a hardcoded count, so that adding a schema without documenting it fails.

#### Scenario: Every schema has a documented section

- **WHEN** the conformance check compares the reference's generated regions with the loaded schemas
- **THEN** the two sets are equal, and a schema added without a section fails the check

#### Scenario: A schema change that is not regenerated fails the build

- **WHEN** a schema's enum, pattern or required set changes and the reference is not regenerated
- **THEN** the check fails naming the kind and the command that regenerates it

#### Scenario: Formatting is not mistaken for drift

- **WHEN** the reference is reformatted by the repository formatter without semantic change
- **THEN** the check still passes, because table cells are compared after normalization
