# Proposal: add-snapshot-explorer-foundation

## Why

The Product Snapshot shipped through `CHG-SNAPSHOT-001` proves the generation contract — one
deterministic, self-contained, offline file — but it presents the compiled model by rendering all of
it at once: 73 artifact bodies as live markup and 196 relationships drawn on one circle, before the
reader has chosen anything. Product Change **CHG-SNAPSHOT-002** replaces simultaneous presentation
with progressive disclosure. Its first delivery slice, **SLI-SNAPSHOT-003** (work item
`github:juangcarmona/productshape#28`, handoff `HOF-GITHUB-28`), is the dependency root: it makes the
page open on orientation, lets one artifact be read on its own, and gives the reader one addressable
selected artifact. Three further slices depend on it and are not part of this change.

## What Changes

- The page **opens on an orientation view**: product identity, source revision, total artifact and
  relationship counts, counts by kind with an entry point into each, a plain statement that the page
  is a generated read-only projection, a **kind-level relationship aggregate**, and a neutral report
  of the artifacts holding no relationships. It renders **no artifact body and no artifact-level
  graph**.
- Artifact reading becomes **master–detail**: the list is reachable by kind and narrowed by filters,
  **exactly one artifact detail is active**, and no other artifact's content is present in the
  document alongside it. Artifact bodies move out of the opening markup and are rendered on demand
  from data embedded in the same file.
- **One selected artifact**, owned by a single navigation mechanism and addressed in the URL
  fragment. Direct artifact links work from `file://` and static hosting; Back and Forward retrace
  the exploration; an unknown identifier produces an explicit state naming it.
- **Legacy `#<ARTIFACT-ID>` fragments resolve permanently**, normalized in place through a history
  replacement so no redundant entry appears.
- The interface becomes a **light, compact, text-first instrument** with system sans-serif prose,
  monospaced identifiers and revisions, thin borders, one restrained accent plus a stable
  per-artifact-kind palette, and no meaning carried by colour alone.
- The delivered surfaces are **fully keyboard-operable and accessible**: landmarks and heading
  outline, visible focus with deliberate placement, `aria-current` on the selected artifact, WCAG 2.1
  AA contrast, no hover-only information, reduced-motion respected.
- A **measurement harness and named reference environment** are established, and the
  artifact-selection latency budget is set from recorded figures. No numeric interaction budget is
  assumed in advance.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `snapshot-generation`: the generated page's requirements change shape. "Every artifact is rendered,
  organized by kind" becomes "every artifact is embedded and exactly one is rendered at a time"; the
  whole-model visualization stops being part of the opening view; read-only grows a no-persistence
  clause; and orientation, addressing, presentation, accessibility and measured scale join the
  contract.

## Impact

- **`packages/core`**: `buildSnapshotHtml` restructures. Artifact content and relationship structure
  are emitted as inert embedded data rather than live markup; the opening markup carries the
  orientation view only; the embedded script grows a navigation mechanism, a fragment router and
  on-demand rendering.
- **Determinism**: unchanged as a contract and re-verified. Data serialization follows the graph's
  existing sort; no timestamps, no randomness, no runtime layout.
- **Self-containment**: unchanged. No dependency is added by this change; nothing is fetched.
- **Backward compatibility**: legacy bare-identifier fragments keep resolving, permanently. The
  existing relationship lists and existing search are carried forward unchanged so this increment
  does not regress shipped capability; `SLI-SNAPSHOT-004` and `SLI-SNAPSHOT-005` replace them.
- **Verification**: unit tests for the opening document's composition, embedded-data completeness,
  escaping on both channels, fragment routing including legacy normalization, and regeneration
  byte-identity; plus browser-based accessibility, presentation and latency evidence recorded on a
  named reference environment.
