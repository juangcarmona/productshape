---
id: QR-EXTENSIBILITY-001
type: quality-requirement
title: Admit new SDD adapters through the stable handoff contract
status: active
quality-attribute: extensibility
applies-to:
  - UC-HANDOFF-001
  - BC-DELIVERY-INTEGRATION
verification:
  - scenario: A new SDD adapter is built on the handoff contract without product-model changes
  - scenario: Existing handoffs remain valid and unmodified when a new adapter is added
  - scenario: A consumer detects an incompatible handoff contract version from the document
---

## Requirement

The product MUST admit new SDD framework adapters through the versioned handoff contract alone.
Adding an adapter MUST require no change to the product model, no change to the handoff contract
and no regeneration or modification of existing handoffs. The handoff document MUST carry its
contract version so that any consumer can detect, from the document itself, whether it understands
that version, and incompatible versions fail explicitly rather than being misread.

## Measurement

Conformance is measured by the integration surface an adapter needs. The threshold: a new adapter
consumes only the published handoff contract — the handoff document, the product context and the
coverage mapping — and its addition produces zero diffs in the product model's artifact types,
relationship model, validation rules and existing handoff documents. Contract versioning is
measured by presence and behaviour: every generated handoff carries the versioned schema
identifier, and presenting a document with an unknown contract version to a consumer produces an
explicit incompatibility report, never a silent partial read.

## Verification

The OpenSpec adapter serves as the reference consumer: its conformance tests exercise only the
published contract, proving the contract is sufficient without privileged access. An
extensibility check builds a minimal second consumer against the same contract and asserts that
no product-model or existing-handoff file changes were needed. Version detection is verified by
feeding handoff documents with the current and with an unknown contract version to consumers and
asserting acceptance of the first and an explicit incompatibility diagnostic for the second.
