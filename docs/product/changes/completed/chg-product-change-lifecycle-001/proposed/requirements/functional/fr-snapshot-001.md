---
id: FR-SNAPSHOT-001
type: functional-requirement
title: Generate a self-contained Product Snapshot page
status: active
derived-from:
  - UC-SNAPSHOT-001
  - BR-CANONICAL-001
  - CON-NO-GRAPH-DATABASE
verification:
  - scenario: One command produces exactly one HTML file that opens from local disk with no server and no network access
  - scenario: The generated page records the source revision of the model it was generated from
  - scenario: Regenerating from identical model content yields a byte-identical file
  - scenario: Generation reports parse diagnostics and never emits a snapshot that silently omits artifacts
---

## Requirement

The product MUST generate a Product Snapshot from the authored product model with a single CLI command. The output MUST be exactly one self-contained HTML file: no external scripts, styles, fonts, images or data are fetched at open time, and the page MUST function completely when opened from local disk without any server. The page MUST record the source revision of the model it was generated from, visibly to the reader. Generation MUST be deterministic — identical model content MUST yield a byte-identical file — and MUST never modify any authored file. When artifacts cannot be parsed, generation MUST report diagnostics rather than emit a page that silently omits part of the model.

## Rationale

Self-containment is what makes the snapshot shareable to its actual audience: one file that can be attached, messaged or hosted anywhere, opened by someone who will never install anything. The recorded source revision gives "which state of the model am I looking at?" a deterministic answer instead of a guess. Byte-identical regeneration keeps the snapshot firmly in the family of derived outputs: a changed snapshot always signals a changed model, never a nondeterministic generator. Refusing to silently omit unparseable artifacts protects the snapshot's claim to be an honest projection — a page that quietly dropped part of the model would mislead exactly the reader least equipped to notice.

## Acceptance Scenarios

- An engineer runs the snapshot command in a repository with a valid model. Exactly one HTML file is produced under the generated-output area; opened from local disk with networking disabled, every capability of the page works.
- The generated page is inspected: the model's source revision is displayed where a reader finds it without searching.
- The snapshot is generated twice from the same commit, on two different platforms. The two files are byte-identical.
- One artifact file is made unparseable. Generation reports a diagnostic naming the file; no snapshot is produced that silently lacks the artifact.
