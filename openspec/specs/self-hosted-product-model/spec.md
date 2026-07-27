# self-hosted-product-model Specification

## Purpose

This repository's own product model, keeping the reference implementation defined by its own methodology.

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

### Requirement: The baseline describes every capability the toolkit actually has

The self-hosted product model SHALL describe the behaviour the shipped toolkit exhibits, and SHALL
NOT describe behaviour it does not. In particular every capability that modifies or removes a user's
files SHALL be authorised by a requirement that also states the condition under which the product
refuses, so that a reader can establish from the model alone what the toolkit is permitted to do.

A requirement clause SHALL NOT be falsifiable by a configuration surface the product ships: where
output depends on repository configuration, the obligation SHALL name configuration among its
inputs.

Correcting the baseline against shipped behaviour SHALL itself go through a Product Change, because
the direction of the correction does not exempt it from the rule that the baseline changes only by
explicit promotion.

#### Scenario: A destructive capability is discoverable from the model

- **WHEN** a reader asks the model whether the toolkit can delete files in their repository
- **THEN** a requirement states that it removes managed files it no longer generates, and states
  that a file whose content has diverged is kept and reported instead

#### Scenario: No requirement is falsified by configuration

- **WHEN** a rendering choice changes which files are produced from the same assets and target
- **THEN** the reproducibility obligation accounts for configuration rather than being contradicted
  by it

#### Scenario: Corrections are promoted, not edited in

- **WHEN** the baseline is found to disagree with shipped behaviour
- **THEN** the correction is proposed as a Product Change, validated as an overlay, and reaches the
  baseline only by explicit promotion
