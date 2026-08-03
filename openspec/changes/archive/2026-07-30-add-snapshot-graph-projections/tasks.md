# Tasks: add-snapshot-graph-projections

Product input: handoff `HOF-GITHUB-35`, slice `SLI-SNAPSHOT-006`, work item `github:juangcarmona/productshape/issues/35`.

## 1. Focused neighbourhood

- [x] 1.1 Reuse the slice-2 grouping to produce one satellite per direction, relationship type and other-end kind, each carrying its exact count.
- [x] 1.2 Place outgoing groups in the upper half and incoming in the lower, at even angular intervals in the graph's group order, computed deterministically.
- [x] 1.3 Draw the anchor and the satellites with their labels, counts and kind tokens.
- [x] 1.4 Open a satellite into a local arc of members without moving the other satellites; pre-open groups small enough to read at a glance.
- [x] 1.5 Activating a group toggles it and leaves the selection alone; activating a member selects that artifact through the router.
- [x] 1.6 Reveal a satellite's or member's identity on hover and on keyboard focus.
- [x] 1.7 Unit tests: one satellite per group with correct counts; outgoing above and incoming below; opening leaves others in place; group activation does not change selection; member activation does; placement identical across builds.

## 2. Layered model map

- [x] 2.1 Assign every artifact kind to its fixed band and render only populated bands.
- [x] 2.2 Group within a band by kind; render members directly at small scale and a counted cell above the threshold, opening on request.
- [x] 2.3 Draw edges between rendered artifacts with the authored direction, independent of band geometry; account for edges to collapsed artifacts in the hidden counts.
- [x] 2.4 Provide filtering, and state the exact number of artifacts and relationships collapsed or hidden.
- [x] 2.5 Ensure nothing states or implies precedence, causality or flow between bands.
- [x] 2.6 Unit tests: band assignment for all nine kinds; identical assignment across two unrelated models; only populated bands rendered; authored direction preserved for a counter-order edge; hidden counts exact; no node or edge absent from the compiled graph.

## 3. Removal and routing

- [x] 3.1 Delete the circular whole-model projection: route, renderer and styles.
- [x] 3.2 Add the graph mode to the route as `#/graph/<mode>`, with the old `#/graph` resolving to the layered map.
- [x] 3.3 Unit tests: exactly three projections exist and no whole-graph drawing does; a projection view is linkable and restored by Back; the legacy graph route still opens a projection.

## 4. Convergence and the whole-page checks slice 1 deferred

- [x] 4.1 Confirm in one pass that the artifact list, search results, relationship links and both projections all move the same single selection.
- [x] 4.2 Complete the whole exploration progression by keyboard alone on both the current-model and larger-model snapshots.
- [x] 4.3 Sweep every text-and-background pair the finished stylesheet can produce against WCAG 2.1 AA.
- [x] 4.4 Confirm one accent colour, and each artifact kind rendered in the same colour across every view and across two regenerations.

## 5. Accessibility and presentation for this slice's surfaces

- [x] 5.1 Both projections keyboard-operable including node selection, filtering, collapse and expand; visible focus; deliberate focus placement when a node selection changes the artifact.
- [x] 5.2 Expanded, collapsed and selected state exposed as state; accessible names for icon-only projection controls.
- [x] 5.3 Relationship direction and artifact kind determinable with colour removed; nothing needed hover-only; no non-essential transition under a reduced-motion preference.
- [x] 5.4 Projections adapt on a narrow viewport without horizontal page scrolling.

## 6. Scale, evidence and contract

- [x] 6.1 Measure focused-projection latency for the highest-degree and an isolated artifact at every representative scale; record the distribution and set the budget from it.
- [x] 6.2 Confirm the layered map does not render every node and edge for the largest representative model, and reports exact hidden counts.
- [x] 6.3 Confirm search and artifact-selection latency have not regressed against their budgets.
- [x] 6.4 Screenshots: focused neighbourhood collapsed and with a group opened, the layered map at both scales, and the narrow-viewport states.
- [x] 6.5 Confirm one self-contained file, no external resources, nothing persisted, nothing mutable, regeneration byte-identical.
- [x] 6.6 Full test suite, lint, typecheck, format check; record coverage evidence.
