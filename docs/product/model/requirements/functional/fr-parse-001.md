---
id: FR-PARSE-001
type: functional-requirement
title: Parse product artifacts deterministically
status: active
derived-from:
  - UC-VALIDATE-001
  - BR-CANONICAL-001
verification:
  - scenario: Every well-formed artifact file yields its structured metadata and body
  - scenario: A malformed file yields a diagnostic naming it while the rest of the run completes
  - scenario: Parsing the same content twice yields identical results
---

## Requirement

The product MUST parse every product artifact file into its structured frontmatter metadata and
its Markdown body. Parsing MUST be deterministic: the same file content yields the same parsed
result on every run and on every supported platform. When a file is malformed — invalid
frontmatter, an unparseable document, an unknown artifact type — the product MUST emit a
diagnostic that identifies the offending file and MUST continue processing the remaining files;
a single malformed artifact MUST NOT abort the whole run.

## Rationale

Everything the toolkit does — validation, the product graph, impact analysis, handoffs — starts
from parsed artifacts. If parsing varies between runs or platforms, every downstream guarantee of
determinism collapses. And because product repositories are edited by humans and AI assistants
alike, malformed files are a normal condition, not an exceptional one: an author fixing one broken
artifact must still see the diagnostics for all the others, otherwise repair becomes a
one-file-at-a-time ordeal and the canonical files stop being trustworthy as a whole.

## Acceptance Scenarios

- A repository of well-formed artifacts is processed; each file yields its metadata (ID, type,
  title, status and relationship fields) and its body, and no diagnostics are emitted.
- One artifact file contains broken YAML frontmatter. The run reports a diagnostic carrying that
  file's repository-relative path, all other artifacts are parsed and validated normally, and the
  process exits with the documented validation-error exit code.
- The same repository content is parsed twice, including once on a different operating system;
  the parsed metadata and diagnostics are identical in content and order.
