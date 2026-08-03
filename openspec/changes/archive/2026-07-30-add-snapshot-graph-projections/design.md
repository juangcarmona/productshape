# Design: add-snapshot-graph-projections

## Context

Three slices built the substance this one visualizes. Slice 1 embedded the model as inert data and gave the page one selected artifact and a fragment router. Slice 2 grouped each artifact's relationships by type and other-end kind, with exact counts and collapse — which is precisely the structure the focused neighbourhood needs, so the visual and the list can share it rather than agree by coincidence. Slice 3 made search ranked.

The circular whole-model graph survived all three, demoted but untouched, so nothing regressed before its replacement existed. This slice replaces and deletes it.

The interaction form was `CHG-SNAPSHOT-002`'s one open question. The product owner compared three mockups — a cloud of individual artifacts, a butterfly with incoming on one side and outgoing on the other, and an orbit of groups — each drawn against a typical artifact and against `BC-PRODUCT-DEFINITION`, which has 27 relationships all incoming. The orbit of groups was chosen.

## Goals / Non-Goals

**Goals**

- The focused neighbourhood as resolved: groups orbit the anchor, direction positional, open one and the rest stay put, small groups pre-opened, two gestures with distinct meanings.
- The layered map with the four fixed product-owned bands, band neutrality, authored direction preserved, filtering and collapse with exact hidden counts.
- Remove the circle; exactly three projections remain.
- Graph mode in the address.
- Deterministic arrangement everywhere; every node and edge traceable to the compiled graph.

**Non-Goals**

- Multi-hop expansion. One hop is the product decision.
- Saved layouts, draggable nodes, or any persisted view state.
- A physics or force-directed layout, which determinism forbids.
- Replacing the textual relationship list. It stays the substance; these accelerate it.

## Decisions

### D1 — Satellites are groups, so the projection's size tracks types, not degree

One satellite per `(direction, relationship type, other-end kind)` — the same partition slice 2 built, reused rather than reimplemented. This is what makes the projection hold: `BC-PRODUCT-DEFINITION` has 27 relationships in **5** groups, and the largest synthetic artifact has 171 in a similar handful. A cloud of individual artifacts is the circle again at that degree; a cloud of groups is five satellites.

Because the partition is shared, the visual and the SLI-SNAPSHOT-004 list cannot disagree about what an artifact connects to.

### D2 — Deterministic placement: outgoing above, incoming below, ordered by the graph

Outgoing groups occupy the upper half, incoming the lower, each spread across its half at even angular intervals in the graph's own group order. Direction is therefore positional, which satisfies the colour-independence requirement without needing a second signal, and placement is a pure function of the model — no seeding, no settling, no animation to wait for.

Even spacing over a half-circle rather than a full one costs some density at high group counts and buys an unambiguous axis. With five groups it reads clearly; the alternative — direction by arrow glyph alone on a full circle — puts the whole distinction on a small mark.

### D3 — Members fan into a local arc; the other satellites do not move

Opening a satellite inserts its members along a short arc just outside it. Nothing else is re-laid out. Re-anchoring the view on the opened group would give the fan more room, but it makes the projection jump under the reader's hand every time they explore, and it means two consecutive clicks produce two different pictures of the same artifact. Staying put is calmer and keeps the anchor where the eye left it. Recorded because it was the one sub-question the resolution left to design.

### D4 — Two gestures, two targets

Activating a **group** toggles it and changes nothing about the selection. Activating a **member** selects that artifact through the router. Nothing clears the selected artifact, so `FR-SNAPSHOT-006` holds, and the defect this change diagnosed in the old snapshot — a node needing two clicks because the first only highlighted — does not return, because the two clicks here act on different objects rather than meaning different things about the same one.

### D5 — The layered map draws bands, not a tree, and collapses by kind

Each band is a horizontal lane; within a lane, artifacts group by kind. At small scale members render directly; above a threshold a kind renders as a single counted cell that opens on request, and the map states the totals it is holding back. Edges draw between rendered artifacts; an edge to something currently collapsed is accounted for in the hidden count rather than drawn to nowhere.

Band order is presentational and the spec says so, but order still has to be _something_: context, behaviour, rules and language, commitments — the order the product change lists them in. The projection carries no arrows, gradients or connectors between bands, so nothing suggests flow.

### D6 — Edges are drawn with their authored direction regardless of geometry

An arrowhead marks the target end, computed from the edge, never from which band sits higher. The measured model has 180 of 196 relationships crossing bands in six distinct band-pair directions, and they do not form a monotone cascade: behaviour points at rules and at context, commitments point at behaviour. A layout that inferred direction from position would silently rewrite that into a tidier story than the model tells.

### D7 — The circle is deleted, not hidden behind a flag

Its route, its renderer and its styles go. Keeping it as an escape hatch would leave the snapshot with four projections and quietly reintroduce the thing `FR-SNAPSHOT-005` removed. The two replacements cover what it was reached for: composition and traceability by the kind-level aggregate, topology by the layered map, an artifact's connections by the focused neighbourhood.

### D8 — Graph mode joins the route as a third segment

`#/graph/<mode>` where mode is `layers` or `focus`; the focused mode carries the selected artifact from the existing artifact segment rather than duplicating it. The router's state object already reserved a slot for this in slice 1, so this slice fills a value rather than adding a mechanism.

## Risks / Trade-offs

- **Half-circle placement gets tight above roughly eight groups in one direction.** No artifact in the measured models comes close, and the mitigation if one appears is a second ring rather than a different layout.
- **The layered map is the projection that can still spill.** It is the only view that draws many real artifacts at once, so its collapse thresholds are the thing to watch as models grow. Measured, and it reports what it hides.
- **Deleting the circle removes a view someone may have been using.** Deliberate, and the reason the three preceding slices left it in place until its replacement existed.
- **Sharing the grouping code with the textual list couples them.** That is the point — they must not disagree — but a change to grouping now affects both surfaces, which the tests cover on both sides.

## Migration Plan

None for data. The generated file is disposable and regenerated by `prodshape graph --format html`. The old `#/graph` route resolves to the layered map so any link to it still opens a projection; legacy bare-identifier fragments continue to resolve as slice 1 established.

## Open Questions

None. `CHG-SNAPSHOT-002` has no unresolved questions: the fifth and last was resolved by the product owner and is realized here.
