---
id: FR-VALIDATE-002
type: functional-requirement
title: Report structural violations as stable diagnostics
status: active
derived-from:
  - UC-VALIDATE-001
  - BR-AI-001
verification:
  - scenario: Every structural violation is reported with a stable code, severity, file and the attribution fixed for its code
  - scenario: Two runs over identical content emit the same diagnostics in the same order
  - scenario: Diagnostics are available as machine-readable output with documented exit codes
  - scenario: A Product Change ID appears in the change field and an unresolved cited ID appears in target, never artifact
---

## Requirement

The product MUST report every structural violation — schema violations, identity violations, lifecycle violations and relationship violations — as a diagnostic carrying a stable documented code, a severity of error or warning, the repository-relative source file and the attribution the validation contract fixes for that code: the subject Product Artifact ID in `artifact`, the subject Product Change ID in `change`, the frontmatter field, relationship or body section in `field`, the referenced, operated-on or cited ID exactly as authored in `target`, and the point of use of a citation as a one-based payload `line` or sidecar `entry`. The three ID subjects are distinct: a Product Change ID appears in `change` and never in `artifact`, a cited ID appears in `target`, and an unresolved ID never appears in `artifact`, because resolution is what would establish that it identifies an artifact. The product MUST emit exactly one diagnostic per violating unit as the contract's emission granularity fixes it, never collapsing several units into one diagnostic or expanding one unit into several. Diagnostics MUST be ordered deterministically by file, then line and entry (absent before present, compared numerically), then code, field, target, artifact and change, comparing absent strings as empty strings. The product MUST offer the diagnostics in machine-readable JSON in addition to human-readable output, and MUST finish with the documented exit codes: success, validation errors, invalid invocation, or internal failure.

## Rationale

Validation is consumed by three audiences at once: humans fixing artifacts, CI pipelines gating merges, and AI assistants repairing models autonomously. All three depend on diagnostics being stable and precise. Stable codes let pipelines and assistants react to a class of problem rather than parse prose; deterministic ordering makes validation output diffable, so a change in the report always means a change in the model; documented exit codes make the command safe to script. The subject split carries the same weight: a consumer that reads `artifact` to locate a Product Artifact breaks silently when the value is sometimes a Product Change ID or an ID that resolves to nothing, and fixed emission counts are what make a diagnostic count comparable across implementations. Without these properties, structural enforcement would degrade into judgement calls — exactly what the methodology assigns to deterministic tooling, never to AI.

## Acceptance Scenarios

- A model containing a schema violation, a duplicate ID, a reference to a retired artifact and a disallowed relationship target is validated. Each problem appears as its own diagnostic with its documented code, severity, file and artifact ID, and the run exits with the validation-error code.
- A Product Change with an invalid operation and a consumer document with an unresolved citation are validated. The change diagnostic carries the change ID in `change` with the operation field and target, the citation diagnostic carries the cited ID in `target` with its payload line, and neither ID appears in `artifact`.
- The same repository is validated twice, on two different platforms. The diagnostic lists are identical, entry for entry, in the same order.
- Validation is run with JSON output requested. The result is machine-readable, contains the same diagnostics as the human-readable form, and a clean model yields exit code 0 while an invalid invocation yields the invalid-invocation exit code.
