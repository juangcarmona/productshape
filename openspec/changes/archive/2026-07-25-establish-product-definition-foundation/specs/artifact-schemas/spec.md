# Artifact Schemas and Templates

## ADDED Requirements

### Requirement: Every artifact kind has a JSON Schema

The repository SHALL provide JSON Schemas (draft 2020-12) for: common definitions, actor, journey, use-case, business-rule, domain-term, bounded-context, functional-requirement, quality-requirement, constraint, product-change, delivery-slice, product-handoff and product-coverage.

#### Scenario: Validating an actor frontmatter

- **WHEN** an actor artifact's frontmatter is validated against `schemas/actor.schema.json`
- **THEN** missing required fields, wrong ID prefixes and unknown fields are rejected

### Requirement: Common schema exposes separate lifecycle definitions

`schemas/common.schema.json` SHALL expose `artifactStatus`, `productChangeStatus` and `deliverySliceStatus` as separate reusable definitions, and each schema SHALL reference only its own lifecycle definition.

#### Scenario: A product change declares an artifact status

- **WHEN** a product-change document declares `status: active`
- **THEN** schema validation rejects it because `active` is not in `productChangeStatus`

### Requirement: The bounded-context schema does not accept owns-terms

The bounded-context schema SHALL NOT define an `owns-terms` property; term ownership derives from `Domain Term.defined-in`.

#### Scenario: Authoring owns-terms manually

- **WHEN** a bounded-context artifact declares `owns-terms` in frontmatter
- **THEN** schema validation rejects the unknown property

### Requirement: Constraint scope may be product-wide

The constraint schema SHALL define `applies-to` as optional; an absent `applies-to` means the constraint applies to the entire product.

#### Scenario: A product-wide constraint

- **WHEN** a constraint omits `applies-to`
- **THEN** it validates successfully and is interpreted as product-wide

### Requirement: Templates conform to their schemas

Every authoring template in `templates/` SHALL parse and validate against its corresponding schema using example values, and the delivery-slice and product-handoff templates SHALL carry their versioned `schema:` keys.

#### Scenario: Template conformance test

- **WHEN** the conformance test suite parses each template
- **THEN** every template validates against its schema with zero errors
