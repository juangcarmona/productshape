---
id: CHG-SNAPSHOT-003
type: product-change
title: Replace the two map projections with one focus-and-context canvas
status: approved
base-revision: '4d253d70803a11ced20458d2924a81e4e1a29220'
operations:
  add:
    - TERM-PRODUCT-LANDSCAPE
    - FR-SNAPSHOT-007
  modify:
    - JRN-SNAPSHOT-001
    - UC-SNAPSHOT-EXPLORE-001
    - FR-SNAPSHOT-002
    - FR-SNAPSHOT-003
    - FR-SNAPSHOT-005
    - FR-SNAPSHOT-006
    - TERM-GRAPH-PROJECTION
    - QR-PRESENTATION-001
    - QR-SCALABILITY-001
  remove: []
---

## Problem

`CHG-SNAPSHOT-002` replaced one illegible whole-model circle with two legible projections, and each
answers its question well: the layered map shows how the product is stratified, the focused
neighbourhood shows what one artifact connects to. Used together, they do not add up to exploring a
product.

They are separate tabs, so they are separate places. Opening the focused neighbourhood discards the
whole-product view; returning to the layered map discards the neighbourhood. A reader who selects an
artifact in the layered map is taken to a different picture with a different arrangement, and the
product they were looking at a moment ago is simply gone. Nothing carries over — not position, not
proportion, not the sense of where in the model they are standing.

Selecting a node also does not let anyone read anything. It re-anchors the neighbourhood on that
artifact, which is movement without arrival: to read what was selected, the reader has to leave the map
for the artifact browser, and the map's state is lost when they do. The product owner's summary after
first use was that the remaining problem is not a layout defect or a cosmetic refinement — it is that
the separation between the two projections is the wrong interaction model.

The two projections are also redundant in a way that is now visible. Both draw real artifacts. Both
band or group them. Both collapse at scale. They differ mainly in scope: one is the whole product with
no focus, the other is one focus with no product. Those are not two views. They are two states of one
view, and the tab boundary between them is what destroys orientation.

## Intended Product Outcome

A reader can explore the complete product as one stable, banded map, select any artifact, and smoothly
move from whole-product context into a readable focused neighbourhood without losing orientation.

The Explorer holds one map, not two. It has two states and the reader moves between them by selecting
and clearing rather than by switching tabs.

In the **landscape** state the complete product is laid out in its four permanently visible semantic
bands. Every artifact is present as a compact node carrying its human-readable title, not an anonymous
dot. Nothing is hidden: this is the whole product, seen at once, as the thing the reader is standing in.

Selecting an artifact — from the map, from a search result, or from the artifact browser, all of which
perform the same operation — moves the map into its **focused** state. The selected artifact and the
neighbourhood relevant to it are promoted into the foreground; the camera centres on the artifact and
fits that neighbourhood; only the relationships belonging to the neighbourhood are drawn prominently.
The rest of the product stays visible behind it as a subdued background cloud, in the same places it
occupied a moment earlier. Selecting a different artifact promotes the new neighbourhood and returns
the previous one to the background. An explicit reset returns the map to the landscape.

Because artifacts hold their positions, changing focus never rearranges the product or destroys the
reader's spatial memory of it. The map is somewhere they learn, not a picture that is redrawn.

Reading happens in the inspector, which is always present and independently scrollable: title, kind,
stable identifier, authored content, and the artifact's relationships as text, with every related
artifact a navigation target. Selecting from the map updates the inspector; selecting in the inspector
moves the map. They are one instrument.

Band interaction stays deliberately separate. Selecting a band scopes or highlights the landscape and
the artifact browser, and never selects an artifact or creates a focused neighbourhood. Band scope and
artifact selection are distinct pieces of navigation state, and bands continue to carry no lifecycle,
sequence, precedence, causality, dependency or direction.

## Rationale

The tab boundary is the defect, so removing the boundary is the change. Everything else follows from
treating focus as a state of the whole map rather than as a different map.

Keeping the product visible behind the focus is what buys orientation, and orientation is the entire
reason this family of changes exists. `CHG-SNAPSHOT-002` established that a reader must be oriented
before being asked to read anything; it delivered that as a page of counts, which orients someone
arriving and then stops helping. A persistent landscape orients continuously: after ten selections the
reader still knows where they are, because where they are has not moved.

Stable positions are the mechanism, and they are worth stating as a requirement rather than leaving to
layout. A reader builds spatial memory of a model — bounded contexts up there, requirements down here,
that dense cluster on the left — and that memory is only valuable if it survives. A layout that
re-solves on every selection produces a technically correct picture that is useless to return to. This
is also why the change forbids re-arrangement rather than merely discouraging it: it is the property
that makes the landscape a place.

One canvas is also the honest consequence of what the two projections turned out to be. The layered map
already grouped and collapsed; the focused neighbourhood already grouped and counted. Their overlap was
large and their difference was scope. Merging them removes a whole surface, a tab, a second layout
model and a second set of collapse rules, and leaves fewer things that can disagree with each other.

Selection becoming one operation across three surfaces is the same reasoning applied to navigation.
`CHG-SNAPSHOT-002` already required every surface to converge on one selected artifact; it did not
require them to converge on one _behaviour_, so the map could move the selection without showing it and
the browser could show it without moving the map. Making the operation identical everywhere — set the
artifact, update the inspector, update the address, centre and fit — is what makes the three surfaces
feel like one instrument instead of three views that happen to share a variable.

Bands staying out of artifact selection matters because they are the one control that operates on the
landscape as a whole. Conflating them would mean a reader could not scope the view without also
committing to reading something, and the two are different intentions. Holding band scope separately in
navigation state is what lets a scoped landscape be linked and restored.

## Affected Product Areas

Found by inspecting the promoted baseline and running `prodshape impact` at depth 1 in both directions
over the snapshot subgraph. `UC-SNAPSHOT-EXPLORE-001` is the hub: all five Explorer functional
requirements derive from it and all three quality requirements apply to it, so a change to the
exploration model necessarily reaches every one of them.

**Modified:**

- **FR-SNAPSHOT-005** — currently mandates _exactly three_ projections and names the layered map and
  focused neighbourhood as two of them. It becomes the single focus-and-context canvas with its two
  states, keeping the fixed band assignment, the typed counted groups for large neighbourhoods, the
  colour-independent direction, the determinism rule and the always-available textual equivalent. The
  kind-level aggregate leaves this requirement — it is a table on the orientation view, not a map — and
  stays fully specified by FR-SNAPSHOT-003.
- **FR-SNAPSHOT-003** — its optional cross-reference to "a high-level layered view as defined in
  FR-SNAPSHOT-005" no longer names anything, and the orientation view's relationship to the landscape
  needs restating: it is the reader's entry point _into_ the map rather than an alternative to it.
- **FR-SNAPSHOT-002** — the Explorer's shape becomes the three regions this change fixes: left rail for
  search, bands, filters and browsing; the canvas in the centre; the inspector on the right, always
  present and independently scrollable. The master–detail rule survives inside it — still exactly one
  active artifact detail — but the detail is now a persistent inspector beside a map rather than a pane
  that replaces a list.
- **FR-SNAPSHOT-006** — selection becomes one operation performed identically from the map, search and
  the browser, including centring and fitting. Band scope joins the addressable state as a value
  distinct from the selected artifact, so a scoped landscape is linkable and restorable, and hover is
  explicitly excluded from changing either.
- **TERM-GRAPH-PROJECTION** — defined in terms of "three projections", one of which is being removed
  and two of which are merging. The concept survives and is worth keeping, but it now names the canvas
  and its two states alongside the aggregate.
- **QR-PRESENTATION-001** — gains the node and state presentation this change depends on: the
  human-readable title as the primary label with kind and identifier secondary, artifact-kind colour as
  an accent rather than a large filled surface, and five visually distinct states — focused, selected,
  related, background and hovered.
- **QR-SCALABILITY-001** — its interaction set was search, artifact selection and focused-projection
  rendering. It becomes search, artifact selection, landscape rendering and the focus transition, all
  measured on the same named reference environment with budgets set from recorded figures. The
  artifact-selection budget already agreed continues to bind, and now binds a selection that also moves
  a camera.
- **UC-SNAPSHOT-EXPLORE-001** — the exploration flow is the change: land in the landscape, select from
  any surface, read in the inspector while the product stays behind, follow a relationship, scope by
  band, reset. Gains `TERM-PRODUCT-LANDSCAPE` in `uses-terms`.
- **JRN-SNAPSHOT-001** — the narrative describes opening "the layered map ... which they filter and
  collapse", which stops being true.

**Added:**

- **TERM-PRODUCT-LANDSCAPE** (Product Landscape) — names the thing the reader learns: the complete
  product laid out in its bands, persistent across focus changes. Needed because the change turns on
  the distinction between the landscape and a focus within it, and both UC-SNAPSHOT-EXPLORE-001 and two
  requirements have to refer to it precisely.
- **FR-SNAPSHOT-007** — spatial stability, camera behaviour and reset. Separated from FR-SNAPSHOT-005
  because it is a different kind of claim, independently verifiable and independently deliverable: that
  artifact positions do not change when focus changes, that the camera moves smoothly to centre and fit,
  that the previous focus returns to the background rather than vanishing, and that an explicit action
  restores the landscape. FR-SNAPSHOT-005 says what the map contains; this says what stays put.

**Deliberately not modified:**

- **FR-SNAPSHOT-001** — the generation contract. One self-contained deterministic offline file, visible
  revision, honest diagnostics: untouched and still binding.
- **FR-SNAPSHOT-004** — ranked search. Its results become a selection surface governed by
  FR-SNAPSHOT-006's single operation, which is stated there rather than here; the ranking, snippets and
  truncation honesty are unaffected.
- **QR-ACCESSIBILITY-001** — already requires complete keyboard operation, visible focus, state exposed
  as state, no colour-only meaning, no essential hover-only information and reduced-motion respect. Every
  one of those applies to the canvas as written; the requirement needs no change to cover it, and the
  reduced-motion clause already governs the camera transition this change introduces.
- **CON-NO-WEB-UI** — the boundary this change lives inside. A camera position is reader state, held in
  the current view and nowhere else, so nothing here approaches the persistence the constraint forbids.
- **TERM-PRODUCT-SNAPSHOT** — describes the file as carrying "three of them"; that phrasing is a
  consequence of TERM-GRAPH-PROJECTION rather than a separate claim, and the term's own definition of
  completeness-without-simultaneity is unaffected. Left alone deliberately to keep the change's modify
  set to artifacts whose own statements are wrong.

## Open Questions

None outstanding. Two questions were raised when this change was drafted; the product owner has resolved
both, and the resolutions are recorded here and realized in the proposed artifacts.

1. **Does the landscape stay legible at the largest reference scale, and if not, what gives way? —
   Resolved: nothing gives way, because the question rested on a misreading of the obligation.**

   The landscape must contain every artifact as a stable, individually reachable artifact node. It must not
   replace artifacts with anonymous dots, must not silently omit any, and must not require the reader to
   scope the model before entering it.

   "Every artifact is a titled node" does **not** mean every title must be simultaneously readable in a
   viewport fitted to the whole product. That reading is unsatisfiable at 730 artifacts by any rendering,
   and a requirement no implementation can meet is worse than none. The landscape is navigable through
   focus, panning, zooming, search and browsing; it is not required to behave as a poster legible at one
   fixed scale. The title remains the node's primary identity whenever it is inspected or presented at
   readable detail.

   At the 730-artifact reference scale, acceptance verifies five properties instead: stable placement,
   individual reachability, successful selection and focus, interaction within the measured budgets, and the
   absence of collisions, clipping or inaccessible content. Simultaneous label readability is explicitly not
   among them.

   Aggregation is not adopted as an assumed solution. Any future reduction in the number of individually
   represented artifacts would require a separate product decision.

   Realized in FR-SNAPSHOT-005, QR-PRESENTATION-001 and QR-SCALABILITY-001.

2. **Is the kind-level aggregate still worth keeping once the landscape exists? — Resolved: retained.**
   The two are complementary rather than redundant. The aggregate answers exact composition and counts,
   which a picture cannot do precisely. The landscape answers spatial orientation and relationship
   exploration, which a table cannot do at all. A reader who wants to know how many functional requirements
   derive from use cases is served by the table; a reader who wants to know where in the product they are
   standing is served by the map.

   Realized in FR-SNAPSHOT-003, which continues to require the aggregate on the orientation view, and in
   TERM-GRAPH-PROJECTION, which names both as projections serving distinct questions.

## Product Acceptance

Thirteen criteria: the twelve areas the product owner named, plus a thirteenth confirming the constraints
that must remain true throughout. The product owner recognizes this change as correctly realized when, using
a snapshot generated from any product model:

1. **Initial landscape.** The map opens showing the complete product in its four permanently visible bands,
   with every artifact present as its own stable, individually reachable node — none anonymous, none
   omitted, and no scoping required to enter. Titles identify nodes at readable detail; simultaneous
   legibility across a whole-product fit is not required.
2. **Selection from every surface.** Selecting an artifact in the map, in a search result and in the
   artifact browser each produce the identical outcome: that artifact is selected, the inspector shows
   it, the address reflects it, and the camera centres and fits its neighbourhood.
3. **Smooth focus transition.** The move from landscape to focus is continuous rather than a redraw, and
   is suppressed where the reader's environment asks for reduced motion.
4. **Neighbourhood fitting.** After selection the focused neighbourhood is wholly within the visible
   canvas, with nothing clipped and nothing overlapping.
5. **Background context preserved.** The rest of the product remains visible behind the focus, subdued,
   and in the same positions it occupied before the selection.
6. **Repeated focus changes.** After ten consecutive selections, every artifact not currently focused is
   still in the position it started in, and the previous focus has returned to the background rather
   than disappeared.
7. **Band scoping.** Selecting a band scopes or highlights the landscape and the artifact browser,
   changes neither the selected artifact nor the focus, and is represented in the address separately
   from the selected artifact.
8. **Large neighbourhood.** Focusing the most connected artifact in the model yields typed counted groups
   rather than an unreadable neighbourhood; expanding one keeps the background context stable and introduces
   no collision or clipping, at each defined model scale on the named reference environment.
9. **Reset.** An explicit action returns the map to the complete landscape from any focused state.
10. **Address and history.** The selected artifact, the band scope and the map state are all restored by
    opening an address and by browser Back and Forward.
11. **Keyboard.** The landscape, selection, focus, band scope, group expansion and reset are all
    operable from the keyboard, with visible focus and no pointer-only path.
12. **Reference environment.** Landscape rendering, focus transition and artifact selection are measured on
    the named reference environment across the three defined reference model scales, and their figures
    recorded. At each of those scales the landscape is verified against five properties: stable placement,
    individual reachability, successful selection and focus, interaction within the measured budgets, and no
    collision, clipping or inaccessible content. The claim is bounded to those scales, that environment and
    those scenarios — it is not a claim about arbitrary models.
13. **Everything still true.** One self-contained deterministic offline file; Markdown canonical;
    read-only with no persistence beyond the address; every artifact and relationship reachable and
    readable as text.

## Out of Scope

- **Implementation choices.** No graph library, layout algorithm, force simulation, camera or animation
  technique is decided here. The requirements state that positions are stable, that arrangement is
  deterministic and that the transition is smooth and reduced-motion aware; how is a technical-design
  decision.
- **The orientation view's other content.** Identity, revision, counts, entry points and the
  no-relationships group are unchanged. Only the dead cross-reference to the layered view is corrected.
- **Search ranking.** FR-SNAPSHOT-004 is untouched; search changes only in that selecting a result now
  performs the same operation as selecting anywhere else, which FR-SNAPSHOT-006 states.
- **Multi-hop neighbourhoods.** One hop remains the product decision. Deeper reachability belongs to the
  impact-analysis capability, not the snapshot.
- **Aggregating the landscape.** Every artifact is individually represented, and reducing that — by
  aggregation, sampling, clustering or any other means — is not part of this change. If a future model scale
  makes it necessary, it is a separate product decision, not an implementation liberty.
- **Saved views.** No camera position, band scope or expansion state is persisted anywhere but the
  address of the current view. Nothing is remembered between visits.
- **Editing, comments, approval, hosting, runtime APIs, graph databases or AI inference.** Unchanged and
  still excluded.
- **Rendering Product Changes, Delivery Slices or Handoffs.** The compiled graph the snapshot projects
  contains baseline artifacts only, and this change does not widen it.
