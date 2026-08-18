---
id: QR-EXTENSIBILITY-001
type: quality-requirement
title: Admit new SDD integrations through the stable Citation Contract
status: active
quality-attribute: extensibility
applies-to:
  - UC-CITATIONS-VERIFY-001
  - BC-DELIVERY-INTEGRATION
verification:
  - scenario: A new SDD integration uses the Citation Contract without product-model changes
  - scenario: Existing citations remain valid and unmodified when a new integration is added
  - scenario: Framework-specific discovery and configuration remain outside the product model
---

## Requirement

The product MUST admit new SDD framework integrations through the Citation Contract. Adding an integration MUST require no change to product artifact types, relationships or lifecycle, no change to existing citations, and no framework concept in the product model. Framework-specific consumer discovery and configuration MUST remain inside the integration, while citation emission and verification retain the same artifact IDs, digests, optional anchors and statuses for every framework.

## Measurement

Conformance is measured by the integration surface a new framework needs. The threshold: it supplies only framework-specific configuration and consumer-document discovery, delegates citation parsing and status computation to the published Citation Contract, and produces zero diffs in the product model's artifact types, relationship model, lifecycle and existing citation records.

## Verification

The OpenSpec integration serves as the reference consumer. An extensibility check supplies a minimal second integration with different discovery and configuration behaviour, verifies citations through the same contract, and asserts that no product-model or existing-citation file changes were required.
