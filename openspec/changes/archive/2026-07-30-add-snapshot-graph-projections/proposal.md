# Proposal: add-snapshot-graph-projections

## Why

The whole-model circle is the last piece of the old snapshot still standing. Slice 1 demoted it out of the opening view and slices 2 and 3 left it alone, deliberately, so nothing regressed while the foundation, the relationship groups and ranked search landed. It has never been legible: every node sits on one circle so position carries no information, and at 730 artifacts it draws 3,290 chords.

Product Change **CHG-SNAPSHOT-002**'s final delivery slice, **SLI-SNAPSHOT-006** (work item `github:juangcarmona/productshape#35`, handoff `HOF-GITHUB-35`), replaces it with the two projections the change specified, and deletes it.

The interaction form of the focused neighbourhood was the change's one open question. The product owner compared three alternatives and chose an **orbit of groups**; that resolution is recorded on `CHG-SNAPSHOT-002` and this slice realizes it.

## What Changes

- A **focused neighbourhood** anchored on the selected artifact. What orbits the anchor are the relationship **groups**, each stating its relationship type, the artifact kind at the other end and its exact count. Incoming and outgoing sit on opposite sides of the anchor's axis, so direction is positional. Opening a satellite fans its members into a local arc while the others stay in place; small groups arrive open. Clicking a group expands or collapses it; clicking an artifact selects it.
- A **layered model map** placing real artifacts in four fixed, product-owned bands: Product context (Actors, Bounded Contexts), Product behaviour (Journeys, Use Cases), Rules and language (Business Rules, Domain Terms), Product commitments (Functional Requirements, Quality Requirements, Constraints). Bands organize the view and imply no lifecycle, causality, sequence or direction. It filters, groups and collapses, states exact hidden counts, and never draws every node and edge by default.
- The **whole-model circle is removed**. The snapshot provides exactly three projections — kind-level aggregate, layered map, focused neighbourhood — and no unstructured drawing of the entire graph.
- The **graph mode joins the addressable state**, so a projection view is linkable and restored by Back and Forward. With this slice every consumer `FR-SNAPSHOT-006` names converges on one selection.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `snapshot-generation`: the "Graph visualization with node-selection highlighting" requirement is replaced by the focused neighbourhood and the layered model map, and the three-projection boundary becomes explicit.

## Impact

- **`packages/core`**: the embedded application gains two projection renderers and loses the circular one. Both are built from the edge and artifact data already embedded; the grouping logic from `SLI-SNAPSHOT-004` is reused rather than duplicated, so the visual and the textual list cannot disagree.
- **Determinism**: satellite and band placement derive from the graph's existing ordering. No physics, no randomness, no runtime layout engine.
- **Performance**: the focused neighbourhood renders one anchor plus one satellite per group — bounded by an artifact's relationship _types_, not its degree — so it should be cheap even at degree 171. The layered map is the projection that must actively hold back content at scale.
- **Verification**: band assignment against every kind, band neutrality, direction preserved across bands, collapse with exact hidden counts, the three-projection boundary, convergence across all four consumers in one pass, and the two whole-page checks slice 1 deferred until every surface existed.
