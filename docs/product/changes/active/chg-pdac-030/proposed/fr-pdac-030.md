---
id: FR-PDAC-030
type: functional-requirement
title: Explicitly select and qualify the PDaC v0.3 contract
status: active
derived-from:
  - UC-VALIDATE-001
  - UC-CHANGE-001
  - UC-CITATIONS-VERIFY-001
verification:
  - id: S1
    scenario: Existing v1alpha1 repositories retain their contract while v1alpha2 enables lifecycle semantics
  - id: S2
    scenario: One-hop unacknowledged model impact warns during validation and blocks apply
  - id: S3
    scenario: Dry-run and actual apply surface the same ordered downstream forecast before writes
  - id: S4
    scenario: A stale downstream citation does not by itself block apply
  - id: S5
    scenario: External evidence outcomes remain unchanged when citations become stale
  - id: S6
    scenario: A failed apply restores earlier writes and deletions without changing Git history or index
---

## Requirement

An explicitly selected v1alpha2 repository MUST follow the PDaC v0.3 domain behaviour, relationship, impact-accounting, diagnostic and apply contracts. Existing v1alpha1 repositories MUST retain their selected contract. A conflicting explicit version and configuration MUST be rejected before model discovery.

Product Change validation MUST derive one-hop impact from effective changes. Apply MUST enforce the ordered gates and surface prospective downstream citations before writes. Unresolved model impact blocks apply; stale downstream citations alone do not. Dry-run MUST produce the same forecast and leave the tree unchanged. Execution failure MUST restore earlier mutations where the filesystem remains writable, and MUST disclose any failure to restore rather than claim success.

Explicitly selected Verification Evidence MUST remain an external provider claim. The product MUST retain its outcome, level and run revision independently of citation freshness and the model revision. It MUST NOT execute tests or manage suites or retries.

## Rationale

The release joins explicit domain behaviour, accountable Product Changes and visible downstream impact. Executable qualification makes these contracts reviewable while preserving the user's authority over product acceptance and release publication.
