---
id: FR-CHANGE-001
type: functional-requirement
title: Validate a proposed change against the product model
status: active
derived-from:
  - UC-CHANGE-001
  - BR-CHANGE-001
verification:
  - id: S1
    scenario: A valid proposed change reports zero errors
  - id: S2
    scenario: An invalid proposed change reports the specific diagnostics
---

## Requirement

The product MUST validate the working tree as a proposed change using `prodshape change validate`, which performs full-tree structural validation (the same checks as `prodshape validate`). The command MUST report zero errors when the proposed change is structurally sound, and MUST report specific diagnostics (with stable codes, source files, and artifact IDs) when it is not. The command MUST NOT merge, promote, or modify the canonical branch.

## Rationale

A proposed change is a pull request: direct edits to `docs/product/model/` on a branch. Before the PR is opened, the engineer needs a deterministic verdict on whether the proposed tree is structurally valid. Full-tree validation (not overlay validation) is the correct check: the branch IS the proposed state.

## Acceptance Scenarios

- S1: a valid proposed change reports zero errors
- S2: an invalid proposed change reports the specific diagnostics
