---
id: FR-CITE-001
type: functional-requirement
title: Emit citation records in three forms
status: active
derived-from:
  - UC-CITE-001
  - BR-SDD-001
verification:
  - id: S1
    scenario: An inline structured reference is emitted and parseable
  - id: S2
    scenario: A Markdown marker block is emitted with embedded text
  - id: S3
    scenario: A YAML sidecar ledger is emitted and parseable
---

## Requirement

The product MUST emit citation records carrying the target artifact ID, a content digest, and an optional scenario anchor. A citation MAY exist as an inline structured reference, a Markdown marker block (optionally embedding canonical text delimited by machine-readable markers), or a YAML sidecar ledger. The `prodshape cite` command MUST produce a citation in any of the three forms on request.

## Rationale

Consumer documents reference product artifacts without re-stating them. A citation records what was cited and at what content digest, so that drift between a consumer document and the canonical model is machine-detectable rather than silent. Three forms accommodate different consumer workflows: inline references for single-line citations, marker blocks for embedded projections, and sidecar ledgers for bulk citation management.

## Acceptance Scenarios

- S1: an inline structured reference is emitted and parseable
- S2: a Markdown marker block is emitted with embedded text
- S3: a YAML sidecar ledger is emitted and parseable
