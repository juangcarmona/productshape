---
id: CHG-SNAPSHOT-002
type: product-change
title: Turn the Product Snapshot into a progressive-disclosure explorer
status: approved
base-revision: 'a17168724c5fe036d0ba357af490fdbd410a83d8'
operations:
  add:
    - TERM-GRAPH-PROJECTION
    - FR-SNAPSHOT-003
    - FR-SNAPSHOT-004
    - FR-SNAPSHOT-005
    - FR-SNAPSHOT-006
    - QR-ACCESSIBILITY-001
    - QR-PRESENTATION-001
    - QR-SCALABILITY-001
  modify:
    - JRN-SNAPSHOT-001
    - UC-SNAPSHOT-001
    - UC-SNAPSHOT-EXPLORE-001
    - FR-SNAPSHOT-002
    - TERM-PRODUCT-SNAPSHOT
    - CON-NO-WEB-UI
  remove: []
---

## Problem

The Product Snapshot delivers its packaging contract — one deterministic, self-contained,
offline, read-only HTML file — but presents the compiled model by rendering all of it at once.
Measured against the current baseline (73 artifacts, 196 relationships, 459,704 bytes):

- All 73 artifact bodies are markup in the active document. Roughly 299 KB of the file — about
  65% — is live DOM before the reader has chosen anything to read.
- The graph visualization renders all 73 nodes and all 196 edges immediately, on a single
  circular layout. Every node sits on one circle, so edge length carries no meaning and the
  drawing conveys density rather than topology.
- Reading, browsing, searching and graph inspection do not share a selected artifact. Selecting a
  graph node highlights its neighbourhood but does not open it; the reader must select the same
  node a second time to jump, and the sidebar and search results have no selected state at all.
- Search is unranked substring matching, capped at 20 hits taken in document order. Searching
  `product` matches 73 artifacts, shows 20, silently hides 53, and drops every one of the eight
  artifacts whose title begins with "Product" — including `TERM-PRODUCT-SNAPSHOT` — in favour of
  body-only matches on actors that happen to sort earlier.
- Three artifacts in the baseline have no relationships at all (`CON-BRAND-001`,
  `CON-NO-WEB-UI`, `CON-PUBLIC-GENERIC`) and one has 27 (`BC-PRODUCT-DEFINITION`). Neither the
  isolated nor the high-degree case is legible in an all-at-once drawing.

The failure is not single-file packaging; it is simultaneous presentation. The same measurements
on synthetic models confirm the shape of the problem rather than the size of the file:
365 artifacts produce 2.37 MB with 1.62 MB of live DOM and 1,645 rendered edges; 730 artifacts
produce 4.74 MB with 3.24 MB of live DOM, 3,290 rendered edges and a maximum node degree of 171.
Generation itself stays fast at every scale (0.34 s, 0.43 s, 0.60 s), so the cost falls entirely
on the reader's document.

Two canonical statements currently require this behaviour and must change for any other outcome
to be legitimate: `UC-SNAPSHOT-001` step 3 mandates that "every artifact is rendered — frontmatter
and body — into the page, organized by kind", and `FR-SNAPSHOT-002` requires the page to "browse
all product artifacts organized by kind, read each artifact's rendered content" alongside "a graph
visualization conveying the model's overall shape".

## Intended Product Outcome

After this change, the Product Snapshot is a Product Snapshot Explorer: still exactly one
deterministic, self-contained, offline, read-only HTML file, but one that discloses the model
progressively instead of all at once.

A Product Explorer who opens it lands on an orientation view that states the snapshot's identity
and revision, the total artifact and relationship counts, the counts by kind, entry points into
each kind, a plain explanation that the page is a generated read-only projection, a kind-level
aggregate of the relationships, and — neutrally, as derived topology — the artifacts that hold no
relationships, with their exact count and identities. It renders no artifact body and no
artifact-level graph. From there they find or browse an artifact, read exactly one artifact at a
time in a master–detail layout, see its declared references and its derived reverse references as
separate groups, understand its incoming and outgoing typed relationships through a focused
one-hop neighbourhood that groups and collapses high-degree sets with exact counts, and follow a
relationship to the next artifact.

Broader topology is served by exactly one further projection, opened only on request: a layered map
placing real artifacts in four fixed bands — product context, product behaviour, rules and language,
product commitments — which stays legible at scale by filtering, grouping and collapsing, and which
states the exact count of whatever it is holding back. There is no separate whole-graph drawing.

Browsing, search, relationship links and any graph projection all move the same single selected
artifact. That selection is addressable in the URL fragment, so a link to one artifact opens on
it, and browser Back and Forward retrace the exploration. Links produced by earlier snapshots keep
working permanently. Every artifact and every relationship in the compiled model remains embedded in
the file and reachable through navigation; none of it needs to be visible at the same time.

The page presents itself as a calm, compact, light, text-first engineering instrument, with system
sans-serif prose, monospaced identifiers, thin borders, restrained colour, and no meaning carried by
colour alone — a canonical property of the reading experience, verified against the rendered page.

## Rationale

The snapshot was built to prove that the whole model can travel in one file, and it does. The
projection then took "self-contained" to mean "simultaneously displayed", which is a different
claim and a worse one: a reader who wants to understand one use case gets the entire corpus in
their viewport, and a reader who wants to understand the product's shape gets 196 lines on a
circle. The methodology's own value — that the product is a graph, and that the derived reverse
relationships are the part nobody else can see — is exactly what an all-at-once rendering hides,
because relationships only become legible relative to something selected.

Separating packaging from presentation costs nothing the product has promised. Completeness,
determinism, offline operation, `file://` support, read-only behaviour and byte-identical
regeneration are properties of the file and its generation, and none of them require the
document to render everything at open time. The measurements show the two concerns are already
independent: the search index is 152 KB of inert data at the current scale and 1.44 MB at ten
times the scale, embedded in the same file without ever entering the DOM. Artifact bodies and
graph structure can live in the same inert region and be rendered on demand.

Doing this now, rather than later, matters because the snapshot's audience is the one audience
that cannot work around a bad projection. A Product Engineer who finds the page unhelpful reads
the Markdown instead; a Product Explorer has only the page. Every additional artifact the model
gains makes the all-at-once rendering worse, and the baseline has grown from the model the
snapshot was designed against.

The visual direction is canonical, in QR-PRESENTATION-001, because it is a durable property of the
reading experience rather than a passing styling preference. The snapshot is the product's only
human-facing rendered surface, and how it presents itself is a large part of whether a Product
Explorer trusts it: a calm, compact, light, text-first instrument reads as an honest projection of
engineering knowledge, and a gradient-and-card dashboard reads as a sales page about a product
definition. That difference is not decoration, and leaving it to whoever implements the page would
mean the product had no position on it.

Stating it canonically does not mean encoding a stylesheet. QR-PRESENTATION-001 fixes the properties
— light-only, system sans-serif prose with monospaced identifiers and revisions, strong contrast,
thin borders and deliberate alignment, square or low-radius controls, one restrained accent with
stable per-kind colours, no gradients or glass or decorative illustration or hero typography or
rounded-card treatment, and never meaning carried by colour alone — and leaves the values, spacing
scale and layout technique to technical design. Every property is verified by inspecting the
rendered page in a browser and recording screenshots, which is what makes it a requirement rather
than an aesthetic preference: it can fail, and the failure is visible.

"Modern" earns its place in this change through interaction and information design first —
progressive disclosure, one selection, ranked search, purpose-built projections, addressable state —
all of which the requirements state and all of which are testable. The presentation requirement
exists so that a page satisfying all of those cannot arrive dressed as something the product is not.

## Affected Product Areas

Discovered by inspecting the baseline and running `prodshape impact` on each candidate at
depth 2 in both directions; the snapshot subgraph is small and tightly connected, which is why
the modify set is short and complete.

**Modified:**

- **JRN-SNAPSHOT-001** — the journey narrative currently describes exploration as "starting from
  the artifact kinds, opening an actor or a journey … glancing at the graph". It is rewritten to
  the orientation → find → read → understand relationships → follow progression, and its
  completion conditions gain the requirement that understanding was reached without the reader
  ever facing the whole corpus at once.
- **UC-SNAPSHOT-001** — step 3 ("every artifact is rendered … into the page, organized by kind")
  and step 4 are the canonical mandate for all-at-once rendering. They become an embedding
  contract: every artifact's content and every relationship is embedded completely, and the
  page's initial state renders orientation only. Postconditions gain completeness-without-
  simultaneity explicitly. Nothing about determinism, self-containment, revision stamping or
  diagnostics changes.
- **UC-SNAPSHOT-EXPLORE-001** — the exploration use case is rewritten around the progression and
  the single selected artifact, and gains alternative flows for deep links, unknown artifact IDs,
  high-degree neighbourhoods, isolated artifacts and narrow viewports. It gains
  `TERM-GRAPH-PROJECTION` in `uses-terms`.
- **FR-SNAPSHOT-002** — currently bundles browsing, reading, relationships, graph visualization,
  search, status display and read-only behaviour into one requirement. It is narrowed to the
  master–detail artifact reading requirement: exactly one active artifact detail, progressive
  disclosure, declared versus derived references as separate groups, reachability of every
  artifact and relationship, responsive behaviour, status display, read-only behaviour, and the
  guarantee that hostile authored content can never become executable HTML or JavaScript. The
  capabilities removed from it are not dropped — they become FR-SNAPSHOT-003 through -006, each
  independently verifiable.
- **TERM-PRODUCT-SNAPSHOT** — the definition currently says "one HTML file rendering every
  artifact, its relationships in both directions, a graph visualization and a search index". It
  is restated so that completeness is a property of what the file contains, not of what the
  document displays, and so the term names the projections rather than a single visualization.
- **CON-NO-WEB-UI** — the constraint permits "a generated, static, self-contained, read-only
  projection" and forbids a snapshot that "accepts input". A progressively disclosing explorer
  with fragment-owned selection state constructs DOM at runtime and accepts keystrokes into a
  search field, so the constraint must state its own boundary precisely instead of leaving
  implementers to interpret "static". The prohibition it exists to enforce is preserved and
  sharpened: no server, no runtime fetching, no persistence the snapshot owns, and no capability
  to create, modify, annotate or approve product knowledge. Client-side behaviour that only
  changes which of the file's already-embedded content is displayed is explicitly permitted.

**Added:**

- **TERM-GRAPH-PROJECTION** (Graph Projection) — names the concept the change turns on: a
  purpose-specific rendering of a subset or aggregation of the product graph, chosen for one
  reading task, as opposed to one universal visualization. Used by UC-SNAPSHOT-EXPLORE-001,
  FR-SNAPSHOT-003 and FR-SNAPSHOT-005.
- **FR-SNAPSHOT-003** — the orientation view: what the default state must expose, and the
  explicit prohibition on rendering artifact bodies or any artifact-level graph in it. Includes the
  kind-level relationship aggregate, which the baseline supports concretely — the 196 relationships
  collapse into 16 distinct kind-pair-and-type combinations — and permits a neutral report of the
  artifacts holding no relationships, with strict rules against warning language, severity, scoring
  and vocabulary such as "orphaned".
- **FR-SNAPSHOT-004** — offline ranked search over IDs, titles, kinds and body content, with the
  required ranking order, keyboard operation, clearing, no-results behaviour, and honest
  reporting when results are limited.
- **FR-SNAPSHOT-005** — exactly three graph projections and no fourth: kind-level aggregate,
  layered model map as the broad-topology expert view, and focused one-hop neighbourhood with
  grouping and controlled expansion. The band assignment is fixed and product-owned — Product
  context (Actors, Bounded Contexts), Product behaviour (Journeys, Use Cases), Rules and language
  (Business Rules, Domain Terms), Product commitments (Functional Requirements, Quality
  Requirements, Constraints) — not adopter-configurable and not derived per model, with a new kind
  requiring an explicit band through a Product Change. Bands carry no lifecycle, causality,
  sequence or direction. The layered map must filter, group, collapse and state exact hidden counts
  rather than draw everything. Also covers deterministic projection layout and the always-present
  non-visual relationship list. The bands were validated against the baseline: they cover all nine
  artifact kinds with none left over (6 context, 20 behaviour, 16 rules and language, 31
  commitments) and 180 of 196 relationships cross bands in only six distinct band-pair directions.
- **FR-SNAPSHOT-006** — one selected artifact, one navigation mechanism, fragment addressing,
  Back and Forward, unknown-ID behaviour, and permanent inbound compatibility for the existing
  `#<ARTIFACT-ID>` fragments the current snapshot already produces, normalized in place through a
  history replacement so no redundant entry appears.
- **QR-ACCESSIBILITY-001** — landmarks and heading hierarchy, complete keyboard operation,
  visible focus, accessible selected and expanded state, accessible names for icon-only controls,
  `aria-current`, WCAG AA text contrast, no colour-only meaning, no essential hover-only
  information, and respect for reduced-motion preferences. Scoped to the snapshot use cases,
  which are the product's only human-facing rendered surface.
- **QR-PRESENTATION-001** — the durable visual and information-design experience as a canonical
  product property: light-only, calm and compact, system sans-serif prose with monospaced
  identifiers and revisions, strong contrast, thin borders, deliberate alignment, square or
  low-radius controls, one restrained accent plus stable per-kind colours, no gradients, glass
  effects, decorative illustration, hero typography or rounded-card dashboard treatment, and no
  meaning carried by colour alone. Verified by inspecting the rendered page in a browser and
  recording screenshots, not by prescribing a stylesheet.
- **QR-SCALABILITY-001** — generated file size, opening-document size and generation time carry
  numeric targets, because measurements against the pre-change snapshot exist to support them.
  Interaction latency is required to be responsive and to be measured on an identified environment;
  it deliberately carries no numeric budget, because none has been measured yet. Budgets are set
  from those measurements during technical design, before implementation approval.

**Deliberately not modified:**

- **ACT-PRODUCT-EXPLORER** — already expresses exactly the intended audience ("a stakeholder, a
  product owner, a developer from another team, or anyone else … what defines them is not their
  role but their relationship to the repository") and already lists following the product's
  internal connections among its goals. No new actor or persona is warranted; enumerating job
  titles would add nothing the actor does not already cover.
- **FR-SNAPSHOT-001** — the generation contract. Exactly one self-contained file, no external
  resources, visible revision, byte-identical regeneration and parse diagnostics all survive
  unchanged, and nothing in its text mandates simultaneous rendering. Its "never emits a page
  that silently omits part of the model" clause becomes more load-bearing, not less.
- **QR-DETERMINISM-001** — already covers UC-SNAPSHOT-001, so the file remains byte-identical
  for identical content. Determinism of projection _layout_ is a property of the projections and
  is stated in FR-SNAPSHOT-005 rather than by widening this requirement's `applies-to`.
- **BR-CANONICAL-001**, **BR-RELATIONSHIPS-001**, **CON-NO-GRAPH-DATABASE**,
  **CON-MARKDOWN-001** — reached by the impact analysis, but the change strengthens rather than
  touches them: Markdown stays canonical, reverse relationships stay derived, and no graph
  database or runtime store is introduced.

## Open Questions

None outstanding. Four questions were raised when this change was drafted; the product owner has
resolved all four, and the resolutions are recorded here and realized in the proposed artifacts.

1. **Are the semantic bands fixed or adopter-visible? — Resolved: fixed and product-owned.** The
   validated mapping is canonical for every product model the snapshot projects: Product context
   (Actors, Bounded Contexts), Product behaviour (Journeys, Use Cases), Rules and language (Business
   Rules, Domain Terms), Product commitments (Functional Requirements, Quality Requirements,
   Constraints). It is not adopter configuration and is not derived per model. Bands organize the
   view only and imply no lifecycle order, causality or relationship direction. Any future canonical
   artifact kind must receive an explicit band through a ProductShape Product Change.
   Realized in FR-SNAPSHOT-005 and TERM-GRAPH-PROJECTION.

2. **Is the full-model graph worth retaining? — Resolved: no; removed.** The snapshot provides three
   projections only. The layered model map becomes the broad-topology expert view and earns that
   role through filtering, grouping, collapsing and exact hidden counts rather than by drawing every
   node and edge. A fourth unstructured whole-graph view adds no distinct user outcome and would
   recreate the problem this change exists to fix.
   Realized in FR-SNAPSHOT-005, TERM-GRAPH-PROJECTION, TERM-PRODUCT-SNAPSHOT,
   UC-SNAPSHOT-EXPLORE-001 and JRN-SNAPSHOT-001.

3. **Is legacy fragment compatibility permanent or transitional? — Resolved: permanent.** Legacy
   `#<ARTIFACT-ID>` fragments are permanent inbound compatibility. Newly generated navigation may use
   the current fragment route. Opening a legacy fragment resolves the artifact and normalizes the
   address in place through a history replacement, adding no redundant entry, so Back behaves exactly
   as it would after a current-route arrival.
   Realized in FR-SNAPSHOT-006.

4. **May the snapshot surface isolated artifacts? — Resolved: yes, neutrally.** The overview may
   include a group reporting the artifacts that hold no relationships, with its exact count and the
   affected artifact identities as entry points. It is derived topology, not a health judgement: no
   warning presentation, no severity, no scoring, and no vocabulary such as "orphaned".
   Realized in FR-SNAPSHOT-003.

## Product Acceptance

The product owner recognizes this change as correctly realized when, using a snapshot generated
from any product model:

1. The state the file opens in explains the product's shape — identity, revision, totals, counts
   by kind, entry points, a kind-level relationship aggregate and a statement that the page is a
   generated read-only projection — and contains no artifact body and no artifact-level graph.
   Where it reports the artifacts holding no relationships, it does so as a neutral count and list,
   with no warning presentation, severity, score or word suggesting a defect.
2. One artifact can be read on its own, with no other artifact's content competing for the
   viewport, and its declared references and derived reverse references appear as separate,
   labelled groups.
3. Selecting an artifact from the list, from a search result, from a relationship link or from
   any graph projection produces the same single selection, and the selected state is visible
   wherever the artifact appears.
4. An artifact's incoming and outgoing typed relationships can be understood, with direction and
   relationship type explicit, without opening any whole-model visualization.
5. The most connected artifact in the model (27 relationships in the current baseline) is
   readable: neighbours are grouped by relationship type and artifact kind, large groups start
   collapsed showing exact counts, and expansion happens only when the reader asks.
6. No artifact-level graph is rendered until the reader explicitly opens one, the snapshot offers
   exactly three projections, and none of them is an unstructured drawing of the whole graph.
7. The layered model map places every artifact kind in its fixed band, states nothing about
   lifecycle, causality or precedence between bands, preserves every relationship's authored
   direction across bands, and at scale filters, groups and collapses while reporting the exact
   count of what it is holding back.
8. Following a relationship to another artifact and pressing Back returns to the previous
   artifact and view. A link produced by an earlier snapshot still resolves, normalizes in place,
   and leaves no extra history entry to press Back through.
9. Every artifact and every relationship in the compiled model can be reached through the page,
   including artifacts with no relationships.
10. The page is fully operable from the keyboard, exposes visible focus and accessible selected
    and expanded state, and remains usable on a narrow viewport.
11. The rendered page reads as a calm, compact, light, text-first instrument: system sans-serif
    prose, monospaced identifiers and revisions, strong contrast, thin borders, square or
    low-radius controls, one restrained accent with stable per-kind colours, no gradients, glass
    effects, decorative illustration, hero typography or rounded-card dashboard treatment, and no
    meaning carried by colour alone — confirmed by browser inspection and recorded screenshots.
12. Everything above works from a single file opened over `file://` with networking disabled, and
    identically when served from ordinary static hosting.
13. Regenerating from identical model content still produces a byte-identical file, the revision
    is still visible, and nothing on the page creates, edits, annotates or approves anything.
14. Authored content containing HTML tags, script tags or quote-and-bracket sequences is
    displayed as text and never executes, whether it reaches the reader through rendered markup
    or through data the page renders at open time.
15. The size and generation-time measurements in QR-SCALABILITY-001 hold for the current model and
    for a materially larger model, and are recorded rather than asserted. Interaction latency is
    measured on an identified environment and its figures recorded; concrete interaction budgets
    are set from those measurements during technical design, before implementation is approved.
16. Accessibility, keyboard operation, responsive behaviour, escaping, presentation and scale hold
    in every delivered increment, for every surface that increment introduces — not in a later
    hardening phase. Consolidated verification across increments happens at change level, and is not
    itself a delivery increment.

## Out of Scope

- Choosing the implementation technology. Whether the viewer is a precompiled component-model
  bundle maintained once inside ProductShape with deterministic data injected at generation time,
  or a smaller bespoke implementation; whether a graph renderer or layout engine is adopted;
  whether layout runs at generation time or in the browser — all of it is a technical-design
  decision for handoff, constrained only by the product requirements this change states.
- Dark mode, theme switching and any appearance preference. The interface is light-only, which
  QR-PRESENTATION-001 states positively rather than leaving as an omission.
- Specific stylesheet values. QR-PRESENTATION-001 makes the visual direction canonical as
  properties of the rendered experience — verified by browser inspection and screenshots — but the
  particular colours, spacing scale, border widths, radii and layout technique that realize it are
  technical-design decisions.
- An unstructured whole-model graph view. Removed by product decision; the layered model map is the
  broad-topology view.
- Numeric interaction budgets. QR-SCALABILITY-001 requires responsive interaction and recorded
  measurement on an identified environment, and deliberately sets no millisecond figure. Each budget
  is established from measurement during the technical design of the increment that first introduces
  the corresponding interaction, and agreed before that increment's implementation is approved — not
  invented before the capability exists, and not deferred to a later consolidation. Any figure
  circulating before its measurement — including the 100 ms and 200 ms values considered while
  drafting this change — is a provisional technical hypothesis and carries no canonical authority.
  The measurement harness and its named reference environment are verification infrastructure
  established once and extended by each increment, not a deliverable of their own.
- A consolidation, hardening or verification phase as a delivery increment. Every increment carries
  its own accessibility, presentation, escaping and scale obligations for the surfaces it introduces,
  and the checks that only become possible once the final surface exists belong to the increment that
  completes it. Evidence is consolidated at change level, which is a verification activity rather
  than an increment.
- Any editing, commenting, approval, backlog or roadmap capability; any hosted service, runtime
  API, graph database or persistence the snapshot owns; any AI chat or semantic inference over
  the model; any repository browsing.
- Rendering Product Changes, Delivery Slices or Product Handoffs in the snapshot. The compiled
  graph the snapshot projects contains baseline artifacts only, and this change does not widen
  it.
- Multi-file output, incremental loading from separate assets, or any packaging change. The file
  contract is unchanged.
- Changing which relationships exist or how they are derived. The projections render the compiled
  graph as it is.
- A product-specific implementation. The explorer must work for any product model, including one
  whose kinds, sizes and connection patterns differ from ProductShape's own.
