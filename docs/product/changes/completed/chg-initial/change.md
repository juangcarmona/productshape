---
id: CHG-INITIAL
type: product-change
title: Establish the first Product Definition
status: applied
base-revision: '0000000'
operations:
  add:
    - ACT-AI-ASSISTANT
    - ACT-PRODUCT-ENGINEER
    - ACT-PRODUCT-EXPLORER
    - ACT-REPOSITORY-MAINTAINER
    - JRN-ADOPT-001
    - JRN-SNAPSHOT-001
    - UC-CHANGE-001
    - UC-CITATIONS-VERIFY-001
    - UC-CITE-001
    - UC-DEFINE-001
    - UC-EXPLORE-001
    - UC-FIX-001
    - UC-IMPACT-001
    - UC-INIT-001
    - UC-INSPECT-001
    - UC-SCHEMA-001
    - UC-SNAPSHOT-001
    - UC-SNAPSHOT-EXPLORE-001
    - UC-VALIDATE-001
    - BR-AI-001
    - BR-CANONICAL-001
    - BR-CHANGE-001
    - BR-IDENTITY-001
    - BR-RELATIONSHIPS-001
    - BR-SDD-001
    - TERM-CURRENT-PRODUCT-MODEL
    - TERM-FOCUSED-TOPOLOGY
    - TERM-GRAPH-PROJECTION
    - TERM-METHODOLOGY
    - TERM-PRODUCT-ARTIFACT
    - TERM-PRODUCT-CONTEXT
    - TERM-PRODUCT-EXPLORER
    - TERM-PRODUCT-GRAPH
    - TERM-PRODUCT-SNAPSHOT
    - TERM-REFERENCE-IMPLEMENTATION
    - BC-DELIVERY-INTEGRATION
    - BC-PRODUCT-DEFINITION
    - FR-CHANGE-001
    - FR-CHANGE-002
    - FR-CITATIONS-VERIFY-001
    - FR-CITE-001
    - FR-DISTRIBUTION-001
    - FR-DOCTOR-001
    - FR-EXPLORE-001
    - FR-FIX-001
    - FR-GRAPH-001
    - FR-IMPACT-001
    - FR-INIT-001
    - FR-INSPECT-001
    - FR-OPENSPEC-001
    - FR-PARSE-001
    - FR-SCHEMA-001
    - FR-SNAPSHOT-001
    - FR-SNAPSHOT-002
    - FR-SNAPSHOT-003
    - FR-SNAPSHOT-004
    - FR-SNAPSHOT-005
    - FR-SNAPSHOT-006
    - FR-SNAPSHOT-008
    - FR-SNAPSHOT-009
    - FR-VALIDATE-001
    - FR-VALIDATE-002
    - QR-ACCESSIBILITY-001
    - QR-DETERMINISM-001
    - QR-EXPLAINABILITY-001
    - QR-EXTENSIBILITY-001
    - QR-PORTABILITY-001
    - QR-PRESENTATION-001
    - QR-SCALABILITY-001
    - CON-BRAND-001
    - CON-MARKDOWN-001
    - CON-NO-GRAPH-DATABASE
    - CON-NO-WEB-UI
    - CON-PUBLIC-GENERIC
    - CON-SDD-AGNOSTIC
  modify: []
  remove: []
---

## Problem

ProductShape had no Product Definition of its own. It implemented a specification for defining products as code while its own product intent lived in README prose, issue threads and the heads of the people writing it, so there was nothing for a consumer document to cite and nothing to validate.

## Intended Product Outcome

An accepted Product Definition describing who works on a product model, the journeys and use cases through which they do it, the rules that govern how the definition changes, the domain language ProductShape speaks, and the functional, quality and constraint requirements the tool is held to.

## Rationale

A reference implementation that does not define itself as code is an argument nobody has to believe. Defining ProductShape through PDaC is what makes the methodology falsifiable: every command in the CLI is reachable from an actor through a journey, a use case and a requirement, and `prodshape validate` says so on every run.

Initialisation uses the same mechanism as every later change, so the product has one way to evolve rather than a special case at the beginning and a mechanism afterwards.

## Affected Product Areas

The whole model; it did not exist before this change.

## Open Questions

None.

## Product Acceptance

The applied model validates without errors, every consumer citation into it resolves, and the conformance corpus reproduces the same diagnostics on every platform.

## Out of Scope

Delivery decomposition, technical design, release orchestration and the implementation of anything described here. Those are facts about building ProductShape, not about what ProductShape is.
