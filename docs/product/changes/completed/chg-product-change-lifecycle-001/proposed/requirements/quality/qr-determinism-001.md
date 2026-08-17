---
id: QR-DETERMINISM-001
type: quality-requirement
title: Produce identical results for identical product content
status: active
quality-attribute: determinism
applies-to:
  - UC-VALIDATE-001
  - UC-IMPACT-001
  - UC-CITATIONS-VERIFY-001
  - UC-SNAPSHOT-001
verification:
  - scenario: Repeated runs over identical content produce byte-identical generated outputs
  - scenario: Diagnostics appear in the same order on every run and platform
  - scenario: Line endings and path separators of the checkout do not affect any result
---

## Requirement

The product MUST produce identical results whenever the product content is identical. Generated outputs MUST be byte-identical across runs and across platforms — including the generated Product Snapshot — diagnostics MUST appear in a deterministic order (by file, then code, then target), and impact analysis, product diffs and citation verification MUST return the same answers for the same content. Results MUST be independent of the checkout's line endings, path separators, file discovery order and any other environmental accident.

## Measurement

Conformance is measured by repeated-run comparison: each operation is executed multiple times over the same content — including once after re-checkout with altered line endings and on a different platform — and outputs are compared. The threshold is exact: generated files byte-identical, machine-readable diagnostics identical in content and order, impact results, product diffs and citation statuses identical. Digests are compared as rendered values and must match across line-ending configurations, since digest computation normalizes line endings by contract. A single differing byte or reordered diagnostic is a failure.

## Verification

Automated determinism tests run validation, impact analysis, change apply dry runs, citation verification and snapshot generation twice in one session and once per supported platform over committed fixtures, asserting equality of outputs against each other and against committed golden files. A dedicated fixture is checked out with CRLF endings to prove digest and output stability. These tests are part of the release gate, so no version ships with a nondeterministic operation.
