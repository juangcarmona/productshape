<!-- pdac-scope: cited -->

# self-hosted-product-model Specification

## Purpose

This repository's own product model, keeping the reference implementation defined by its own methodology.

## Requirements

### Requirement: The repository defines itself with its own methodology

The repository SHALL contain a current product model under `docs/product/model` covering the adoption, Product Change, validation and citation workflows, evolved through overlay-validated and human-approved Product Changes whose applied results are accepted by pull-request merge, with at minimum: actors ACT-PRODUCT-ENGINEER, ACT-REPOSITORY-MAINTAINER, ACT-AI-ASSISTANT, ACT-PRODUCT-STAKEHOLDER; journeys JRN-ADOPT, JRN-EXPLORER; use cases UC-INIT, UC-DEFINE, UC-VALIDATE, UC-INSPECT, UC-IMPACT, UC-CITE, UC-CITATIONS-VERIFY, UC-SCHEMA, UC-FIX, UC-EXPLORE, UC-EXPLORER-GENERATE, UC-EXPLORER-BROWSE; business rules BR-CANONICAL, BR-IDENTITY, BR-RELATIONSHIPS, BR-CHANGE, BR-SDD, BR-AI; domain terms TERM-PRODUCT-ARTIFACT, TERM-PRODUCT-GRAPH, TERM-CITATION, TERM-CURRENT-PRODUCT-MODEL; bounded contexts BC-PRODUCT-DEFINITION, BC-DELIVERY-INTEGRATION; functional requirements FR-INIT-PRESERVE, FR-PARSE, FR-VALIDATE-REFERENCES, FR-VALIDATE-DIAGNOSTICS, FR-GRAPH, FR-INSPECT, FR-IMPACT, FR-CHANGE-VALIDATE, FR-CHANGE-APPLY, FR-CITE, FR-CITATIONS-VERIFY, FR-DISTRIBUTION, FR-OPENSPEC, FR-SCHEMA, FR-FIX, FR-DOCTOR, FR-EXPLORE, FR-EXPLORER-PAGE, FR-EXPLORER-READER, FR-EXPLORER-ORIENTATION, FR-EXPLORER-SEARCH, FR-EXPLORER-PROJECTIONS, FR-EXPLORER-ADDRESSING, FR-EXPLORER-CATALOG and FR-EXPLORER-TOPOLOGY; quality requirements QR-PORTABILITY, QR-DETERMINISM, QR-EXPLAINABILITY, QR-EXTENSIBILITY, QR-ACCESSIBILITY, QR-PRESENTATION, QR-SCALABILITY; and constraints CON-MARKDOWN, CON-NO-GRAPH-DATABASE, CON-NO-WEB-UI, CON-SDD-AGNOSTIC, CON-PUBLIC-GENERIC, CON-BRAND.

{pdac:cite id="TERM-REFERENCE-IMPLEMENTATION" digest="sha256:8ed9a9b4cf41ffa5bbe04f05c16a4176615bf7c0fbc7f4259216fecbd7fd7f7d"}

{pdac:cite id="BR-CHANGE" digest="sha256:db602cf0f15ccc7de39a30d2e05c0139a02fe4182122d32c3dea61d51962f537"}

{pdac:cite id="TERM-CURRENT-PRODUCT-MODEL" digest="sha256:0699a1113e526f3a566b52b3f409e68933cfc23a5ac64387bc4b4a72c6211175"}

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

- **WHEN** FR-VALIDATE-REFERENCES is reviewed
- **THEN** it states the observable obligation and acceptance scenarios without naming implementation modules

### Requirement: Repository configuration exists

The repository SHALL contain `.product/config.yaml` conforming to the configuration shape (schema `product-definition-as-code/config/v1alpha1`), identifying `docs/product` as the product root.

#### Scenario: Reading the configuration

- **WHEN** tooling reads `.product/config.yaml`
- **THEN** the model path resolves to the self-hosted product definition

### Requirement: The baseline describes every capability the toolkit actually has

The self-hosted product model SHALL describe the behaviour the shipped toolkit exhibits, and SHALL NOT describe behaviour it does not. In particular every capability that modifies or removes a user's files SHALL be authorised by a requirement that also states the condition under which the product refuses, so that a reader can establish from the model alone what the toolkit is permitted to do.

A requirement clause SHALL NOT be falsifiable by a configuration surface the product ships: where output depends on repository configuration, the obligation SHALL name configuration among its inputs.

Correcting the baseline against shipped behaviour SHALL itself go through a Product Change, because the direction of the correction does not exempt it from overlay validation, human product approval, explicit apply on a working branch and acceptance by merge.

#### Scenario: A destructive capability is discoverable from the model

- **WHEN** a reader asks the model whether the toolkit can delete files in their repository
- **THEN** a requirement states that it removes managed files it no longer generates, and states that a file whose content has diverged is kept and reported instead

#### Scenario: No requirement is falsified by configuration

- **WHEN** a rendering choice changes which files are produced from the same assets and target
- **THEN** the reproducibility obligation accounts for configuration rather than being contradicted by it

#### Scenario: Corrections are applied and reviewed, not edited in

- **WHEN** the baseline is found to disagree with shipped behaviour
- **THEN** the correction is proposed as a Product Change, validated as an overlay, approved, applied on a working branch and accepted only by human merge
