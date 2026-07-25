# self-hosted-product-model Specification

## Purpose

TBD - created by archiving change establish-product-definition-foundation. Update Purpose after archive.

## Requirements

### Requirement: The repository defines itself with its own methodology

The repository SHALL contain an initial current product model under `docs/product/model` covering the adoption and change workflow, established under the initial-baseline bootstrap exception, with at minimum: actors ACT-PRODUCT-ENGINEER, ACT-REPOSITORY-MAINTAINER, ACT-AI-ASSISTANT; journeys JRN-ADOPT-001, JRN-CHANGE-001, JRN-SDD-HANDOFF-001; use cases UC-INIT-001, UC-DEFINE-001, UC-VALIDATE-001, UC-INSPECT-001, UC-IMPACT-001, UC-CHANGE-001, UC-SLICE-001, UC-HANDOFF-001, UC-HANDOFF-STATUS-001, UC-PROMOTE-001; business rules BR-CANONICAL-001, BR-IDENTITY-001, BR-RELATIONSHIPS-001, BR-CHANGE-001, BR-SDD-001, BR-AI-001; domain terms TERM-PRODUCT-ARTIFACT, TERM-PRODUCT-GRAPH, TERM-PRODUCT-CHANGE, TERM-DELIVERY-SLICE, TERM-PRODUCT-HANDOFF, TERM-PRODUCT-CONTEXT, TERM-CURRENT-PRODUCT-MODEL; bounded contexts BC-PRODUCT-DEFINITION, BC-DELIVERY-INTEGRATION; the fifteen functional requirements FR-INIT-001 through FR-COVERAGE-001 listed in the founding brief; quality requirements QR-PORTABILITY-001, QR-DETERMINISM-001, QR-EXPLAINABILITY-001, QR-EXTENSIBILITY-001; and constraints CON-MARKDOWN-001, CON-NO-GRAPH-DATABASE, CON-NO-WEB-UI, CON-SDD-AGNOSTIC, CON-PUBLIC-GENERIC.

#### Scenario: Model completeness check

- **WHEN** the conformance suite loads the self-hosted model
- **THEN** every ID listed above exists exactly once with the correct artifact type

### Requirement: The self-hosted model is structurally coherent

Every relationship reference in the self-hosted model SHALL resolve to an existing artifact of an allowed target type, every artifact SHALL validate against its schema, and `ACT-AI-ASSISTANT` SHALL NOT be classified as human.

#### Scenario: Reference resolution over the model

- **WHEN** the conformance suite resolves all frontmatter references in the model
- **THEN** no reference points to a missing ID or a disallowed target type

### Requirement: Product artifacts contain no implementation design

Artifacts in the self-hosted model SHALL describe product behaviour and obligations, not package names, class names, algorithms or framework choices, except where an externally visible constraint is unavoidable.

#### Scenario: Reviewing a functional requirement

- **WHEN** FR-VALIDATE-001 is reviewed
- **THEN** it states the observable obligation and acceptance scenarios without naming implementation modules

### Requirement: Repository configuration exists

The repository SHALL contain `.product/config.yaml` conforming to the configuration shape (schema `product-definition-as-code/config/v1alpha1`), identifying `docs/product` as the product root.

#### Scenario: Reading the configuration

- **WHEN** tooling reads `.product/config.yaml`
- **THEN** the model and changes paths resolve to the self-hosted product definition
