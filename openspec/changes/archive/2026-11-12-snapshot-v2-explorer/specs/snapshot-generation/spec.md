<!-- pdac-scope: cited -->

## ADDED Requirements

### Requirement: Three map views over the whole model

The page SHALL provide the kind-level aggregate and exactly three map views — the Overview map, the Focus view and the Columns view — and no other graph projection. Use cases and domain terms SHALL be grouped, in the Overview map and the Columns view, by the one bounded context the model records for each (`bounded-context` and `defined-in` respectively); an artifact recording none or more than one SHALL be drawn in a group labelled as having no single context, sorted after the others. Within a kind or group, artifacts SHALL be ordered by a fixed number of neighbour-position sweeps over the compiled graph, ties broken by identifier, so the layout uses no clock and no randomness.

Every map SHALL be pannable by dragging and zoomable by wheel and pinch, and SHALL also offer zoom-in, zoom-out and fit controls and the `+`, `-` and `0` keys; arrow keys SHALL move between drawn artifacts, or pan when the map itself has focus. Each map SHALL expose one tab stop: the selected artifact when drawn, otherwise the first one drawn. Hovering or keyboard-focusing an artifact SHALL light it, its direct neighbours and their lines with a neon glow tuned per appearance, dim everything else, and show a summary card, without changing the address or the selection. Clicking or pressing Enter on an artifact SHALL open the Focus view on it in the Overview map and the Focus view; in the Columns view click and Enter SHALL select it and double-click or `f` SHALL focus it. The camera SHALL NOT be part of the address.

<!-- pdac:cite id="FR-SNAPSHOT-PROJECTIONS" digest="sha256:7ab7050a644bbe3f1fd7dc38bda0c2037d5ae01348dad95fcf67bea914bfe137" -->
<!-- pdac:cite id="TERM-PRODUCT-EXPLORER" digest="sha256:c1d1e70f923702a1863ad63d70127ea844a531aa6d153e5750989d4a9b02b60f" -->
<!-- pdac:cite id="QR-ACCESSIBILITY" digest="sha256:5aaf32bd1141581f505558a4379ff7d6498a2cc3e959512523333767716ae8a6" -->

#### Scenario: Exactly the aggregate and three maps

- **WHEN** the generated page is inspected and every control exercised
- **THEN** the kind-level aggregate, the Overview map, the Focus view and the Columns view exist, and no other projection

#### Scenario: Context grouping degrades rather than drops

- **WHEN** a use case records no bounded context
- **THEN** it is drawn in a group labelled as having no single context, after the grouped ones

#### Scenario: Attention lights a neighbourhood without navigating

- **WHEN** the reader hovers or tabs onto an artifact on any map
- **THEN** that artifact and exactly its direct neighbours are lit, the rest dimmed, and the address and selection are unchanged

#### Scenario: Layout is deterministic

- **WHEN** a map is drawn twice from the same file, once with the clock and `Math.random` made unavailable
- **THEN** both drawings are identical

#### Scenario: Pan and zoom by every means

- **WHEN** the reader drags, wheels, uses the zoom controls and the `+`, `-`, `0` and arrow keys
- **THEN** the map pans and zooms accordingly and the address never changes

### Requirement: The Overview map shows every artifact by kind

The orientation view SHALL draw the Overview map from the embedded data at open: one tile per artifact kind present, in the Columns order, headed by the kind's token, name and exact count, holding every artifact of that kind as a chip carrying its identifier, with use cases and domain terms grouped under their bounded context's title. Tiles SHALL flow into rows of a width derived from their total area alone. The map SHALL draw no relationship line until the reader attends to an artifact, and then only that artifact's lines.

<!-- pdac:cite id="FR-SNAPSHOT-ORIENTATION" digest="sha256:dce92611dfcfcd595f7d67297eb2e74903165595d9f72b309f5560fb04219479" -->
<!-- pdac:cite id="FR-SNAPSHOT-PROJECTIONS" digest="sha256:7ab7050a644bbe3f1fd7dc38bda0c2037d5ae01348dad95fcf67bea914bfe137" -->

#### Scenario: Every artifact is a chip

- **WHEN** the snapshot opens
- **THEN** the Overview map holds one chip per artifact in the model, in its kind's tile, and no relationship line

#### Scenario: Choosing a chip focuses it

- **WHEN** the reader clicks a chip or presses Enter on it
- **THEN** the Focus view opens on that artifact

### Requirement: The Focus view centres the selection among its neighbours

The Focus view SHALL draw the selected artifact at the centre and each direct neighbour as a box naming its kind, identifier, title, the relationship types joining it to the focus with their direction as text (`governed-by →`, `← derived-from`), and the count of its other neighbours. Neighbours SHALL be grouped by kind under a collapsible heading stating the exact count; kinds before the focus's kind in the Columns order SHALL sit on the left and the focus's kind and later kinds on the right. A group of more than twelve SHALL start collapsed; the kinds whose disclosure the reader flipped SHALL be carried in the address (`x`), replacing the history entry. Every other artifact SHALL be drawn as a faded, selectable background mark placed by a seeded shuffle of a ring of slots. Choosing a neighbour or mark SHALL refocus; the focus SHALL take keyboard focus; a breadcrumb SHALL list the artifacts focused in this visit. Enter on the centre SHALL open it in the Reader, and the Reader SHALL offer a Focus action. Routes earlier snapshots produced for a focused projection (`#/graph/focus/ID`) SHALL resolve to the Focus view in place.

<!-- pdac:cite id="FR-SNAPSHOT-TOPOLOGY" digest="sha256:9680d19b034f9502cac05ca24f027c8d31bb4bd0ee7a91ab773915e89becd574" -->
<!-- pdac:cite id="TERM-FOCUSED-TOPOLOGY" digest="sha256:d897b290de2106f0d388c73aec2f12155e9e126dd53198f835eab6f155d69d1f" -->

#### Scenario: Neighbours grouped by kind on fixed sides

- **WHEN** the reader focuses a use case
- **THEN** its actors and journeys sit left of it and its context, rules, terms, requirements and constraints right of it, each group headed by its exact count

#### Scenario: Dense groups collapse, disclosure is addressed in place

- **WHEN** an artifact with thirteen neighbours of one kind is focused and the reader expands that group
- **THEN** the group starts collapsed with its count, expanding it adds `x=<kind>` to the address without a new history entry, and the address reopens it expanded

#### Scenario: Refocus and retrace

- **WHEN** the reader chooses a neighbour, then a background mark
- **THEN** each becomes the single centre in turn and the breadcrumb lists them

#### Scenario: Reader and Focus view are one step apart

- **WHEN** the reader chooses Focus in the Reader, and Enter on the Focus view's centre
- **THEN** each opens the other on the same artifact

### Requirement: The Columns view lays out every artifact by kind

The Columns view SHALL draw one column per kind present, in the order actors, journeys, use cases, bounded contexts, business rules, domain terms, functional requirements, quality requirements, constraints, structured behaviours, followed by any other kind; every artifact as a box and every relationship of the compiled graph as one line. Selecting an artifact SHALL keep it and its neighbourhood lit and show an interactive summary card; selecting it again, clicking empty space or pressing Escape SHALL clear the selection.

<!-- pdac:cite id="FR-SNAPSHOT-PROJECTIONS" digest="sha256:7ab7050a644bbe3f1fd7dc38bda0c2037d5ae01348dad95fcf67bea914bfe137" -->

#### Scenario: Columns and lines are complete

- **WHEN** the Columns view is opened
- **THEN** its columns follow the stated order for the kinds present, and it draws exactly one line per relationship

#### Scenario: Select, clear, focus

- **WHEN** the reader clicks an artifact, clicks it again, presses Escape after selecting another, and double-clicks a third
- **THEN** the first is selected and then cleared, the second cleared by Escape, and the third opens in the Focus view

### Requirement: The business lens presents a use case in business language

One header control and the `l` key SHALL toggle the business lens, carried in the address as `l=b` and changed in place. With the lens on, the summary card — docked beside wide maps, and in the Reader above the body — SHALL present a use case as: its Goal and Trigger sections quoted; its primary and supporting actors; the journeys it is a step of; each governing business rule with its Rule statement quoted; each structured behaviour illustrating one of those rules, illustrating the use case or verified by one of its requirements, with given, when and then; its functional requirements, quality requirements and constraints one line each; and the artifacts a change to it puts in question, from the same one-hop rule `prodshape impact` applies, grouped by kind. It SHALL name artifacts by title, show no identifier and no relationship type name, say so when a section has nothing, and link each named artifact to the Focus view. Other kinds SHALL show title, plain kind and first statement. With the lens on, the Focus view SHALL label relationships with plain verbs and name neighbours by title. The snapshot embeds no Product Changes and no citation status, so the lens shows neither.

<!-- pdac:cite id="FR-SNAPSHOT-BUSINESS-LENS" digest="sha256:17d95ec61b7315ddcaa84ff9bffb1c1fccc7d360501ab2d8d49f7cbd83b29fd3" -->

#### Scenario: A use case reads in business language

- **WHEN** the lens is on and a use case with goal, trigger, actors, journey, rule, behaviour, requirement, quality requirement and constraint is focused
- **THEN** the card quotes the goal, trigger and rule statement, lists the others by title with given, when and then for the behaviour, states what a change puts in question, and shows no identifier or relationship type name

#### Scenario: Off restores the engineering presentation

- **WHEN** the lens is turned off
- **THEN** the Focus view shows identifiers and relationship types again and the address changed in place

## MODIFIED Requirements

### Requirement: The snapshot opens in an orientation view

The page SHALL open in an orientation view whose purpose is to convey the shape of the product, and which SHALL render no artifact's authored content. It SHALL expose the product's identity and the source revision, the total number of artifacts and of relationships, the number of artifacts of each kind present with an entry point into each kind, a plain-language statement that the page is a generated read-only projection that is never authoritative, the Overview map, and a kind-level aggregate of the relationships by relationship type.

The orientation view SHALL additionally present the kind-level aggregate as a grid of source kind against target kind, each cell stating the number of relationships in that combination and each non-empty cell an entry point into the catalog narrowed to the source kind. It SHALL offer derived entry points, each labelled by the fact it reports: each journey with the use cases its steps reference, in the recorded step order; each bounded context with the number of artifacts that reference it; and the artifacts holding the most relationships, ordered by that count with the count shown beside each, under a label that states the criterion.

The orientation view MAY report the artifacts that hold no relationships, stating the exact count and their identities as entry points. Where it does, it SHALL present this as derived topology only: no warning or error presentation, no severity, no scoring, no health or completeness indication, and no vocabulary such as "orphaned", "dangling", "unused" or "missing".

Everything displayed SHALL be derived from the compiled model. A derived ordering SHALL state its criterion where it is shown and SHALL NOT be worded as importance, priority or a recommended reading order. The orientation view SHALL NOT assert importance, centrality, health, completeness, quality, ownership, ranking, ordering or lifecycle progression that the model does not record. It SHALL describe only the artifact kinds the model actually contains.

<!-- pdac:cite id="FR-SNAPSHOT-ORIENTATION" digest="sha256:dce92611dfcfcd595f7d67297eb2e74903165595d9f72b309f5560fb04219479" -->

#### Scenario: Oriented before reading anything

- **WHEN** a reader opens the snapshot for the first time
- **THEN** the product identity, source revision, artifact and relationship totals, the generated read-only statement and the Overview map are present, and no artifact body is rendered

#### Scenario: Counts match the compiled graph

- **WHEN** the orientation view's totals, per-kind counts and grid cells are compared with `prodshape graph` output for the same model
- **THEN** they match exactly, and each grid cell equals the sum of the aggregate rows for its two kinds

#### Scenario: Derived entry points state what they count

- **WHEN** the derived entry points are inspected
- **THEN** each journey lists its use cases in the recorded step order, each bounded context shows the exact number of artifacts referencing it, and the most-relationships entries each show their count under a label naming the criterion, with no word implying importance

#### Scenario: Unconnected artifacts reported neutrally

- **WHEN** the model contains artifacts with no relationships and the orientation view reports them
- **THEN** the exact count and their identities are shown as entry points, with no warning styling, no severity, no score and no vocabulary suggesting a defect

#### Scenario: No fabricated conclusions

- **WHEN** the orientation view is inspected for claims beyond identity, revision, counts, entry points, the projection statement, the map and the kind-level aggregate
- **THEN** no artifact is described as important, central, healthy, complete, owned, ranked or ordered by anything the model does not record

#### Scenario: Only the kinds present are described

- **WHEN** a snapshot is generated from a model containing only some artifact kinds
- **THEN** the orientation view describes those kinds and does not mention or zero-fill the others

### Requirement: Kind-level relationship aggregate

The page SHALL provide a kind-level aggregate projection: the model's artifacts and relationships grouped by artifact kind and relationship type, with exact counts, communicating composition and traceability without rendering individual artifacts. It SHALL display nothing absent from the compiled graph, SHALL imply no importance, health, ownership or ordering, and SHALL be arranged identically for identical model content.

{pdac:cite id="FR-SNAPSHOT-PROJECTIONS" digest="sha256:7ab7050a644bbe3f1fd7dc38bda0c2037d5ae01348dad95fcf67bea914bfe137"}

#### Scenario: Composition and traceability without artifacts

- **WHEN** a reader opens the kind-level aggregate
- **THEN** which kinds relate to which, by relationship type, and how many relationships each combination holds are readable, with no individual artifact rendered

#### Scenario: Aggregate counts are faithful

- **WHEN** the aggregate is compared with the compiled graph
- **THEN** every combination and count corresponds to relationships the graph records, and none is invented

#### Scenario: Deterministic aggregate

- **WHEN** two snapshots are generated from identical model content on different platforms
- **THEN** the aggregate's arrangement is identical

### Requirement: One selected artifact addressed by the URL fragment

The page SHALL hold exactly one selected artifact at a time, shared by every part of the page, and exactly one navigation mechanism SHALL own state transitions. No part of the page may change the selected artifact or the active view without that mechanism, and the address SHALL always reflect the state the page is in. The addressable state SHALL represent at least the active view — Overview, Focus, Columns or Artifacts — the selected artifact's identifier, the Focus view's flipped disclosure, and the presentation choices the reader made — the chosen appearance, whether the master area is collapsed, and whether the business lens is on — using the URL fragment so it behaves identically from `file://` and from ordinary static hosting, with no server-side routing and no request at navigation time.

Changing a presentation choice SHALL update the address in place, replacing the current history entry, and SHALL NOT change the selected artifact or the active view. An address carrying no presentation choice SHALL open with the environment's preferred appearance, the master area open and the lens off. Presentation choices SHALL survive navigation between artifacts and views. Every view tab SHALL carry the selection. The pan and zoom of a map SHALL NOT be addressed.

Opening the page at an address naming an artifact SHALL open on that artifact. Browser Back and Forward SHALL restore previously visited views and selections. An address naming an artifact the snapshot does not contain SHALL produce an explicit state naming the identifier it could not resolve and offering a way to continue exploring.

<!-- pdac:cite id="FR-SNAPSHOT-ADDRESSING" digest="sha256:1ae12988f863368b278b6a9d2f0413389a092f7f2d043ae6f1fad7d4da3b52e7" -->

#### Scenario: Selection is shared and addressable

- **WHEN** a reader selects an artifact from the list
- **THEN** it becomes the page's single selected artifact, every surface showing it reflects that, and the address changes to match

#### Scenario: Direct artifact link from local disk and from hosting

- **WHEN** the address of a selected artifact is opened in a new window from local disk with networking disabled, and again from a static web server
- **THEN** both resolve to the same artifact in the same view, with no server configuration and no request beyond the file itself

#### Scenario: Back and Forward restore exploration

- **WHEN** a reader visits several artifacts and views and then presses Back repeatedly
- **THEN** the previous selections and views are restored in reverse order, and Forward retraces them

#### Scenario: Presentation choices are addressed in place

- **WHEN** a reader chooses the dark appearance and collapses the master area, then follows a relationship and copies the address
- **THEN** the history grew only by the navigation, the new address still carries both choices, and opening it in a fresh window renders dark with the master area collapsed

#### Scenario: Defaults without a choice

- **WHEN** an address with no presentation choice is opened with a dark environment preference
- **THEN** the page renders in the dark appearance with the master area open, and nothing is written to browser storage or cookies

#### Scenario: Unknown identifier is explicit

- **WHEN** the page is opened at an address naming an identifier the snapshot does not contain
- **THEN** the page names that identifier, states that this snapshot does not contain it, and offers orientation or the artifact list as a way on

### Requirement: The delivered surfaces are keyboard-operable and accessible

Every capability of the delivered surfaces SHALL be reachable and operable by keyboard alone — the orientation view, the search dialog, the artifact list and its groups, the collapsible master area, the artifact detail, the three map views and the view navigation — with no trapped focus and no pointer-only control. The focused element SHALL always be visibly identifiable, including the artifacts and group headings drawn on the maps, and focus SHALL land on a meaningful element after every view and selection change. Every keyboard shortcut SHALL be stated on the page, and every action a shortcut performs SHALL also be reachable through a visible, focusable control. The search dialog SHALL take focus when it opens, SHALL be dismissible from the keyboard, and SHALL return focus when it closes.

The page SHALL expose semantic landmarks for its regions and a heading hierarchy without skipped levels. The selected artifact SHALL be reported as current with `aria-current` in the list, the active view SHALL be reported as current in the page navigation, and expanded state — of kind groups, relationship groups, projection groups and the master area — SHALL be exposed as state. Every icon-only control SHALL carry an accessible name stating what it does. All text SHALL meet WCAG 2.1 AA contrast in every appearance. No information a reader needs SHALL require hover or pointer proximity to reveal. Where the reader's environment expresses a reduced-motion preference, no non-essential animation or transition SHALL run.

<!-- pdac:cite id="QR-ACCESSIBILITY" digest="sha256:5aaf32bd1141581f505558a4379ff7d6498a2cc3e959512523333767716ae8a6" -->

#### Scenario: Whole increment operable by keyboard

- **WHEN** a reader orients, searches, narrows the list, collapses and restores the master area, selects an artifact, reads it and opens a projection group using only the keyboard
- **THEN** every capability is reachable and activatable, with a visible focus indicator at every stop and deliberate focus placement after each view and selection change

#### Scenario: Shortcuts are never the only route

- **WHEN** every keyboard shortcut the page offers is enumerated
- **THEN** each is stated on the page and each one's action is also available through a visible, focusable control

#### Scenario: Structure and current state exposed

- **WHEN** the generated document's landmarks, heading outline and accessible state are inspected
- **THEN** every region has a landmark, no heading level is skipped, the selected artifact reports `aria-current` in the list, the active view reports as current in the navigation, and every collapsible reports its expanded state

#### Scenario: Contrast, colour and motion

- **WHEN** every text-and-background pair the delivered stylesheet can produce is measured in each appearance, the page is rendered with colour removed, and it is opened with a reduced-motion preference set
- **THEN** all text meets WCAG 2.1 AA, no meaning depends on colour alone, no needed information is hover-only, and no non-essential animation runs

### Requirement: The opening document is bounded and interaction is measured

The markup the file carries outside its embedded data SHALL NOT grow in proportion to the number of artifacts in the model: its size SHALL be bounded by the artifact kinds present and the kind-level aggregate over them. Artifact content and relationship structure SHALL be carried in the file as data, and every map SHALL be drawn from that data; the Overview map SHALL draw one chip per artifact and no relationship line at open. Generated file size SHALL grow no worse than linearly with authored content, and generation time no worse than linearly with artifact count.

Artifact-selection latency, Overview map drawing, neighbourhood lighting and opening the Focus and Columns views SHALL be measured on an identified reference environment — named hardware, operating system and browser version — across representative models, and the figures SHALL be recorded. A concrete artifact-selection budget SHALL be established from those recorded figures. No numeric interaction budget SHALL be asserted without a measurement supporting it. Artifacts that are hardest at scale — the longest-titled and longest-bodied — SHALL remain readable at every measured scale.

{pdac:cite id="QR-SCALABILITY" digest="sha256:9da28eea667bea855b3fc7726c0b9d67ec338041332cf3f23a6059b4591a1050"}

#### Scenario: Opening document does not scale with the model

- **WHEN** the opening document is measured for a small and a materially larger model
- **THEN** its static markup contains no artifact body and does not grow in proportion to artifact count, and the Overview map draws exactly one chip per artifact and no line

#### Scenario: Size and generation time stay linear

- **WHEN** generated size per authored byte and generation time per artifact are recorded across representative models
- **THEN** neither ratio increases with model size

#### Scenario: Selection latency is measured, not asserted

- **WHEN** artifact-selection latency is recorded across representative models on the identified reference environment
- **THEN** the figures are reported in full including the slowest cases, and the selection budget is derived from them rather than assumed in advance

#### Scenario: Long content stays readable

- **WHEN** the longest-titled and longest-bodied artifacts are selected at every measured scale
- **THEN** text wraps within its container and the page does not scroll horizontally

### Requirement: The orientation view offers family entry points and global search

Each artifact kind on the orientation view SHALL be an entry point into the catalog narrowed to that family, and the orientation view SHALL present a control on its first screen that opens the search dialog.

<!-- pdac:cite id="FR-SNAPSHOT-ORIENTATION" digest="sha256:dce92611dfcfcd595f7d67297eb2e74903165595d9f72b309f5560fb04219479" -->
<!-- pdac:cite id="FR-SNAPSHOT-SEARCH" digest="sha256:d924ae0adf5ab9304030acf7c64642db30b1862562a21197ad176b3fce90b353" -->

#### Scenario: Family entry

- **WHEN** a kind is selected on the orientation view
- **THEN** the catalog opens filtered to that kind, with a chip naming the filter

#### Scenario: Search from the first screen

- **WHEN** the orientation view's search control is activated
- **THEN** the search dialog opens over the orientation view with the query field focused

### Requirement: The interface is a calm, compact, text-first instrument in two appearances

The generated page SHALL render in a light and a dark appearance. By default it SHALL follow the reader's environment preference; one appearance control SHALL offer light, dark and the environment's preference, and a choice SHALL be held only in the address. Every colour the page uses — text, surfaces, lines, accent, kind colours, status indicators and projection strokes — SHALL have a value designed for each appearance.

Body and interface text SHALL use the reader's system sans-serif stack, and artifact identifiers and revision values SHALL render monospaced. Text contrast SHALL be strong in both appearances; structure SHALL be carried by thin borders, deliberate alignment and consistent spacing rather than elevation or enclosure, with elevation reserved for transient overlays such as the search dialog and a map's summary card; controls SHALL be square or low-radius. Colour use SHALL be restrained to one accent per appearance plus a per-artifact-kind palette that, within an appearance, does not change between artifacts, views or regenerations, with kinds distinguishable from one another; colour SHALL NOT be the sole carrier of any meaning.

Every artifact kind SHALL have one stable icon, defined within the file, shown beside that kind's text token wherever a kind is shown and never in place of it. The interface SHALL be compact. On the map views, the artifact under attention, its direct neighbours and their lines MAY glow in their kind colours while the rest dims, with the glow tuned per appearance and the lit state also carried by border weight and dimming. Apart from that highlight, the page SHALL NOT use gradients, glass or blur effects, decorative illustration, oversized hero typography, or a rounded-card dashboard treatment of its content.

<!-- pdac:cite id="QR-PRESENTATION" digest="sha256:7656c1278f5e0ba93b2051df3163321697a5064d2f7e3bdad634be1589a18784" -->
<!-- pdac:cite id="CON-NO-WEB-UI" digest="sha256:467b7a87238629673c45dac7b72e85e4cb17a969cbcdbf6f4bf5d1711209ddbf" -->

#### Scenario: The environment preference is followed

- **WHEN** the page is opened, with no appearance in the address, under a light and then a dark environment preference
- **THEN** it renders the light and then the dark appearance, and exactly one appearance control exists

#### Scenario: A chosen appearance lives in the address only

- **WHEN** the reader chooses each option of the appearance control
- **THEN** the page renders that appearance, the address records the choice, and nothing is written to browser storage or cookies

#### Scenario: Each appearance is complete

- **WHEN** each appearance is inspected, including kind colours, status indicators and the projection
- **THEN** every colour in use belongs to that appearance's set

#### Scenario: Typography carries identifiers distinctly

- **WHEN** computed styles are inspected across the orientation view, the artifact list, the artifact detail and the search dialog
- **THEN** prose and interface text use the system sans-serif stack and every artifact identifier and revision value renders monospaced

#### Scenario: Kind colour and icon are stable and never the only signal

- **WHEN** each artifact kind's colour and icon are recorded across the delivered views of one appearance and across two regenerations from identical content, and the page is then rendered with colour removed
- **THEN** each kind's colour and icon are identical everywhere, each icon stands beside its kind's text token, one accent colour is used, and kind, status and selection remain determinable without colour

#### Scenario: No decorative treatments

- **WHEN** the rendered page is inspected for gradients, glass or blur effects, decorative illustration, hero-scale typography and rounded-card dashboard treatment
- **THEN** none is present apart from the neon highlight on attended map artifacts, and only the search dialog and a map's summary card are elevated

### Requirement: The master area keeps the reader's place

The artifact list SHALL group artifacts by kind in groups the reader can open and close, each stating its kind, its icon and the number of artifacts it holds. The group holding the selected artifact SHALL be open, SHALL be marked as holding the selection by a visible rule and a text marker in addition to colour, and SHALL keep the selected entry within the list's visible area whenever the selection changes. A kind heading SHALL stay visible while its group is scrolled.

The reader SHALL be able to collapse the master area to a rail of the artifact kinds — each an icon with its text token — through a visible control and a stated shortcut, and to restore it the same ways. The rail SHALL mark the selected artifact's kind by more than colour, and activating a kind on the rail SHALL restore the master area with that kind's group open and in view. While collapsed, the Reader SHALL take the freed width.

<!-- pdac:cite id="FR-SNAPSHOT-READER" digest="sha256:755cdb9d6221a00c6b2670a5547c32719b4f24ef628b8aaf1c79d8aa11afc654" -->
<!-- pdac:cite id="QR-ACCESSIBILITY" digest="sha256:5aaf32bd1141581f505558a4379ff7d6498a2cc3e959512523333767716ae8a6" -->

#### Scenario: The selection's group opens and shows the entry

- **WHEN** the reader follows a relationship to an artifact of a kind whose group is closed
- **THEN** that group opens, is marked as holding the selection, and its selected entry is within the list's visible area

#### Scenario: Groups open and close on request

- **WHEN** the reader closes a group that does not hold the selection and opens another
- **THEN** the first hides its entries, the second shows them, each reports its expanded state, and the selection is unchanged

#### Scenario: Collapse to a rail and back

- **WHEN** the reader collapses the master area with its control, then with the shortcut restores it, and collapses it again and activates a kind on the rail
- **THEN** the rail marks the selected artifact's kind, the Reader widens, and activating a kind restores the master area with that kind's group open and in view

## REMOVED Requirements

### Requirement: Graph visualization with node-selection highlighting

**Reason**: CHG-SNAPSHOT-V2 replaces the two-projection limit (the kind-level aggregate and the Focused Topology, with no drawing of the whole graph) by the kind-level aggregate plus three map views.

**Migration**: "Three map views over the whole model" and the Overview map, Focus view and Columns view requirements carry the projection obligations; routes for the earlier focused projection resolve to the Focus view.

### Requirement: The focused neighbourhood lays relationship groups out in rows around the selected artifact

**Reason**: The Focused Topology beside the Reader is replaced by the Focus view (FR-SNAPSHOT-TOPOLOGY as revised by CHG-SNAPSHOT-V2).

**Migration**: "The Focus view centres the selection among its neighbours"; the Reader keeps every relationship group as text and offers a Focus action.
