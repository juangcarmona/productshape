---
id: QR-PORTABILITY-001
type: quality-requirement
title: Run consistently on supported development platforms
status: active
quality-attribute: portability
applies-to:
  - UC-INIT-001
  - UC-VALIDATE-001
  - UC-CITE-001
verification:
  - scenario: The full test suite passes on Linux, Windows and macOS
  - scenario: Validation of the same repository yields identical diagnostics on all three platforms
  - scenario: Generated outputs are byte-identical regardless of the platform that produced them
---

## Requirement

The product MUST behave identically on Linux, Windows and macOS. Every command — initialization, validation, graph compilation, impact analysis, handoff generation and status — MUST produce the same results, the same diagnostics and the same exit codes for the same repository content on all three platforms, and generated files MUST be byte-identical regardless of which platform produced them, independent of native path separators and line-ending conventions.

## Measurement

Conformance is measured by cross-platform comparison: the same repository content is processed on Linux, Windows and macOS, and the outputs are compared. The pass threshold is exact equality — diagnostics lists are identical entry for entry and in order, exit codes match, and generated files (product graph, indexes, handoffs, context documents) are byte-identical across the three platforms, including when the checkout uses CRLF line endings or backslash paths natively. Any divergence is a conformance failure; there is no tolerance band.

## Verification

The product's own automated test suite runs on Linux, Windows and macOS in continuous integration, and the release gate requires all three runs to pass. The suite includes cross-platform fixture tests that validate a shared repository fixture and assert byte-identical generated outputs and identical diagnostics against committed expectations, exercising initialization, validation and handoff generation — the operations named in the scenarios above.
