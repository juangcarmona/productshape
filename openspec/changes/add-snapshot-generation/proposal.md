# Proposal: add-snapshot-generation

## Why

Every way of understanding the product definition today requires the repository — cloning it, running the CLI, or reading raw Markdown — which excludes exactly the people who most need to understand the product: stakeholders, product owners, and teammates outside the engineering loop. Product Change **CHG-SNAPSHOT-001** (approved, sliced) introduces the Product Snapshot to close that gap; this OpenSpec change implements its first delivery slice, **SLI-SNAPSHOT-001** (work item `github:juangcarmona/productshape#19`, handoff `HOF-GITHUB-19`).

## What Changes

- `prodshape graph` gains an `html` output format: `prodshape graph --format html` generates a **Product Snapshot** — exactly one self-contained HTML file under the generated-output area.
- The page renders every product artifact organized by kind, with rendered Markdown content and a visible status badge per artifact.
- The page displays the source revision of the model it was generated from, visible without searching.
- Generation is deterministic: identical model content yields a byte-identical file across runs and platforms (no timestamps, stable ordering, normalized line endings).
- Generation is honest: unparseable artifacts produce diagnostics naming the file; no snapshot is emitted that silently omits part of the model.
- The page is fully static and read-only: no external resources fetched at open time, works from `file://` with networking disabled, offers no input that creates, edits or approves anything.

Out of scope for this slice (delivered by SLI-SNAPSHOT-002): relationship links between artifacts, graph visualization, client-side search.

## Capabilities

### New Capabilities

- `snapshot-generation`: generating the self-contained Product Snapshot HTML page from the compiled product graph via `prodshape graph --format html` — self-containment, determinism, revision stamping, honest diagnostics, and the readable by-kind rendering with status badges.

### Modified Capabilities

<!-- No existing spec's requirements change. The `product-graph` capability's existing requirements
     (compile graph, derived reverse views, deterministic output) are consumed, not modified. -->

## Impact

- **`packages/core`**: possibly none — the compiled graph and parsed artifacts are already exposed; the snapshot renderer consumes them.
- **`packages/cli`**: `graph` command accepts `html` in `--format`; new snapshot renderer module (HTML generation, embedded CSS, Markdown rendering) invoked from the graph pipeline; output written alongside existing generated outputs.
- **Dependencies**: Markdown-to-HTML rendering for artifact bodies — prefer an existing dependency or a minimal deterministic renderer; no runtime network dependencies allowed in the output.
- **Tests**: determinism (byte-identical double generation, golden file), self-containment (no external URLs in output), completeness (every artifact present), diagnostics on unparseable input; distribution/conformance suites unaffected.
- **Docs**: README and methodology docs mention the new format when the slice ships (product-side docs update happens at promotion of CHG-SNAPSHOT-001).
