# Tasks: add-snapshot-generation

## 1. Core renderer

- [x] 1.1 Add a minimal deterministic Markdown-subset renderer in `packages/core` (headings, paragraphs, lists, bold/italic, inline code, fenced code; preformatted fallback for anything else), with unit tests over each construct and the fallback.
- [x] 1.2 Add `buildSnapshotHtml(graph, artifacts, revision)` in `packages/core`: renders all artifacts grouped by kind (fixed kind order, then by ID), each with frontmatter metadata, rendered body, status badge, and `id`-based anchors; embeds one `<style>` block; stamps the source revision in the header; LF-only output; no script tags.
- [x] 1.3 Export the builder from `@prodshape/core` and unit-test: every artifact present, status badges rendered, revision stamped, no `http(s)://` references, no `<script>`, byte-identical double build.

## 2. CLI wiring

- [x] 2.1 Add `html` to the graph command's `--format` union; on `html`, resolve the source revision (explicit "revision unavailable" fallback outside git), write `<generated-root>/snapshot.html`, and print the output path.
- [x] 2.2 CLI test: `graph --format html` produces exactly one HTML file at the reported path; validation errors block generation with diagnostics (existing refusal path).

## 3. Determinism and self-containment gates

- [x] 3.1 Determinism test: generate twice over the repository's own model, assert byte equality; add a golden-file snapshot so a changed page always signals a reviewed change.
- [x] 3.2 Self-containment test: generated HTML contains no external resource references and renders every artifact of the self-applied model (count matches graph nodes).

## 4. Verification against the slice

- [x] 4.1 Manually open the generated snapshot from `file://` with networking disabled: browse all kinds, read rendered content, see status badges and the revision stamp without searching (SLI-SNAPSHOT-001 verification).
- [x] 4.2 Run the full suite (`pnpm test`, `pnpm format:check`) and record coverage evidence for FR-SNAPSHOT-001 / FR-SNAPSHOT-002 (partial) / QR-DETERMINISM-001 (partial) in the coverage mapping for this SDD change.
