# Design: add-product-landscape

## Context

The layered map already owns the band structure and is already reached at `#/graph/layers`. What changes is
what it draws: counted cells become individual titled nodes, and the budget-driven collapse that produced
those cells goes away, because every artifact is now represented.

The pan, zoom and fit behaviour built for the focused projection in the previous change is directly
reusable, and is the mechanism by which a landscape of 730 nodes becomes legible without pretending to be
legible all at once.

## Goals / Non-Goals

**Goals**

- Four bands permanently visible; every artifact kind in its fixed band; only populated bands rendered.
- Every artifact its own node, titled, individually reachable and selectable.
- Positions derived from the model alone, identical for identical content, stable across re-render.
- Pan, zoom and fit by pointer and keyboard.
- The SLI-SNAPSHOT-007 landscape integrity properties — deterministic stable placement, individual
  reachability, individual selection, no clipping, no node overlap — verified at all three reference
  scales, including 730, with artifacts-aggregated-away reported separately and zero.
- Whole-landscape rendering within its canonical 250 ms p95 budget at every reference scale.

**Non-Goals**

- Focus as a state of the landscape, the camera transition, background retention and reset —
  `SLI-SNAPSHOT-008`.
- The three-region Explorer, the persistent inspector and the unified selection operation —
  `SLI-SNAPSHOT-009`.
- Band scope as navigation state — `SLI-SNAPSHOT-010`.
- Aggregation, clustering or sampling of artifacts in any form.

## Decisions

### D1 — A deterministic grid inside each band, ordered by the graph's own sort

Each band is a lane. Within a lane, artifacts are grouped by kind in the fixed kind order and laid out in a
grid, filling columns then rows, in the order the compiled graph already sorts them. Position is therefore a
pure function of the model — no seeding, no relaxation, no measurement of rendered text.

A grid rather than a force layout is not a compromise. `FR-SNAPSHOT-007` requires positions to be identical
for identical content and unchanged across focus changes, and anything that settles cannot promise that. It
also makes the landscape scannable: a reader looking for a use case knows which lane to look in and reads
left to right.

### D2 — Fixed node geometry, canvas grows, navigation closes the gap

Nodes are a fixed size in canvas units. The canvas grows vertically as bands fill, and at 730 artifacts it is
several thousand units tall. That is the point: the requirement explicitly does not ask for a poster, and
pan, zoom and fit are how a reader gets from the whole product to a readable node.

The alternative — shrinking nodes to fit a fixed viewport — is what produces anonymous dots, which the
approved change forbids by name.

### D3 — The title is the node, with kind as an accent bar

A node renders as a low-radius rectangle with a thin kind-coloured bar on its leading edge, the title
truncated to the node's width, and the identifier beneath in monospace at smaller size. Kind colour touches
only the bar and the identifier, so a lane of forty nodes reads as a list of names rather than forty
coloured blocks — which is what `QR-PRESENTATION-001` means by accent rather than filled surface.

Truncation is a rendering consequence, not an information loss: the full title is in the node's accessible
name and its tooltip, and the artifact is one selection away from the inspector.

### D4 — The layered map's collapse machinery is deleted, not disabled

Counted cells, the rendered-artifact budget and the aggregate connectors between collapsed kinds all go.
They existed to keep a map legible while hiding artifacts, and hiding artifacts is now forbidden. Leaving
them behind a flag would leave two contradictory answers to the same question in the same file.

Edges are not drawn in the landscape state. The previous map drew them between rendered artifacts and
aggregated the rest; with every artifact rendered, drawing all 3,290 relationships at the largest scale
would reproduce the hairball this family of changes exists to remove. Relationship prominence belongs to the
focused state, which is `SLI-SNAPSHOT-008`; until then relationships remain fully readable as text on each
artifact's own view, which is what `FR-SNAPSHOT-005` requires of them.

### D5 — Selection keeps its existing wiring

Selecting a node calls the router exactly as the layered map already did. This slice does not change what
selection means or where it takes the reader — that is `SLI-SNAPSHOT-009`'s unified operation. Keeping the
existing behaviour means the landscape is immediately useful without half-building the next slice.

### D6 — Integrity measured structurally, not by eye

The five properties are checked in the harness rather than by inspection: stable placement by rendering
twice and comparing every position; individual reachability by asserting one focusable node per compiled
artifact; selectability by activating nodes and observing the selection; overlap and clipping by comparing
every node rectangle against every other and against the canvas bounds; and budget by timing the render.
Overlap at 730 nodes is 266,085 pairs, which is cheap and exhaustive rather than sampled.

## Risks / Trade-offs

- **A tall canvas is easy to get lost in.** Fit and keyboard panning mitigate it, and the focused state in
  the next slice is the real answer. Worth watching in review.
- **No edges in the landscape** makes it a map of places rather than connections. Deliberate per D4, and
  temporary: the focused state draws the relationships that matter to a selection.
- **Truncated titles** at narrow node widths. Accessible name and tooltip carry the full title, and the
  inspector carries everything.

## Migration Plan

None. The generated file is disposable and regenerated by `prodshape graph --format html`. `#/graph/layers`
continues to resolve, now to the landscape.

## Open Questions

None for this slice. `CHG-SNAPSHOT-003` carries none — both of its questions were resolved before approval.
