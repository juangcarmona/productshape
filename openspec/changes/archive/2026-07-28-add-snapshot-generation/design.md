# Design: add-snapshot-generation

## Context

The graph command ([graph.ts](../../../packages/cli/src/commands/graph.ts)) already follows the pattern this change extends: it validates the baseline, refuses on errors, writes generated outputs, and switches on `--format` with builders exported from `@prodshape/core` (`buildMermaid`, `buildGraphJson`). The snapshot renderer is one more builder in that family.

## Goals / Non-Goals

**Goals**

- `prodshape graph --format html` writes exactly one self-contained HTML file to the generated-output area and reports its path.
- Deterministic output: byte-identical for identical model content across runs and platforms.
- Every artifact rendered by kind with status badge; source revision stamped visibly.
- Honest failure: validation errors block generation (the existing graph behavior already guarantees this — unparseable artifacts produce parse diagnostics, which are errors).

**Non-Goals (SLI-SNAPSHOT-002)**

- Relationship links between artifacts, graph visualization, client-side search.
- Any hosting story; any interactivity beyond scrolling and anchor navigation.

## Decisions

### D1 — Renderer lives in `@prodshape/core` as `buildSnapshotHtml`

Same home as `buildMermaid`/`buildGraphJson`: a pure function from the compiled graph (plus parsed artifact bodies and the source revision) to a string. The CLI stays a thin dispatcher. Purity is what makes determinism testable at the unit level.

### D2 — Markdown rendering: minimal deterministic renderer, no new dependency

Artifact bodies are constrained Markdown (headings, paragraphs, lists, bold/italic, inline code, fenced code) — the templates and specification enforce this vocabulary in practice. A small internal renderer (~150 lines) covering exactly that subset keeps the dependency surface at zero, guarantees determinism by construction, and avoids version-drift of a third-party renderer changing bytes between releases. If an artifact uses syntax outside the subset, the renderer falls back to preformatted text for that block — content is never dropped.

### D3 — Single file via embedded CSS, anchor navigation, no JavaScript in slice 1

The page is semantic HTML with one embedded `<style>` block. Navigation is a fixed sidebar of kinds → artifact titles using pure `#anchor` links (artifact ID as anchor), which works from `file://` with zero script. Slice 2 introduces JavaScript (search, visualization); slice 1 does not need it, and shipping without it makes self-containment and read-only-ness trivially auditable.

### D4 — Source revision comes from the repository, passed in by the CLI

The CLI resolves the current revision the same way handoff generation does and passes it to the builder. Same commit → same revision → deterministic. When no revision is resolvable (not a git checkout), the page states that explicitly rather than omitting the stamp.

### D5 — Output path: `<generated-root>/snapshot.html`

Alongside the existing generated outputs. The file is regenerable and non-canonical, consistent with everything else under the generated root. Unlike `mermaid` (stdout), `html` writes the file and prints the path — a page is not meaningfully consumable on stdout.

### D6 — Determinism mechanics

- Artifacts ordered by kind (fixed kind order), then by ID — never by file discovery order.
- LF line endings in the output unconditionally.
- No timestamps, no environment values, no random IDs; anchors derive from artifact IDs.
- Golden-file test plus double-generation byte-comparison, mirroring the existing determinism test approach for generated outputs.

## Risks / Trade-offs

- **Internal Markdown renderer misses syntax used by real models** → mitigated by the preformatted fallback (content always visible) and by rendering this repository's own 64 artifacts in tests — the self-applied model is the richest fixture available.
- **Page size on large models** → a few hundred artifacts of prose is well under 1 MB of HTML; acceptable for v1, revisit if real adopters report otherwise.
- **CSS-only navigation limits** → no collapsing/filtering in slice 1; acceptable because slice 2 adds script anyway.

## Migration Plan

Purely additive: a new format value and a new generated file. No existing behavior, output or configuration changes. Rollback is deleting the format branch.

## Open Questions

None blocking. Anchor scheme (`#UC-SNAPSHOT-001`) doubles as the deep-link contract slice 2 builds on; confirmed stable by using artifact IDs verbatim.
