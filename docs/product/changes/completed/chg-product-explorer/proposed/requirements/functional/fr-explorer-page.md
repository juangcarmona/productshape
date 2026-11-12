---
id: FR-EXPLORER-PAGE
type: functional-requirement
title: Generate a self-contained Product Explorer page
status: active
derived-from:
  - UC-EXPLORER-GENERATE
  - BR-CANONICAL
  - CON-NO-GRAPH-DATABASE
verification:
  - scenario: One command produces exactly one HTML file that opens from local disk with no server and no network access
  - scenario: The generated page records the source revision of the model it was generated from
  - scenario: Regenerating from identical model content yields a byte-identical file
  - scenario: Generation reports parse diagnostics and never emits a Product Explorer that silently omits artifacts
  - scenario: Generation writes `explorer.html` and removes a `snapshot.html` that an earlier release left in the generated-output area
---

## Requirement

The product MUST generate a Product Explorer from the authored product model with a single CLI command. The output MUST be exactly one self-contained HTML file: no external scripts, styles, fonts, images or data are fetched at open time, and the page MUST function completely when opened from local disk without any server. The page MUST record the source revision of the model it was generated from, visibly to the reader. Generation MUST be deterministic — identical model content MUST yield a byte-identical file — and MUST never modify any authored file. When artifacts cannot be parsed, generation MUST report diagnostics rather than emit a page that silently omits part of the model.

The file is `explorer.html` in the generated-output area. Releases before the Product Explorer name wrote `snapshot.html`; generation MUST remove that file when it finds it, so a repository never carries two generated pages of which one is stale.

## Rationale

Self-containment is what makes the Product Explorer shareable to its actual audience: one file that can be attached, messaged or hosted anywhere, opened by someone who will never install anything. The recorded source revision gives "which state of the model am I looking at?" a deterministic answer instead of a guess. Byte-identical regeneration keeps the Product Explorer firmly in the family of derived outputs: a changed Product Explorer always signals a changed model, never a nondeterministic generator. Refusing to silently omit unparseable artifacts protects the Product Explorer's claim to be an honest projection — a page that quietly dropped part of the model would mislead exactly the reader least equipped to notice.

## Acceptance Scenarios

- An engineer runs the Product Explorer command in a repository with a valid model. Exactly one HTML file is produced under the generated-output area; opened from local disk with networking disabled, every capability of the page works.
- The generated page is inspected: the model's source revision is displayed where a reader finds it without searching.
- The Product Explorer is generated twice from the same commit, on two different platforms. The two files are byte-identical.
- A repository upgraded from a release that wrote `snapshot.html` regenerates: `explorer.html` is written and `snapshot.html` is gone.
- One artifact file is made unparseable. Generation reports a diagnostic naming the file; no Product Explorer is produced that silently lacks the artifact.
