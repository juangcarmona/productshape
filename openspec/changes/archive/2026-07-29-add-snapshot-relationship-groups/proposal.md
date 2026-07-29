# Proposal: add-snapshot-relationship-groups

## Why

`SLI-SNAPSHOT-003` gave the snapshot a single selected artifact and a place to read it, and carried the
previous flat relationship lists forward unchanged so nothing regressed. Those lists are the weakest
part of the explorer: they name a type and a direction per entry, but they spill every relationship at
once. `BC-PRODUCT-DEFINITION` in this repository's own model produces 27 undifferentiated rows, and the
largest representative model reaches 171.

Product Change **CHG-SNAPSHOT-002**'s second delivery slice, **SLI-SNAPSHOT-004** (work item
`github:juangcarmona/productshape#31`, handoff `HOF-GITHUB-31`), makes an artifact's relationships
legible without any visualization: grouped by relationship type and artifact kind, large groups
collapsed with exact counts, expanded only when the reader asks.

This is also the slice that produces the always-available non-visual equivalent that
`FR-SNAPSHOT-005` requires the focused neighbourhood projection to have. Building it before the
visual means the substance exists first and the drawing is an accelerator rather than the only path.

## What Changes

- Relationships are **grouped by relationship type and artifact kind** within each direction, instead
  of one flat list per direction. Every group states its **exact count**.
- A group large enough to overwhelm the view **starts collapsed** and expands only on reader action,
  with its expanded state exposed as state rather than appearance.
- Declared references and derived reverse references remain separately labelled, each entry keeps its
  relationship type and direction, and every related artifact stays selectable in one step.
- Artifacts with no relationships continue to report the absence in both directions.
- Related-artifact titles rendered from embedded data are escaped on that path too.
- Following a relationship goes through the same navigation mechanism, so Back retraces a sequence of
  followed relationships in reverse order.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `snapshot-generation`: the relationship half of the artifact detail gains grouping, exact counts and
  controlled expansion, and the requirement that a complete non-visual relationship list is always
  available joins the contract.

## Impact

- **`packages/core`**: the embedded application's relationship rendering restructures — group by
  `(direction, relationship type, artifact kind)`, sort deterministically, collapse above a threshold,
  wire expansion with `aria-expanded`. The generation side is unchanged: the same edge data already
  travels in the inert region.
- **Determinism**: grouping and ordering derive from the graph's existing sort; the file stays
  byte-identical for identical content.
- **Performance**: high-degree artifacts should get faster to display, not slower, because a collapsed
  group renders a summary row instead of its members. Re-measured against the artifact-selection
  budget agreed in `SLI-SNAPSHOT-003`.
- **Verification**: grouping and counts against the compiled graph, collapse and expansion behaviour,
  keyboard operation, escaping on the data path, and the hard cases at 27 and 171 relationships.
