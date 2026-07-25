---
id: FR-VALIDATE-001
type: functional-requirement
title: Detect unresolved product references
status: active
derived-from:
  - UC-VALIDATE-001
  - BR-IDENTITY-001
verification:
  - scenario: Validation fails when an active artifact references an unknown ID
  - scenario: The diagnostic identifies the source artifact and missing target ID
---

## Requirement

The product MUST verify that every relationship declared by a product artifact resolves to an
artifact that exists in the model. A reference from an active artifact to an ID that does not
exist MUST be reported as a validation error, and the run MUST finish with the documented
validation-error exit code. Each such diagnostic MUST identify the source file, the source
artifact ID, the relationship field and the missing target ID.

## Rationale

Stable IDs are the connective tissue of the product model: use cases point at actors, requirements
point at the knowledge they derive from, changes point at the artifacts they touch. A reference
that resolves to nothing is a hole in the product definition — traceability silently ends there,
impact analysis undercounts, and handoffs would ship incomplete context to delivery. Catching
unresolved references structurally, with a diagnostic precise enough to fix in one step, keeps the
graph honest without requiring anyone to read every file.

## Acceptance Scenarios

- An active functional requirement lists a use case ID in `derived-from` that no artifact in the
  model carries. Validation reports an error for that reference and exits with the
  validation-error exit code.
- The emitted diagnostic names the requirement's repository-relative file, the requirement's ID as
  the source artifact, the `derived-from` field and the unknown target ID, so the author can
  locate and correct the reference without further searching.
