---
id: FR-SNAPSHOT-005
type: functional-requirement
title: Explore the product through one focus-and-context canvas
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
  - BR-RELATIONSHIPS-001
  - CON-NO-GRAPH-DATABASE
verification:
  - scenario: The snapshot provides one map with a landscape state and a focused state, and no separate whole-product and neighbourhood views
  - scenario: The four semantic bands are permanently visible in both states, and every artifact kind is assigned to its fixed band
  - scenario: Every artifact is present in the landscape as an individually reachable node, never an anonymous mark, and none is silently omitted
  - scenario: The reader can enter the landscape and reach any artifact without first scoping the model
  - scenario: An artifact node presents its human-readable title as its primary identity whenever it is shown at readable detail
  - scenario: Selecting an artifact promotes it and its neighbourhood into the foreground while the rest of the product remains visible behind as subdued background
  - scenario: Only relationships belonging to the focused neighbourhood are drawn prominently, each with its type and its authored direction
  - scenario: A focused artifact with too many direct neighbours yields typed counted groups that expand on request rather than an unreadable neighbourhood
  - scenario: Bands imply no lifecycle, sequence, precedence, causality, dependency or relationship direction, and authored direction is preserved across bands
  - scenario: At each defined reference model scale, on the named reference environment, no artifact or relationship is clipped, overlapping or unreachable, in either state and at any expansion
  - scenario: Selecting a node in the map makes that artifact the page's single selected artifact
  - scenario: No node, relationship or direction absent from the compiled graph is drawn, and no importance, health, ownership or ordering is implied
  - scenario: Identical model content produces an identical arrangement
---

## Requirement

The Product Snapshot MUST provide **one** map of the product — the Product Landscape — with two states,
and MUST NOT provide separate whole-product and neighbourhood views between which a reader must switch.

**Bands.** The map MUST place real artifacts in four bands, permanently visible in both states, assigning
every artifact kind as follows: Product context holds Actors and Bounded Contexts; Product behaviour holds
Journeys and Use Cases; Rules and language holds Business Rules and Domain Terms; Product commitments
holds Functional Requirements, Quality Requirements and Constraints. This assignment is owned by the
product, MUST be identical for every model the snapshot projects, and MUST NOT be configurable by an
adopter or derived per model. A future canonical artifact kind MUST receive an explicit band through a
Product Change before the map can place it.

Bands organize the view only. Band membership and band order MUST NOT imply lifecycle stage, sequence,
precedence, causality, dependency or relationship direction, and the map MUST NOT present them as doing
so. Only bands the model populates MUST be rendered.

**Landscape state.** The map MUST open showing the complete product. Every artifact MUST be present as a
stable, individually reachable artifact node. An artifact MUST NOT be reduced to an anonymous mark, MUST
NOT be silently omitted, and the reader MUST NOT be required to scope the model before entering the
landscape. The landscape MUST NOT reduce what it shows except through band scope and filters the reader
has applied, and never silently.

An artifact node MUST present the artifact's human-readable title as its primary identity whenever it is
shown at readable detail — when focused, hovered, inspected, or viewed at a scale where its label renders.
This does **not** require every title in the model to be simultaneously readable in a viewport fitted to
the whole product. The landscape is navigable through focus, panning, zooming, search and browsing; it is
not required to behave as a poster legible at one fixed scale. What MUST hold, at each model scale named in
QR-SCALABILITY-001 and on its named reference environment, is that each artifact occupies a stable position,
is individually reachable, and can be selected and focused.

Reducing the number of individually represented artifacts — by aggregation or any other means — is not
permitted by this requirement and would require a separate product decision.

**Focused state.** Selecting an artifact MUST promote that artifact and the neighbourhood relevant to it
into the foreground, and MUST leave the rest of the product visible behind it as subdued background
context. Only the relationships belonging to the focused neighbourhood MUST be drawn prominently. Each
MUST state its relationship type and its authored direction, including where it crosses bands and where it
runs counter to band order; direction MUST remain determinable with colour removed. Selecting a different
artifact MUST promote the new neighbourhood and return the previous one to the background.

**Large neighbourhoods.** Where a focused artifact has more direct neighbours than can be read at once,
the neighbourhood MUST present them as typed counted groups — by relationship type and by the artifact
kind at the other end — with exact counts, expanding only when the reader asks. Expansion MUST NOT
introduce collision or clipping.

**Everywhere.** At each model scale named in QR-SCALABILITY-001, measured on its named reference
environment, nothing MUST be clipped or overlap another element and no artifact or relationship MUST be
unreachable, in either state and at any combination of expanded groups. Selecting a node MUST make that artifact the page's single selected artifact as
FR-SNAPSHOT-006 defines; the map MUST NOT hold a selection of its own. The map MUST NOT draw a node,
relationship or direction the compiled graph does not contain, MUST NOT imply importance, centrality,
health, ownership, sequence or ordering the model does not record, and MUST produce an identical
arrangement for identical model content. Every relationship the map draws MUST also be readable as text on
the artifact's own view, so nothing it communicates depends on seeing it.

## Rationale

Two projections behind two tabs were two places, and the boundary between them was where orientation went.
Opening a neighbourhood discarded the product; returning to the product discarded the neighbourhood. A
reader who selected a node was shown a different picture with a different arrangement and no trace of where
they had been standing. That is not a layout problem to tune; it is the wrong model, so the fix is to have
one map and make focus a state of it.

Keeping the whole product visible behind the focus is what buys continuous orientation. Orientation before
reading is the principle this family of changes established, and a page of counts delivers it once, to
someone arriving. A landscape that stays put delivers it on the tenth selection as much as the first,
because the reader's sense of place is a property of the map rather than something they have to rebuild.

Every artifact carrying its title, rather than being a dot, is what makes the landscape navigable by
recognition. A field of anonymous marks is a texture: it conveys density and nothing else, which is exactly
the failure of the circle this family of changes deleted. Titles are also what let the map serve readers who
arrive knowing a name but not a location.

Requiring the landscape never to reduce silently is the same honesty rule the rest of the snapshot follows.
The reader may narrow it themselves by scope or filter and can see that they have; a map that quietly
dropped artifacts to stay tidy would misrepresent the model to precisely the reader least able to notice.
For the same reason the reader is not made to scope before entering: being asked which part of the product
to look at, before having seen the product, is the orientation problem restated rather than solved.

What "every artifact is a titled node" does and does not claim is worth being exact about, because the
sloppy reading makes the requirement unsatisfiable. It claims that every artifact exists as its own
reachable node holding a stable position, and that its title is how it identifies itself whenever it is
shown at readable detail. It does not claim that 730 titles are legible at once in a fitted viewport —
nothing legible could satisfy that, and a requirement no implementation can meet is worse than none. The
landscape earns its legibility through focus, pan, zoom, search and browsing, which is what a map is for;
a poster is a different artifact with a different job.

The band assignment stays fixed and product-owned so the map means the same thing everywhere: a reader who
has learned to read one product's landscape can read another's, and the arrangement cannot be re-tuned into
telling a flattering story about a particular model. Band order carries no meaning because the measured
relationships do not form a cascade — behaviour points at rules and at context, commitments point at
behaviour — and a layout that inferred direction from position would rewrite the model's semantics into
something tidier than the truth.

Typed counted groups remain the answer to a high-degree artifact for the reason they always were: the
busiest artifact in this model has 27 relationships in 5 groups and the largest measured one has 171 in a
similar handful, so grouping keeps the neighbourhood's size tracking relationship _types_ rather than
degree. Exact counts keep the collapsed state honest — the reader knows precisely what they are choosing
not to look at.

## Acceptance Scenarios

- The snapshot is inspected for its map surfaces. There is one, with a landscape state and a focused state,
  and no control anywhere switches between a whole-product view and a separate neighbourhood view.
- The map opens on the landscape. All four bands are visible and every artifact of the model is present as
  its own node — none aggregated away, none anonymous, and no scoping required to get there.
- At the largest reference model scale, every artifact still holds a stable position, can be reached, and
  can be selected and focused. Titles are legible when a node is focused, hovered or viewed at readable
  zoom; they are not required to be simultaneously legible across a whole-product fit.
- The same band assignment appears in a snapshot generated from an unrelated product model with different
  kind proportions, and nothing in either file or its configuration can change it.
- A model with no bounded contexts renders the bands it populates, with no empty band shown and none
  invented.
- Nothing in the map states or implies that one band precedes, causes, depends on or supersedes another. A
  relationship running from a functional requirement to a use case and one running from a use case to a
  domain term both display their authored direction, regardless of band order.
- Selecting an artifact promotes it and its neighbourhood; the rest of the product is still visible,
  subdued, behind it. Only that neighbourhood's relationships are drawn prominently, each naming its type,
  and direction stays determinable with colour removed.
- Selecting a second artifact promotes the second neighbourhood and returns the first to the background.
- Focusing the most connected artifact in the model yields counted groups rather than a spill of nodes.
  Expanding one reveals exactly the counted number, with no collision and nothing clipped, at each
  reference model scale on the named reference environment.
- The map is inspected against `prodshape graph` output: every node, relationship and direction it draws
  exists in the compiled graph, it draws nothing else, and it asserts no importance, health, ownership or
  ordering.
- Two snapshots generated from identical model content on different platforms produce an identical
  arrangement.
- Every relationship visible in a focused neighbourhood is also present as text on that artifact's own
  view.
