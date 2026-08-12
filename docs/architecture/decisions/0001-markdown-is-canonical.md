# 0001 — Markdown is canonical

Status: Accepted Date: 2026-07-25

## Context

Product knowledge needs a source of truth that survives tool churn, diffs cleanly, reviews well in pull requests and can be read without any toolkit installed. Candidates included a database, a structured store (JSON/YAML documents as the primary format), and plain text under Git. The methodology also produces many computed views — graphs, indexes, diagrams, handoffs — and a rule is needed for which files may be edited and which must never be.

## Decision

Authored Markdown files (artifact documents with YAML frontmatter) and authored delivery-slice YAML files under `docs/product` are the source of truth. Git history is the historical record; no separate audit log exists.

"Markdown is canonical" is shorthand, not a literal file-extension rule: the canonical-authority table in the [specification](https://github.com/product-definition-as-code/spec/blob/main/spec/conformance.md) is normative. What makes a file canonical is that a human (possibly AI-assisted) authored it and reviews it, not its extension.

Everything else — the product graph JSON, generated indexes, Mermaid diagrams, Product Handoffs, Product Context documents, traceability reports — is derived, non-canonical and rebuildable from the canonical files at any time. Tools must never require a generated file to exist in order to rebuild it, and generated files must never be edited by hand.

## Consequences

Positive:

- Product knowledge is reviewable in any pull-request UI and readable with no tooling installed.
- Git provides history, blame, branching and merge workflows for free; no bespoke versioning layer is needed.
- Derived outputs can be gitignored, regenerated or discarded without losing information, which keeps repositories clean and makes corruption of computed views a non-event.
- The canonical/derived split gives validation a crisp target: only canonical files are inputs.

Negative:

- There are no query-time joins. Every relationship lookup requires compiling the graph from text; nothing can be answered by a database index.
- All tooling must parse text (frontmatter extraction, YAML parsing) before doing anything useful, and parse errors become a first-class failure mode (`PRODUCT001`).
- Merge conflicts are text-level. Two changes touching the same artifact conflict as lines in a file, and Git cannot understand that two frontmatter edits are semantically compatible.
