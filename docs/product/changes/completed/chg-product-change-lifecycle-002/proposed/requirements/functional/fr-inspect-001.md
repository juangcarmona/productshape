---
id: FR-INSPECT-001
type: functional-requirement
title: Inspect any artifact by ID
status: active
derived-from:
  - UC-INSPECT-001
  - BR-IDENTITY-001
verification:
  - scenario: Inspecting an ID shows metadata, canonical path and relationships in both directions
  - scenario: Inspection reports the artifact content digest used by citations
  - scenario: Inspecting an unknown ID produces a diagnostic rather than partial output
---

## Requirement

The product MUST let a user inspect any product artifact by its stable ID. Inspection MUST present the artifact's metadata (type, title, status), its canonical repository-relative path, its content digest, its outgoing authored relationships and its derived incoming relationships. Inspecting an ID that does not resolve MUST produce a clear diagnostic and MUST NOT return partial or guessed information.

## Rationale

The ID is the artifact's identity; the file path is merely where it lives today. Anyone reading a review comment, a diagnostic or a citation meets bare IDs constantly, and the cost of answering "what is FR-X and what touches it?" determines whether the graph is actually used or merely maintained. One inspection answer that combines both relationship directions with the content digest turns the model from a pile of files into a navigable product definition — and shows, before anyone proposes a change, which accepted knowledge depends on it.

## Acceptance Scenarios

- A user inspects a functional requirement by ID. The output shows its type, title and status, the canonical path of its file, the artifacts it references via `derived-from`, and the derived incoming references pointing at it.
- The inspected artifact is cited by a consumer document. Inspection reports the digest needed to emit or refresh that citation alongside the artifact's structural context.
- A user inspects an ID present in no artifact. The command reports that the ID is unknown and exits without printing any artifact detail.
