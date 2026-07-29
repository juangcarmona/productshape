# Proposal: add-snapshot-navigation

## Why

The Product Snapshot shipped in v0.4.0 renders every artifact readably, but the relationships — the thing the methodology says _is_ the methodology — are still only metadata text. Product Change **CHG-SNAPSHOT-001**'s second and final delivery slice, **SLI-SNAPSHOT-002** (work item `github:juangcarmona/productshape#20`, handoff `HOF-GITHUB-20`), makes the snapshot a navigable graph: links in both directions, a visualization, and search. Completing it unblocks promotion of the whole Product Change.

## What Changes

- Every artifact reference on a rendered view becomes a **navigable link** — both the declared frontmatter references and the **derived reverse views** ("referenced by") computed from the rest of the model, which no authored file states.
- A **graph visualization** conveys the model's overall shape; **selecting a node highlights its relationships** (its neighborhood) and links to the artifact's rendered view.
- **Client-side search** over artifact IDs, titles and content, working fully offline from the single file.
- The page gains embedded JavaScript for search and visualization — still one self-contained file, no external resources, no editing capability, byte-identical regeneration preserved.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `snapshot-generation`: the generated page's requirements grow — bidirectional relationship navigation, graph visualization with node-selection highlighting, and offline client-side search join the existing generation contract.

## Impact

- **`packages/core`**: `buildSnapshotHtml` extends — relationship sections per artifact (outgoing + derived incoming, from the compiled graph's edge indexes), embedded search index (JSON), embedded visualization data, and one embedded `<script>` block (hand-written, dependency-free, deterministic).
- **Determinism**: the script is a static string; the search index and visualization data derive from the sorted graph — byte-identity preserved.
- **Self-containment**: no new dependencies, no external resources; the "no `<script>`" unit assertion from slice 1 is superseded by "only the embedded snapshot script" (the spec-level rule was always "self-contained", not "script-free").
- **Tests**: relationship links both directions, search index completeness, visualization data integrity, node-selection wiring, regeneration byte-identity.
