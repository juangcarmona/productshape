# artifact-schemas Specification

<!-- pdac-scope: cited -->

## Purpose

The JSON Schema contracts every product artifact kind and Product Change document validates against.

## Requirements

### Requirement: Every artifact kind has a JSON Schema

The repository SHALL provide JSON Schemas (draft 2020-12) for: common definitions, actor, journey, use-case, business-rule, domain-term, bounded-context, functional-requirement, quality-requirement, constraint and product-change.

{pdac:cite id="FR-SCHEMA" digest="sha256:33d5285c4d9bc0c286407055c3ecfc35e4f639da4cf09ddde667d33fffff595c"}

{pdac:cite id="TERM-PRODUCT-ARTIFACT" digest="sha256:dfd8386de66abfef0e0384b8a81ef8bb1fb0b0756133e5cc588d382c8b179a46"}

#### Scenario: Validating an actor frontmatter

- **WHEN** an actor artifact's frontmatter is validated against `schemas/actor.schema.json`
- **THEN** missing required fields, wrong ID prefixes and unknown fields are rejected

### Requirement: Common schema exposes separate lifecycle definitions

`schemas/common.schema.json` SHALL expose `artifactStatus` and `productChangeStatus` as separate reusable definitions, and each schema SHALL reference only its own lifecycle definition. Product Change status SHALL contain no implementation, verification, release or deployment state.

{pdac:cite id="BR-CHANGE" digest="sha256:db602cf0f15ccc7de39a30d2e05c0139a02fe4182122d32c3dea61d51962f537"}

#### Scenario: A product change declares an artifact status

- **WHEN** a product-change document declares `status: active`
- **THEN** schema validation rejects it because `active` is not in `productChangeStatus`

### Requirement: The bounded-context schema does not accept owns-terms

The bounded-context schema SHALL NOT define an `owns-terms` property; term ownership derives from `Domain Term.defined-in`.

{pdac:cite id="BR-RELATIONSHIPS" digest="sha256:948608d2a917204d7aab5042dcfe4a4731b805163d54d546a6d1ee38c6954102"}

#### Scenario: Authoring owns-terms manually

- **WHEN** a bounded-context artifact declares `owns-terms` in frontmatter
- **THEN** schema validation rejects the unknown property

### Requirement: Constraint scope may be product-wide

The constraint schema SHALL define `applies-to` as optional; an absent `applies-to` means the constraint applies to the entire product.

#### Scenario: A product-wide constraint

- **WHEN** a constraint omits `applies-to`
- **THEN** it validates successfully and is interpreted as product-wide

### Requirement: Templates conform to their schemas

Every authoring template in `templates/` SHALL parse and validate against its corresponding schema using example values. The Product Change template SHALL carry its versioned `schema:` key and SHALL distinguish apply, acceptance and delivery.

#### Scenario: Template conformance test

- **WHEN** the conformance test suite parses each template
- **THEN** every template validates against its schema with zero errors

### Requirement: Artifacts may record the evidence behind recovered knowledge

Every artifact schema SHALL accept an optional `provenance` object, defined once in the common schema and referenced by each kind. When present it SHALL require `source` (a non-empty string naming a file, URL, ticket or interview) and `confidence` (`high`, `medium` or `low`), and MAY carry `recovered-from` (`observation`, `inference`, `interview` or `documentation`). The object SHALL be closed: an unrecognised sub-field SHALL be rejected with `PRODUCT002`.

`provenance` SHALL NOT be required by any kind: an artifact authored from intent has no evidence to cite. It SHALL NOT be accepted on the Product Change document, whose proposed artifacts carry it instead.

Provenance records evidence, not authorship. It SHALL NOT be used to carry author, owner, date, version or review metadata, which remain forbidden.

#### Scenario: Recovered artifact carries provenance

- **WHEN** an artifact declares `provenance` with a source and a confidence
- **THEN** it validates with no diagnostics

#### Scenario: Unrecognised sub-field rejected

- **WHEN** an artifact declares a `provenance` sub-field the schema does not define
- **THEN** validation reports `PRODUCT002` rather than ignoring the property

#### Scenario: Evidence without a confidence rejected

- **WHEN** an artifact declares `provenance.source` but omits `provenance.confidence`
- **THEN** validation reports `PRODUCT002`
