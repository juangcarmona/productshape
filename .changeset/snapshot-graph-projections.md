---
'@prodshape/core': minor
---

Product Snapshot: two graph projections replace the whole-model circle

The circular whole-model graph is gone. It was never legible — every node sat on one circle so position
carried no information, and at 730 artifacts it drew 3,290 chords. Three slices left it standing,
demoted, so nothing regressed before its replacement existed. Two projections replace it.

**Focused neighbourhood.** The selected artifact anchors the centre and its relationship _groups_ orbit
it, each stating its relationship type, the artifact kind at the other end and its exact count. Outgoing
groups sit above the anchor and incoming below, so direction is positional and survives colour removal.
Opening a satellite fans its members out beside it while every other satellite stays put; small groups
arrive open. Clicking a group expands it, clicking an artifact selects it — two gestures on two
different things, so neither is overloaded.

Because satellites are groups, the projection's size tracks how many relationship _types_ an artifact
has rather than its degree: 27 relationships become 5 satellites, and so do 171. It renders in 18 ms at
the largest measured scale.

**Layered model map.** Real artifacts in four fixed, product-owned bands — Product context, Product
behaviour, Rules and language, Product commitments. Bands organize the view and state no order, cause or
dependency; every relationship keeps its authored direction regardless of which band sits higher. The
map draws a small model in full and holds back a large one, collapsing the biggest kinds into counted
cells while routing their relationships into counted aggregate connectors, so nothing is omitted at any
scale and the summary states the split.

The graph mode joins the address as `#/graph/layers` or `#/graph/focus/<id>`, so a projection view is
linkable and restored by Back. The route earlier snapshots used still opens the layered map.

With this, every consumer of the selected artifact — the list, search, relationship links and both
projections — converges on one state.
