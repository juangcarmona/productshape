# 0003 — Stable identifiers over paths

Status: Accepted Date: 2026-07-25

## Context

Artifacts reference each other constantly, and those references must survive years of repository reorganization. The obvious candidates for identity are file paths (used by most wiki-style systems) and titles. Both are unstable: files get moved when a model is restructured, and titles get reworded. A traceability system whose references break on a directory rename is not a traceability system.

## Decision

Every independently addressable artifact carries a stable, immutable ID with a typed prefix (`ACT-`, `JRN-`, `UC-`, `BR-`, `TERM-`, `BC-`, `FR-`, `QR-`, `CON-`, and `CHG-` for Product Changes), following the grammar in the [identifiers specification](https://github.com/product-definition-as-code/spec/blob/main/spec/identifiers.md).

Identity is defined by the `id` field only. IDs are never inferred from file paths or file names; moving or renaming an artifact file does not change its identity, and references between artifacts always use IDs, never paths or titles. The convention that a file is named after its lowercase ID is exactly that — a convention. Misalignment is a warning (`PRODUCT101`), never an error and never an identity mechanism.

IDs become immutable when an artifact is first accepted into the current product model, and they are never reused, including after the artifact is retired or removed. A Product Change that modifies an artifact uses the same ID in its proposed future-state file.

## Consequences

Positive:

- References survive any file reorganization; restructuring the model directory is a zero-risk operation for traceability.
- Handoffs, coverage mappings, work items and external systems can hold artifact references that stay valid across renames and even across an artifact's retirement.
- Typed prefixes make references self-describing in prose, diffs and diagnostics, and let validation catch a prefix/type mismatch (`PRODUCT004`) mechanically.
- Never reusing IDs keeps history unambiguous: an old handoff or commit message always points to the thing it pointed to when written.

Negative:

- Humans must mint IDs. Choosing a new unique ID is a small but real authoring step, and duplicate IDs (`PRODUCT005`) are a new class of mistake that path-based systems cannot make.
- Readable IDs can drift semantically from their titles: `ACT-PRODUCT-ENGINEER` may end up titled something else after years of edits. This is explicitly allowed — tools treat IDs as opaque — but it can mislead humans who read meaning into an ID.
- The lookup from ID to file requires tooling (or the filename convention holding); a plain text search is the fallback when it does not.
