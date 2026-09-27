<!-- pdac-scope: cited -->

## MODIFIED Requirements

### Requirement: Every artifact is rendered, organized by kind, with a status badge

The single generated file SHALL contain every product artifact — its frontmatter, its authored body and its status — completely, so nothing a reader can reach is missing and nothing is fetched later. The page SHALL render **exactly one** artifact detail at a time: when an artifact is selected, its title, ID, kind, status and remaining metadata are shown together with its authored Markdown rendered with the original heading hierarchy, and no other artifact's content SHALL be present in the document alongside it. Artifacts SHALL be reachable by kind through a list grouped by kind that can be narrowed by filters, and every artifact of the model SHALL be selectable from it. Each artifact's status SHALL be displayed. On viewports too narrow for a side-by-side arrangement, the list and the detail SHALL become distinct navigable states rather than a scaled-down desktop layout.

Completeness is a property of the file, not of the display: all artifacts are embedded, and none but the selected one is rendered.

<!-- pdac:cite id="FR-SNAPSHOT-002" digest="sha256:426d0203a9491acef6dd97281ad967d545070f6fe14208ba5f77f13da2f8fc5a" -->

#### Scenario: Browse by kind and select one artifact

- **WHEN** a reader opens the snapshot, narrows the list to a kind and selects one artifact
- **THEN** that artifact's metadata and authored body are rendered with the author's heading structure, and inspecting the document confirms no other artifact's body is present

#### Scenario: Every artifact remains reachable

- **WHEN** a reader walks the list across every kind, opening each kind's group
- **THEN** each artifact of the model can be selected, and the file contains every artifact's content whether or not it has been displayed

#### Scenario: Status is visible

- **WHEN** a reader views any artifact
- **THEN** the artifact's status is displayed visibly, and a draft artifact is distinguishable from an active one

#### Scenario: Narrow viewport separates list and detail

- **WHEN** the page is opened at a viewport width too narrow for a side-by-side arrangement
- **THEN** the list and the artifact detail are usable as separate navigable states with no horizontal page scrolling

### Requirement: Graph visualization with node-selection highlighting

The page SHALL provide exactly two graph projections — the kind-level aggregate and the Focused Topology — and SHALL NOT provide a drawing of the whole graph or any arrangement in which artifact kind determines position. No projection SHALL be rendered in the opening view. Selecting a member in the projection SHALL make that artifact the page's single selected artifact.

The Focused Topology SHALL be local, bounded and progressive: anchored on the selected artifact, its immediate canonical relationships grouped by relationship meaning and artifact type with complete counts, direction distinguished other than by colour alone, and members revealed only on deliberate action. Its disclosure SHALL be carried in the address and SHALL replace the history entry on toggle; refocusing on a member SHALL be a navigation to a newly focused projection with disclosure reset — the traversal never accumulates. An opened group SHALL present its members as a structured list attached to that group, named by its relationship type and kind, with every entry selectable, whatever the group's size.

<!-- pdac:cite id="FR-SNAPSHOT-005" digest="sha256:6f4280d6db76da8e0188db3dbb63e55d8df4ea045950cea506a50beae1d9259b" -->
<!-- pdac:cite id="FR-SNAPSHOT-009" digest="sha256:ab9721cb7fb71a07fa8a48789379024ecd0eeda9122267329ee3dcbc20718ff7" -->

#### Scenario: Exactly two projections

- **WHEN** the generated page is inspected and every control exercised
- **THEN** only the kind-level aggregate and the Focused Topology exist, and the withdrawn map routes resolve in place to the Focused Topology

#### Scenario: Disclosure is addressable, not history

- **WHEN** a group is opened and the resulting address is opened in a fresh window
- **THEN** the same group is open, and opening it never grew the browser history

#### Scenario: Refocus resets

- **WHEN** a member is selected from an opened group
- **THEN** a newly focused projection appears with no group open, and Back returns to the previous focus with its disclosure intact

#### Scenario: Dense sets stay legible

- **WHEN** a group of any size is opened
- **THEN** its members are presented as a structured list attached to it, the list is named by the group's relationship type and kind, and every entry remains selectable

### Requirement: Offline client-side search

The page SHALL provide search over artifact identifiers, titles, kinds and body content, working entirely client-side with no network access, from the same single self-contained file.

Search SHALL be an action available on every view: one visible control that is always present in the page header, and the keyboard shortcuts `/` and `Ctrl+K` (or `Cmd+K`), both stated on the page. Invoking it SHALL open a search dialog over the current view, with the query field focused, without changing the selected artifact or the active view. Dismissing the dialog — with Escape, by its close control, or by selecting outside it — SHALL return focus to where the reader was. The dialog SHALL offer the canonical narrowing the catalog supports — artifact kind, status, and bounded context where the model declares one — and SHALL rank results within the narrowing applied there.

Results SHALL be ranked in this order of precedence: exact identifier match; identifier prefix match; exact or prefix title match; title substring match; body content match. A query equal to an artifact's identifier SHALL place that artifact first. Ordering SHALL be total, so identical queries against identical model content produce identical result order.

Each result SHALL identify its artifact by identifier, title and kind. Where a result was produced by a body match, it SHALL show a snippet of the matching content, escaped so authored content cannot become markup or executable.

If the page limits how many results it displays, it SHALL state how many matches exist in total, and SHALL NOT display a lower-ranked match in place of a higher-ranked one. Truncation SHALL never be silent.

Search SHALL be fully operable from the keyboard: invoking it, moving through results, selecting a result and clearing the query. Selecting a result SHALL make its artifact the page's single selected artifact and close the dialog. Clearing the query SHALL return the reader to browsing without discarding the artifact they had selected. A query matching no artifact SHALL produce an explicit no-results state that names the query rather than an empty list.

<!-- pdac:cite id="FR-SNAPSHOT-004" digest="sha256:79141d7904dd9088a5f0643acb9217c0badc0e6356e4053b6fcf4c817c35b5ec" -->
<!-- pdac:cite id="QR-ACCESSIBILITY-001" digest="sha256:7694a090493fb8963717e168d1bba8d692e392d7b988a2850ab7357f53cb4f48" -->

#### Scenario: Search is one gesture from every view

- **WHEN** the reader, on the Overview, the catalog and the Reader in turn, activates the header search control and then presses `/` and `Ctrl+K`
- **THEN** each time the search dialog opens with the query field focused, and the selected artifact and the active view are unchanged

#### Scenario: Dismissal returns focus

- **WHEN** the dialog is dismissed with Escape
- **THEN** it closes and focus returns to the element that had it before the dialog opened

#### Scenario: Narrowing where the query is typed

- **WHEN** the reader narrows a query to one kind inside the dialog
- **THEN** only artifacts of that kind are ranked, in the order the unnarrowed ranking gives them

#### Scenario: An exact identifier lands first

- **WHEN** the reader types an artifact's identifier exactly
- **THEN** that artifact is the first result

#### Scenario: Identifiers outrank titles, and titles outrank bodies

- **WHEN** the reader types a string that matches some identifiers by prefix, some titles, and some bodies
- **THEN** the identifier-prefix matches appear above the title matches, which appear above the body-only matches

#### Scenario: Title matches are not crowded out by body matches

- **WHEN** the reader searches for a word that appears in many bodies and in several titles
- **THEN** the artifacts whose titles match appear above those matched only in their bodies

#### Scenario: Matching by kind

- **WHEN** the reader types the name of an artifact kind
- **THEN** artifacts of that kind are returned

#### Scenario: Body matches show a safe snippet

- **WHEN** a result was produced by a phrase inside an artifact's body, and that body also contains markup-like authored text
- **THEN** the result shows a snippet containing the phrase, and any markup-like text in it is displayed as text rather than parsed or executed

#### Scenario: Truncation is stated, never silent

- **WHEN** a query matches more artifacts than the page displays
- **THEN** the page states the total number of matches, and every result shown outranks every result omitted

#### Scenario: Search is operable by keyboard alone

- **WHEN** the reader invokes search, moves through the results, selects one and clears the query using only the keyboard
- **THEN** each step works, and the selected result becomes the page's single selected artifact

#### Scenario: Clearing keeps the selection

- **WHEN** the reader clears a query after having selected an artifact
- **THEN** browsing resumes and that artifact is still selected

#### Scenario: Nothing matches, said plainly

- **WHEN** a query matches no artifact
- **THEN** the page states that nothing matches and repeats the query it searched for

#### Scenario: Deterministic ordering

- **WHEN** the same query is run against two snapshots generated from identical model content
- **THEN** the results appear in identical order

### Requirement: The snapshot opens in an orientation view

The page SHALL open in an orientation view whose purpose is to convey the shape of the product, and which SHALL render no artifact's authored content and no artifact-level graph. It SHALL expose the product's identity and the source revision, the total number of artifacts and of relationships, the number of artifacts of each kind present with an entry point into each kind, a plain-language statement that the page is a generated read-only projection that is never authoritative, and a kind-level aggregate of the relationships by relationship type.

The orientation view SHALL additionally present the kind-level aggregate as a grid of source kind against target kind, each cell stating the number of relationships in that combination and each non-empty cell an entry point into the catalog narrowed to the source kind. It SHALL offer derived entry points, each labelled by the fact it reports: each journey with the use cases its steps reference, in the recorded step order; each bounded context with the number of artifacts that reference it; and the artifacts holding the most relationships, ordered by that count with the count shown beside each, under a label that states the criterion.

The orientation view MAY report the artifacts that hold no relationships, stating the exact count and their identities as entry points. Where it does, it SHALL present this as derived topology only: no warning or error presentation, no severity, no scoring, no health or completeness indication, and no vocabulary such as "orphaned", "dangling", "unused" or "missing".

Everything displayed SHALL be derived from the compiled model. A derived ordering SHALL state its criterion where it is shown and SHALL NOT be worded as importance, priority or a recommended reading order. The orientation view SHALL NOT assert importance, centrality, health, completeness, quality, ownership, ranking, ordering or lifecycle progression that the model does not record. It SHALL describe only the artifact kinds the model actually contains.

<!-- pdac:cite id="FR-SNAPSHOT-003" digest="sha256:e943d44f1e487316d7c50a59534c220a155da3387a93954a882be0754a615b07" -->

#### Scenario: Oriented before reading anything

- **WHEN** a reader opens the snapshot for the first time
- **THEN** the product identity, source revision, artifact and relationship totals, counts by kind with entry points, and the generated read-only statement are present, and no artifact body and no artifact-level graph is rendered

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

- **WHEN** the orientation view is inspected for claims beyond identity, revision, counts, entry points, the projection statement and the kind-level aggregate
- **THEN** no artifact is described as important, central, healthy, complete, owned, ranked or ordered by anything the model does not record

#### Scenario: Only the kinds present are described

- **WHEN** a snapshot is generated from a model containing only some artifact kinds
- **THEN** the orientation view describes those kinds and does not mention or zero-fill the others

### Requirement: One selected artifact addressed by the URL fragment

The page SHALL hold exactly one selected artifact at a time, shared by every part of the page, and exactly one navigation mechanism SHALL own state transitions. No part of the page may change the selected artifact or the active view without that mechanism, and the address SHALL always reflect the state the page is in. The addressable state SHALL represent at least the active view, the selected artifact's identifier, and the presentation choices the reader made — the chosen appearance and whether the master area is collapsed — using the URL fragment so it behaves identically from `file://` and from ordinary static hosting, with no server-side routing and no request at navigation time.

Changing a presentation choice SHALL update the address in place, replacing the current history entry, and SHALL NOT change the selected artifact or the active view. An address carrying no presentation choice SHALL open with the environment's preferred appearance and the master area open. Presentation choices SHALL survive navigation between artifacts and views.

Opening the page at an address naming an artifact SHALL open on that artifact. Browser Back and Forward SHALL restore previously visited views and selections. An address naming an artifact the snapshot does not contain SHALL produce an explicit state naming the identifier it could not resolve and offering a way to continue exploring.

<!-- pdac:cite id="FR-SNAPSHOT-006" digest="sha256:b29e1faa337fb90b5dcac8b9ddeb92325c7acb2c29a2b18bb512ec2e6be7bf3f" -->

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

Every capability of the delivered surfaces SHALL be reachable and operable by keyboard alone — the orientation view, the search dialog, the artifact list and its groups, the collapsible master area, the artifact detail, the Focused Topology and the view navigation — with no trapped focus and no pointer-only control. The focused element SHALL always be visibly identifiable, including the groups and members of the Focused Topology, and focus SHALL land on a meaningful element after every view and selection change. Every keyboard shortcut SHALL be stated on the page, and every action a shortcut performs SHALL also be reachable through a visible, focusable control. The search dialog SHALL take focus when it opens, SHALL be dismissible from the keyboard, and SHALL return focus when it closes.

The page SHALL expose semantic landmarks for its regions and a heading hierarchy without skipped levels. The selected artifact SHALL be reported as current with `aria-current` in the list, the active view SHALL be reported as current in the page navigation, and expanded state — of kind groups, relationship groups, projection groups and the master area — SHALL be exposed as state. Every icon-only control SHALL carry an accessible name stating what it does. All text SHALL meet WCAG 2.1 AA contrast in every appearance. No information a reader needs SHALL require hover or pointer proximity to reveal. Where the reader's environment expresses a reduced-motion preference, no non-essential animation or transition SHALL run.

<!-- pdac:cite id="QR-ACCESSIBILITY-001" digest="sha256:7694a090493fb8963717e168d1bba8d692e392d7b988a2850ab7357f53cb4f48" -->

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

### Requirement: Relationships are grouped by type and kind with exact counts

An artifact's relationships SHALL be presented grouped within each direction, by relationship type and by the artifact kind at the other end, rather than as one undifferentiated list. Every group SHALL state its direction, its relationship type, the kind at the other end and the exact number of relationships it contains, and each direction SHALL state its total. Grouping and ordering SHALL be derived from the compiled graph and SHALL be identical for identical model content.

<!-- pdac:cite id="FR-SNAPSHOT-002" digest="sha256:426d0203a9491acef6dd97281ad967d545070f6fe14208ba5f77f13da2f8fc5a" -->

#### Scenario: Neighbours arrive grouped, not spilled

- **WHEN** a reader selects an artifact that declares several relationships of different types
- **THEN** its relationships appear in groups labelled by direction, relationship type and the artifact kind at the other end, each stating how many relationships it contains

#### Scenario: Counts are faithful to the compiled graph

- **WHEN** the groups shown for an artifact are compared with the relationships the compiled graph records for it
- **THEN** the group counts sum to exactly that artifact's relationships in that direction, and to the total stated for that direction, with none missing and none invented

#### Scenario: Grouping is deterministic

- **WHEN** two snapshots are generated from identical model content
- **THEN** the same artifact's groups appear in the same order with the same members

### Requirement: Large relationship groups start collapsed and expand on request

A relationship group large enough to overwhelm the view SHALL start collapsed, showing its exact count rather than its members, and SHALL reveal its members only when the reader expands it. Expansion SHALL be operable by keyboard, and the collapsed or expanded state SHALL be exposed to assistive technology as state rather than conveyed only by appearance. A group small enough to read at a glance SHALL be shown expanded, so nothing is hidden without reason.

<!-- pdac:cite id="FR-SNAPSHOT-002" digest="sha256:426d0203a9491acef6dd97281ad967d545070f6fe14208ba5f77f13da2f8fc5a" -->

#### Scenario: A high-degree artifact stays readable

- **WHEN** a reader selects the most connected artifact in the model
- **THEN** its neighbours appear as counted groups, the large ones collapsed, and nothing expands until the reader expands it

#### Scenario: Expanding reveals exactly what was counted

- **WHEN** the reader expands a collapsed group that reported a count
- **THEN** exactly that many related artifacts are revealed, each selectable in one step

#### Scenario: Expansion is keyboard-operable and exposed as state

- **WHEN** the reader reaches a collapsed group by keyboard and activates it
- **THEN** it expands, and its expanded state is reported to assistive technology

### Requirement: Catalog discovery state is addressable and preserved

The catalog's active query and filters SHALL be part of the page address, serialized in a fixed order so identical states produce identical addresses. Filter and query changes SHALL re-address the page in place without adding history entries. Opening an artifact from the catalog SHALL preserve the active state, and returning SHALL resume it. Filters SHALL exist only for canonical fields — artifact type, status, and bounded context where the model declares one — and a name-or-identifier narrowing carried by an address from an earlier snapshot SHALL still apply.

Every active filter SHALL be shown beside the list as a named chip, each removable in one step, with one control that clears them all; clearing them all SHALL restore the complete list.

<!-- pdac:cite id="FR-SNAPSHOT-008" digest="sha256:b9ae2520c7778c6c7a90d1866db57873cfa0fe5e2995a05b8786a7797efd281a" -->

#### Scenario: A discovery is shareable

- **WHEN** a query-and-filter state's address is opened in a fresh window from local disk
- **THEN** the same result set appears in the same order and the active filters are shown as chips

#### Scenario: Open and return resumes

- **WHEN** a reader opens a result from a narrowed catalog and navigates back to the list
- **THEN** the query, filters and result set are as they were left

#### Scenario: Narrowing is visible and removable

- **WHEN** a kind and a status filter are active and the reader removes one chip, then clears the rest
- **THEN** the list widens by exactly the removed filter, and clearing restores every artifact

#### Scenario: Filtering never floods history

- **WHEN** several filters and a query are changed in sequence
- **THEN** the address reflects each state and the history length is unchanged

### Requirement: The orientation view offers family entry points and global search

Each artifact kind on the orientation view SHALL be an entry point into the catalog narrowed to that family, and the orientation view SHALL present a control on its first screen that opens the search dialog.

<!-- pdac:cite id="FR-SNAPSHOT-003" digest="sha256:e943d44f1e487316d7c50a59534c220a155da3387a93954a882be0754a615b07" -->
<!-- pdac:cite id="FR-SNAPSHOT-004" digest="sha256:79141d7904dd9088a5f0643acb9217c0badc0e6356e4053b6fcf4c817c35b5ec" -->

#### Scenario: Family entry

- **WHEN** a kind is selected on the orientation view
- **THEN** the catalog opens filtered to that kind, with a chip naming the filter

#### Scenario: Search from the first screen

- **WHEN** the orientation view's search control is activated
- **THEN** the search dialog opens over the orientation view with the query field focused

### Requirement: The Reader preserves and names navigation context

Relationship links on the artifact detail SHALL carry the active catalog state, so following an edge preserves the discovery in progress. The detail SHALL name the discovery it returns to — the active kind, status, context, filter and query — visibly and retraceably in one step; without an active discovery it SHALL offer the full catalog.

Every identifier of an artifact the model contains, where it appears in the selected artifact's metadata or authored body, SHALL be a link that makes that artifact the new focus and carries the active catalog state; the authored text SHALL otherwise be displayed exactly as written, and an identifier the model does not contain SHALL remain plain text. The detail SHALL offer the previous and the next artifact of the current list in one step each, SHALL state the selected artifact's position within its kind, and SHALL offer to copy the artifact's identifier and the address of the current view.

<!-- pdac:cite id="FR-SNAPSHOT-002" digest="sha256:426d0203a9491acef6dd97281ad967d545070f6fe14208ba5f77f13da2f8fc5a" -->

#### Scenario: Following an edge keeps the discovery

- **WHEN** a reader with an active query and filters follows a relationship link or an identifier link in the body
- **THEN** the address of the target artifact carries the same catalog state

#### Scenario: The way back is named

- **WHEN** an artifact is read during an active discovery
- **THEN** the detail names that discovery and returning resumes it exactly

#### Scenario: Known identifiers are links, text is unchanged

- **WHEN** an artifact whose body and metadata name known artifacts, and one identifier the model does not contain, is selected
- **THEN** each known identifier is a link to its artifact, the unknown one is plain text, and the body's text content is identical to the authored text

#### Scenario: Stepping through the list

- **WHEN** the reader activates next and then previous on an artifact of a filtered list
- **THEN** they move to the adjacent artifacts of that list and back, and the detail states the position within the kind

## ADDED Requirements

### Requirement: The interface is a calm, compact, text-first instrument in two appearances

The generated page SHALL render in a light and a dark appearance. By default it SHALL follow the reader's environment preference; one appearance control SHALL offer light, dark and the environment's preference, and a choice SHALL be held only in the address. Every colour the page uses — text, surfaces, lines, accent, kind colours, status indicators and projection strokes — SHALL have a value designed for each appearance.

Body and interface text SHALL use the reader's system sans-serif stack, and artifact identifiers and revision values SHALL render monospaced. Text contrast SHALL be strong in both appearances; structure SHALL be carried by thin borders, deliberate alignment and consistent spacing rather than elevation or enclosure, with elevation reserved for transient overlays such as the search dialog and a projection's member list; controls SHALL be square or low-radius. Colour use SHALL be restrained to one accent per appearance plus a per-artifact-kind palette that, within an appearance, does not change between artifacts, views or regenerations, with kinds distinguishable from one another; colour SHALL NOT be the sole carrier of any meaning.

Every artifact kind SHALL have one stable icon, defined within the file, shown beside that kind's text token wherever a kind is shown and never in place of it. The interface SHALL be compact. The page SHALL NOT use gradients, glass or blur effects, decorative illustration, oversized hero typography, or a rounded-card dashboard treatment of its content.

<!-- pdac:cite id="QR-PRESENTATION-001" digest="sha256:d16a3c4eb8a38f0282d47a962ec3822bcd882f1910131d504ed0d2ed75352e88" -->
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
- **THEN** none is present, and only the search dialog and a projection's member list are elevated

### Requirement: The focused neighbourhood lays relationship groups out in rows around the selected artifact

The focused neighbourhood SHALL anchor on the page's selected artifact and show one hop. What surrounds the anchor SHALL be the artifact's relationship groups rather than its individual artifacts: each group SHALL state its relationship type, the artifact kind at the other end and the exact number of relationships it represents. Groups the artifact declares SHALL be laid out in rows above the anchor and groups referencing it in rows below, each connected to the anchor by a directed line, so direction is carried by position and by the line and remains determinable with colour removed.

Rows SHALL wrap to the width of the pane, so no group overlaps another at any pane width; when the rows need more height than the pane offers, the pane SHALL scroll rather than shrink or overlap them. Nothing SHALL be placed outside the pane's width.

Activating a group SHALL open or close its member list and SHALL NOT change the selected artifact; at most one group SHALL be open at a time. Activating a member SHALL select that artifact. Both SHALL be operable by keyboard, Escape SHALL close an open member list, and expanded state SHALL be exposed to assistive technology as state. Pointing at or focusing a group SHALL highlight the Reader's relationship group of the same direction, type and kind, and the reverse; opening a group SHALL bring its Reader counterpart into view. The relative width of the Reader and the projection SHALL be adjustable by pointer and by keyboard; that width is reader state and SHALL NOT be persisted anywhere.

A group SHALL state its identity in visible text, so nothing needed is available only to a pointer. The equivalent relationship list SHALL remain available whether or not this projection is used.

Placement SHALL remain a pure function of the model, the pane width and which group is open: identical model content, width and open group SHALL produce an identical arrangement.

<!-- pdac:cite id="FR-SNAPSHOT-009" digest="sha256:ab9721cb7fb71a07fa8a48789379024ecd0eeda9122267329ee3dcbc20718ff7" -->
<!-- pdac:cite id="TERM-FOCUSED-TOPOLOGY" digest="sha256:0078e5754fc215a6bdde6b601ac543c391491356666cc36265c26e83fa134595" -->

#### Scenario: Groups surround the anchor, not artifacts

- **WHEN** the reader views the focused neighbourhood for an artifact with several relationship types
- **THEN** one group appears per direction, relationship type and other-end kind, each stating its type, kind and exact count

#### Scenario: Direction is positional

- **WHEN** an artifact has both incoming and outgoing relationships, and the projection is viewed with colour removed
- **THEN** declared groups sit above the anchor and referencing groups below it, each joined to the anchor by a directed line

#### Scenario: Rows never overlap

- **WHEN** the most connected artifact in the model is focused at the narrowest and the widest pane widths the layout allows
- **THEN** no two groups overlap, nothing extends beyond the pane's width, and rows that exceed the pane's height are reachable by scrolling the pane

#### Scenario: The two gestures do different things

- **WHEN** the reader activates a group, and then activates one of its members
- **THEN** the group's member list opens without changing the selected artifact, and the member becomes the selected artifact

#### Scenario: One open group, closed by Escape

- **WHEN** the reader opens one group and then another, and then presses Escape
- **THEN** only the second group's member list is open until Escape closes it

#### Scenario: Projection and Reader correspond

- **WHEN** the reader points at or focuses a group in the projection, and then points at a relationship group in the Reader
- **THEN** the counterpart of each is highlighted, and opening a projection group brings its Reader counterpart into view

#### Scenario: The split is adjustable

- **WHEN** the reader drags the divider between the Reader and the projection, and then moves it with the arrow keys
- **THEN** both panes resize by either means, and nothing about the width is stored

#### Scenario: The hardest artifact stays legible

- **WHEN** the reader views the focused neighbourhood for the most connected artifact in the model
- **THEN** the projection shows one group per relationship type and kind rather than one node per relationship, and its size tracks the number of groups rather than the artifact's degree

### Requirement: The master area keeps the reader's place

The artifact list SHALL group artifacts by kind in groups the reader can open and close, each stating its kind, its icon and the number of artifacts it holds. The group holding the selected artifact SHALL be open, SHALL be marked as holding the selection by a visible rule and a text marker in addition to colour, and SHALL keep the selected entry within the list's visible area whenever the selection changes. A kind heading SHALL stay visible while its group is scrolled.

The reader SHALL be able to collapse the master area to a rail of the artifact kinds — each an icon with its text token — through a visible control and a stated shortcut, and to restore it the same ways. The rail SHALL mark the selected artifact's kind by more than colour, and activating a kind on the rail SHALL restore the master area with that kind's group open and in view. While collapsed, the Reader and the projection SHALL take the freed width.

<!-- pdac:cite id="FR-SNAPSHOT-002" digest="sha256:426d0203a9491acef6dd97281ad967d545070f6fe14208ba5f77f13da2f8fc5a" -->
<!-- pdac:cite id="QR-ACCESSIBILITY-001" digest="sha256:7694a090493fb8963717e168d1bba8d692e392d7b988a2850ab7357f53cb4f48" -->

#### Scenario: The selection's group opens and shows the entry

- **WHEN** the reader follows a relationship to an artifact of a kind whose group is closed
- **THEN** that group opens, is marked as holding the selection, and its selected entry is within the list's visible area

#### Scenario: Groups open and close on request

- **WHEN** the reader closes a group that does not hold the selection and opens another
- **THEN** the first hides its entries, the second shows them, each reports its expanded state, and the selection is unchanged

#### Scenario: Collapse to a rail and back

- **WHEN** the reader collapses the master area with its control, then with the shortcut restores it, and collapses it again and activates a kind on the rail
- **THEN** the rail marks the selected artifact's kind, the Reader and the projection widen, and activating a kind restores the master area with that kind's group open and in view

## REMOVED Requirements

### Requirement: The interface is a light, compact, text-first instrument

**Reason**: QR-PRESENTATION-001, as amended by CHG-SNAPSHOT-005, replaces the single light appearance with light and dark appearances and one appearance control, and adds kind icons and overlay elevation.

**Migration**: Superseded by "The interface is a calm, compact, text-first instrument in two appearances", which keeps every other presentation obligation.

### Requirement: The focused neighbourhood orbits relationship groups around the selected artifact

**Reason**: The orbit with fanned members, pan and zoom is replaced by layered rows that cannot overlap, a member list per opened group, a correspondence with the Reader's groups and a resizable split. FR-SNAPSHOT-009 leaves the layout free, and the rows satisfy it more legibly at every pane width.

**Migration**: Superseded by "The focused neighbourhood lays relationship groups out in rows around the selected artifact". The disclosure address parameter keeps its meaning, naming the open group, and addresses from earlier snapshots still resolve.

### Requirement: The active graph mode is part of the addressable state

**Reason**: The Product Explorer has one projection pane beside the Reader, anchored on the selection, so there is no projection mode to address. The Focused Topology's disclosure and the selection are already addressed by "One selected artifact addressed by the URL fragment" and "Graph visualization with node-selection highlighting".

**Migration**: None needed. Addresses from earlier snapshots that named a projection route (`#/graph`, `#/graph/layers`, `#/graph/focus/<ID>`) still resolve in place to the artifacts view.
