---
id: CHG-PRODUCT-CHANGE-LIFECYCLE-001
type: product-change
title: Align ProductShape with the independent Product Change lifecycle
status: applied
base-revision: '02576bc65b9bdc5ebfa6b75f2ebd4b77057b4ad3'
operations:
  add:
    - TERM-CITATION
  modify:
    - ACT-AI-ASSISTANT
    - ACT-PRODUCT-ENGINEER
    - ACT-REPOSITORY-MAINTAINER
    - BC-DELIVERY-INTEGRATION
    - BC-PRODUCT-DEFINITION
    - BR-AI-001
    - BR-CANONICAL-001
    - BR-CHANGE-001
    - BR-IDENTITY-001
    - BR-SDD-001
    - CON-NO-WEB-UI
    - CON-SDD-AGNOSTIC
    - FR-CHANGE-001
    - FR-CHANGE-002
    - FR-IMPACT-001
    - FR-INIT-001
    - FR-INSPECT-001
    - FR-OPENSPEC-001
    - FR-SNAPSHOT-001
    - JRN-ADOPT-001
    - QR-DETERMINISM-001
    - QR-EXPLAINABILITY-001
    - QR-EXTENSIBILITY-001
    - QR-PORTABILITY-001
    - TERM-CURRENT-PRODUCT-MODEL
    - TERM-PRODUCT-ARTIFACT
    - TERM-PRODUCT-GRAPH
    - TERM-PRODUCT-SNAPSHOT
    - TERM-REFERENCE-IMPLEMENTATION
    - UC-CHANGE-001
    - UC-CITATIONS-VERIFY-001
    - UC-CITE-001
    - UC-DEFINE-001
    - UC-IMPACT-001
    - UC-INIT-001
    - UC-INSPECT-001
    - UC-RECOVER-001
    - UC-SNAPSHOT-001
  remove:
    - TERM-PRODUCT-CONTEXT
---

## Problem

ProductShape's current model mixes three different things: a semantic Product Change, the pull request that reviews the applied result, and implementation delivery. Several artifacts still describe retired Delivery Slices, Product Handoffs and promotion, while other guidance permits direct edits to the baseline or treats the pull request as the change. Those meanings contradict the normative Product Change lifecycle.

## Intended Product Outcome

ProductShape describes one lifecycle consistently: accepted baseline, proposed Product Change, overlay validation, human product approval, explicit apply on a working branch, pull-request review, and merge acceptance of the resulting baseline. Apply, acceptance and delivery remain distinct. Product-definition work and implementation work have independent cadence; they may share a pull request, but neither becomes the other.

Delivery integration is expressed through citations and framework-specific configuration. Retired Delivery Slices, Product Handoffs, Product Context documents and promotion have no current model semantics.

## Rationale

A Product Change records semantic intent. Apply materializes that intent on a working branch. A merge accepts the resulting Product Definition. Implementation, verification, release and deployment are separate delivery facts. Conflating these boundaries makes the model unable to say which decision has actually been made and reintroduces delivery state into a Product Change.

## Affected Product Areas

Product Change authoring, validation, approval, apply and acceptance; initial definition; repository initialization; product-model inspection and impact analysis; citations and SDD integration; deterministic and portable output; public explanation of the methodology; and the actors and domain language that describe these capabilities.

## Open Questions

None.

## Product Acceptance

The overlay validates with no errors; the current model contains no active Delivery Slice, Product Handoff, Product Context or promotion semantics; no current artifact permits direct baseline editing or equates a Product Change with a pull request; apply, merge acceptance and delivery are stated separately; and the initial definition follows the same `CHG-INITIAL` lifecycle as later changes.

## Out of Scope

Changing the normative PDaC lifecycle, adding delivery state to Product Changes, defining an implementation workflow, changing citation formats, reviving retired delivery concepts under new names, or altering historical Product Changes.
