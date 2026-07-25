---
id: FR-VALIDATE-002
type: functional-requirement
title: Report structural violations as stable diagnostics
status: active
derived-from:
  - UC-VALIDATE-001
  - BR-AI-001
verification:
  - scenario: Every structural violation is reported with a stable code, severity, file and artifact
  - scenario: Two runs over identical content emit the same diagnostics in the same order
  - scenario: Diagnostics are available as machine-readable output with documented exit codes
---

## Requirement

The product MUST report every structural violation — schema violations, identity violations,
lifecycle violations and relationship violations — as a diagnostic carrying a stable documented
code, a severity of error or warning, the repository-relative source file and, when available, the
artifact ID, field and target ID. Diagnostics MUST be ordered deterministically (by file, then
code, then target). The product MUST offer the diagnostics in machine-readable JSON in addition to
human-readable output, and MUST finish with the documented exit codes: success, validation errors,
invalid invocation, or internal failure.

## Rationale

Validation is consumed by three audiences at once: humans fixing artifacts, CI pipelines gating
merges, and AI assistants repairing models autonomously. All three depend on diagnostics being
stable and precise. Stable codes let pipelines and assistants react to a class of problem rather
than parse prose; deterministic ordering makes validation output diffable, so a change in the
report always means a change in the model; documented exit codes make the command safe to script.
Without these properties, structural enforcement would degrade into judgement calls — exactly what
the methodology assigns to deterministic tooling, never to AI.

## Acceptance Scenarios

- A model containing a schema violation, a duplicate ID, a reference to a retired artifact and a
  disallowed relationship target is validated. Each problem appears as its own diagnostic with its
  documented code, severity, file and artifact ID, and the run exits with the validation-error
  code.
- The same repository is validated twice, on two different platforms. The diagnostic lists are
  identical, entry for entry, in the same order.
- Validation is run with JSON output requested. The result is machine-readable, contains the same
  diagnostics as the human-readable form, and a clean model yields exit code 0 while an invalid
  invocation yields the invalid-invocation exit code.
