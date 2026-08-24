## Purpose

Specify the generation of the Product Snapshot: a static, self-contained, read-only HTML page projecting the whole product model for people without the repository, produced by `prodshape graph --format html` — self-containment, determinism, revision stamping, honest diagnostics, and readable by-kind rendering with status badges.

## Requirements

### Requirement: HTML is an output format of the graph command

The system SHALL generate a Product Snapshot when the graph command is invoked with the HTML format (`prodshape graph --format html`). Generation SHALL produce exactly one self-contained HTML file under the generated-output area and SHALL report the output path. Generation SHALL never modify any authored file.

{pdac:cite id="FR-SNAPSHOT-001" digest="sha256:4b516c17b1b0895996d48135fa1729bd2cc20913f98a8d820d5a5c82a0310a5d"}

{pdac:cite id="UC-SNAPSHOT-001" digest="sha256:c0ccfa6c37694a43bfad609bc70cada84a512aa0d77db1611051f55bfc97bf58"}

#### Scenario: Engineer generates a snapshot

- **WHEN** an engineer runs `prodshape graph --format html` in a repository with a valid product model
- **THEN** exactly one HTML file is written under the generated-output area and its path is reported

#### Scenario: Generation is read-only towards the model

- **WHEN** a snapshot is generated
- **THEN** no file under the product model directory is created, modified or deleted

### Requirement: The snapshot is one self-contained file

The generated page SHALL function completely when opened from local disk with no server and no network access: no external scripts, styles, fonts, images or data are referenced. All CSS and any data the page needs SHALL be embedded in the single file.

{pdac:cite id="FR-SNAPSHOT-001" digest="sha256:4b516c17b1b0895996d48135fa1729bd2cc20913f98a8d820d5a5c82a0310a5d"}

{pdac:cite id="CON-NO-WEB-UI" digest="sha256:467b7a87238629673c45dac7b72e85e4cb17a969cbcdbf6f4bf5d1711209ddbf"}

#### Scenario: Offline open from local disk

- **WHEN** the generated file is opened in a browser from `file://` with networking disabled
- **THEN** every capability of the page works and no network request is attempted

#### Scenario: No external references in the output

- **WHEN** the generated HTML is inspected
- **THEN** it contains no `http(s)://` resource references required for rendering

### Requirement: Every artifact is rendered, organized by kind, with a status badge

The single generated file SHALL contain every product artifact — its frontmatter, its authored body and its status — completely, so nothing a reader can reach is missing and nothing is fetched later. The page SHALL render **exactly one** artifact detail at a time: when an artifact is selected, its title, ID, kind, status and remaining metadata are shown together with its authored Markdown rendered with the original heading hierarchy, and no other artifact's content SHALL be present in the document alongside it. Artifacts SHALL be reachable by kind through a list that can be narrowed by filters, and every artifact of the model SHALL be selectable from it. Each artifact's status SHALL be displayed. On viewports too narrow for a side-by-side arrangement, the list and the detail SHALL become distinct navigable states rather than a scaled-down desktop layout.

Completeness is a property of the file, not of the display: all artifacts are embedded, and none but the selected one is rendered.

#### Scenario: Browse by kind and select one artifact

- **WHEN** a reader opens the snapshot, narrows the list to a kind and selects one artifact
- **THEN** that artifact's metadata and authored body are rendered with the author's heading structure, and inspecting the document confirms no other artifact's body is present

#### Scenario: Every artifact remains reachable

- **WHEN** a reader walks the list across every kind
- **THEN** each artifact of the model can be selected, and the file contains every artifact's content whether or not it has been displayed

#### Scenario: Status is visible

- **WHEN** a reader views any artifact
- **THEN** the artifact's status is displayed visibly, and a draft artifact is distinguishable from an active one

#### Scenario: Narrow viewport separates list and detail

- **WHEN** the page is opened at a viewport width too narrow for a side-by-side arrangement
- **THEN** the list and the artifact detail are usable as separate navigable states with no horizontal page scrolling

### Requirement: The source revision is stamped on the page

The page SHALL display the source revision of the model it was generated from, placed where a reader finds it without searching.

#### Scenario: Reader checks currency

- **WHEN** a reader opens the snapshot
- **THEN** the model's source revision is visible on the page without scrolling into artifact content

### Requirement: Generation is deterministic

Identical model content SHALL yield a byte-identical HTML file across runs and platforms. Output SHALL NOT embed timestamps, random values, or environment-dependent content; artifact ordering SHALL be stable; line endings SHALL be normalized.

{pdac:cite id="QR-DETERMINISM-001" digest="sha256:222606693286667f7974e3dd8b88e6248ca29ce75cb54c9285cc7aaef2c08da3"}

#### Scenario: Double generation is byte-identical

- **WHEN** the snapshot is generated twice from the same commit
- **THEN** the two files are byte-identical

#### Scenario: Cross-platform stability

- **WHEN** the snapshot is generated from the same content on different platforms
- **THEN** the files are byte-identical

### Requirement: Generation reports honest diagnostics

When artifacts cannot be parsed, generation SHALL report diagnostics naming each affected file and SHALL NOT emit a snapshot that silently omits part of the model.

#### Scenario: Unparseable artifact blocks silent omission

- **WHEN** one artifact file is unparseable and generation is attempted
- **THEN** a diagnostic names the file and no snapshot lacking the artifact is emitted silently

### Requirement: The page is read-only

The page SHALL offer no capability to create, edit, annotate or approve anything: no forms, no editable fields, no controls that mutate state beyond client-side presentation. The page SHALL NOT persist anything outside the address of the current view: no browser storage, no cookies, no session, no durable store of any kind. Accepting a filter selection or a selected artifact is presentation state, not input that becomes product knowledge.

{pdac:cite id="CON-NO-WEB-UI" digest="sha256:467b7a87238629673c45dac7b72e85e4cb17a969cbcdbf6f4bf5d1711209ddbf"}

#### Scenario: No mutating controls

- **WHEN** the generated page is inspected and exercised
- **THEN** nothing on it accepts input that creates, edits or approves product knowledge

#### Scenario: Nothing is persisted

- **WHEN** a reader explores the page and browser storage and cookies are then inspected
- **THEN** the snapshot has written nothing, and reloading restores only what the address encodes

### Requirement: Relationships are navigable in both directions

On an artifact's rendered view, every reference to another artifact SHALL be a link that navigates to the referenced artifact — both the relationships the artifact's frontmatter declares (outgoing) and the derived reverse views computed from the rest of the model (incoming, "referenced by"). The reader SHALL NOT need to know which side authored the edge.

{pdac:cite id="BR-RELATIONSHIPS-001" digest="sha256:a6f9d40c2c1ac926149fe171660e5715b66b4e82ce8129f128eab0e6c1c7de8c"}

#### Scenario: Outgoing reference is a link

- **WHEN** a reader views a use case that declares a governing business rule
- **THEN** the rule's mention is a link that navigates to the rule's rendered view

#### Scenario: Derived incoming reference is a link

- **WHEN** a reader views a use case from which a functional requirement derives
- **THEN** the requirement appears in a "referenced by" view as a link, although no authored file states that edge on the use case

### Requirement: Graph visualization with node-selection highlighting

The page SHALL provide exactly two graph projections — the kind-level aggregate and the Focused Topology — and SHALL NOT provide a drawing of the whole graph or any arrangement in which artifact kind determines position. No projection SHALL be rendered in the opening view. Selecting a node in the projection SHALL make that artifact the page's single selected artifact.

The Focused Topology SHALL be local, bounded and progressive: anchored on the selected artifact, its immediate canonical relationships grouped by relationship meaning and artifact type with complete counts, direction distinguished other than by colour alone, expansion only on deliberate action. Its disclosure SHALL be carried in the address and SHALL replace the history entry on toggle; refocusing on a member SHALL be a navigation to a newly focused projection with disclosure reset — the traversal never accumulates. A group opened past the legibility threshold SHALL render as a structured list below the drawing, named as such, with every entry selectable.

{pdac:cite id="FR-SNAPSHOT-005" digest="sha256:6f4280d6db76da8e0188db3dbb63e55d8df4ea045950cea506a50beae1d9259b"}

#### Scenario: Exactly two projections

- **WHEN** the generated page is inspected and every control exercised
- **THEN** only the kind-level aggregate and the Focused Topology exist, and the withdrawn map routes resolve in place to the Focused Topology

#### Scenario: Disclosure is addressable, not history

- **WHEN** a group is toggled and the resulting address is opened in a fresh window
- **THEN** the same groups are open, and toggling never grew the browser history

#### Scenario: Refocus resets

- **WHEN** a member is selected from an expanded projection
- **THEN** a newly focused projection appears with default disclosure, and Back returns to the previous focus with its disclosure intact

#### Scenario: Dense sets stay legible

- **WHEN** a group larger than the legibility threshold is opened
- **THEN** it is presented as a structured list below the drawing rather than a fan, its accessible name says so, and every entry remains selectable

### Requirement: Offline client-side search

The page SHALL provide search over artifact identifiers, titles, kinds and body content, working entirely client-side with no network access, from the same single self-contained file.

Results SHALL be ranked in this order of precedence: exact identifier match; identifier prefix match; exact or prefix title match; title substring match; body content match. A query equal to an artifact's identifier SHALL place that artifact first. Ordering SHALL be total, so identical queries against identical model content produce identical result order.

Each result SHALL identify its artifact by identifier, title and kind. Where a result was produced by a body match, it SHALL show a snippet of the matching content, escaped so authored content cannot become markup or executable.

If the page limits how many results it displays, it SHALL state how many matches exist in total, and SHALL NOT display a lower-ranked match in place of a higher-ranked one. Truncation SHALL never be silent.

Search SHALL be fully operable from the keyboard: reaching the field, moving through results, selecting a result and clearing the query. Selecting a result SHALL make its artifact the page's single selected artifact. Clearing the query SHALL return the reader to browsing without discarding the artifact they had selected. A query matching no artifact SHALL produce an explicit no-results state that names the query rather than an empty list.

{pdac:cite id="FR-SNAPSHOT-004" digest="sha256:eb069f0c5e49363227f4cdfb37f6efeb5226bbf4f7f0393f2146629e77cee3a3"}

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

- **WHEN** the reader reaches the field, moves through the results, selects one and clears the query using only the keyboard
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

### Requirement: Navigation additions preserve the generation contract

The embedded script and data serving navigation, visualization and search SHALL be part of the single self-contained file, SHALL reference no external resources, SHALL offer no capability to create, edit, annotate or approve anything, and SHALL preserve deterministic generation: identical model content still yields a byte-identical file.

#### Scenario: Still one deterministic self-contained file

- **WHEN** the snapshot is generated twice from identical model content
- **THEN** the two files are byte-identical, and the page functions fully from local disk with networking disabled

#### Scenario: Still read-only

- **WHEN** the page's interactive features are exercised
- **THEN** nothing creates, edits or approves product knowledge; interactivity is limited to presentation

### Requirement: The snapshot opens in an orientation view

The page SHALL open in an orientation view whose purpose is to convey the shape of the product, and which SHALL render no artifact's authored content and no artifact-level graph. It SHALL expose the product's identity and the source revision, the total number of artifacts and of relationships, the number of artifacts of each kind present with an entry point into each kind, a plain-language statement that the page is a generated read-only projection that is never authoritative, and a kind-level aggregate of the relationships.

The orientation view MAY report the artifacts that hold no relationships, stating the exact count and their identities as entry points. Where it does, it SHALL present this as derived topology only: no warning or error presentation, no severity, no scoring, no health or completeness indication, and no vocabulary such as "orphaned", "dangling", "unused" or "missing".

Everything displayed SHALL be derived from the compiled model. The orientation view SHALL NOT assert importance, centrality, health, completeness, quality, ownership, ranking, ordering or lifecycle progression that the model does not record. It SHALL describe only the artifact kinds the model actually contains.

{pdac:cite id="FR-SNAPSHOT-003" digest="sha256:279494d0984f61be58192dd8a11f7b452c4fb706436ea14a6c41b6167f2aaac7"}

#### Scenario: Oriented before reading anything

- **WHEN** a reader opens the snapshot for the first time
- **THEN** the product identity, source revision, artifact and relationship totals, counts by kind with entry points, and the generated read-only statement are present, and no artifact body and no artifact-level graph is rendered

#### Scenario: Counts match the compiled graph

- **WHEN** the orientation view's totals and per-kind counts are compared with `prodshape graph` output for the same model
- **THEN** they match exactly

#### Scenario: Unconnected artifacts reported neutrally

- **WHEN** the model contains artifacts with no relationships and the orientation view reports them
- **THEN** the exact count and their identities are shown as entry points, with no warning styling, no severity, no score and no vocabulary suggesting a defect

#### Scenario: No fabricated conclusions

- **WHEN** the orientation view is inspected for claims beyond identity, revision, counts, entry points, the projection statement and the kind-level aggregate
- **THEN** no artifact is described as important, central, healthy, complete, owned, ranked or ordered by anything the model does not record

#### Scenario: Only the kinds present are described

- **WHEN** a snapshot is generated from a model containing only some artifact kinds
- **THEN** the orientation view describes those kinds and does not mention or zero-fill the others

### Requirement: Kind-level relationship aggregate

The page SHALL provide a kind-level aggregate projection: the model's artifacts and relationships grouped by artifact kind and relationship type, with exact counts, communicating composition and traceability without rendering individual artifacts. It SHALL display nothing absent from the compiled graph, SHALL imply no importance, health, ownership or ordering, and SHALL be arranged identically for identical model content.

{pdac:cite id="FR-SNAPSHOT-005" digest="sha256:6f4280d6db76da8e0188db3dbb63e55d8df4ea045950cea506a50beae1d9259b"}

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

The page SHALL hold exactly one selected artifact at a time, shared by every part of the page, and exactly one navigation mechanism SHALL own state transitions. No part of the page may change the selected artifact or the active view without that mechanism, and the address SHALL always reflect the state the page is in. The addressable state SHALL represent at least the active view and the selected artifact's identifier, using the URL fragment so it behaves identically from `file://` and from ordinary static hosting, with no server-side routing and no request at navigation time.

Opening the page at an address naming an artifact SHALL open on that artifact. Browser Back and Forward SHALL restore previously visited views and selections. An address naming an artifact the snapshot does not contain SHALL produce an explicit state naming the identifier it could not resolve and offering a way to continue exploring.

{pdac:cite id="FR-SNAPSHOT-006" digest="sha256:fa9fc4a9dffadd15a95838034bdeac21922756c93217d53dbce2f4b5ebc000f5"}

#### Scenario: Selection is shared and addressable

- **WHEN** a reader selects an artifact from the list
- **THEN** it becomes the page's single selected artifact, every surface showing it reflects that, and the address changes to match

#### Scenario: Direct artifact link from local disk and from hosting

- **WHEN** the address of a selected artifact is opened in a new window from local disk with networking disabled, and again from a static web server
- **THEN** both resolve to the same artifact in the same view, with no server configuration and no request beyond the file itself

#### Scenario: Back and Forward restore exploration

- **WHEN** a reader visits several artifacts and views and then presses Back repeatedly
- **THEN** the previous selections and views are restored in reverse order, and Forward retraces them

#### Scenario: Unknown identifier is explicit

- **WHEN** the page is opened at an address naming an identifier the snapshot does not contain
- **THEN** the page names that identifier, states that this snapshot does not contain it, and offers orientation or the artifact list as a way on

### Requirement: Legacy artifact fragments resolve permanently

A bare artifact identifier such as `#FR-SNAPSHOT-002` SHALL resolve to that artifact — the fragment form earlier snapshots produced. This inbound compatibility is permanent: it SHALL NOT be treated as transitional and SHALL NOT be withdrawn once shared links are assumed to have aged out. Newly generated navigation within the page MAY use the current fragment route.

On resolving a legacy fragment, the page SHALL normalize the address to the current route for the same artifact and SHALL do so in place, replacing the current history entry rather than adding one. Pressing Back immediately after arriving on a legacy fragment SHALL leave the snapshot, exactly as it would after arriving on a current-route address.

#### Scenario: Legacy fragment resolves and normalizes in place

- **WHEN** a fragment of the form `#FR-SNAPSHOT-002` produced by an earlier snapshot is opened
- **THEN** it resolves to that artifact and the address becomes the current route without a second history entry appearing

#### Scenario: Back after a legacy arrival leaves the page

- **WHEN** Back is pressed immediately after arriving on a legacy fragment
- **THEN** the reader leaves the snapshot and is not returned to the un-normalized address

#### Scenario: Unknown legacy identifier behaves like any unknown

- **WHEN** a legacy fragment names an identifier the snapshot does not contain
- **THEN** the same explicit unresolved-identifier state is produced as for a current-route address

### Requirement: Authored content never becomes executable

Authored content SHALL NOT be able to become executable or structural, on either path by which it reaches the reader: content emitted as generated markup and content embedded as data the page renders at open time SHALL both be escaped or otherwise neutralized, so authored HTML, script or attribute sequences are displayed as the text the author wrote.

#### Scenario: Hostile body content is displayed as text

- **WHEN** an artifact body containing a script element, an unclosed tag and an attribute-injection fragment is selected and rendered
- **THEN** all of it is displayed verbatim as text, nothing executes and no element is created from it, both on first render and after navigating away and back

#### Scenario: Metadata values are escaped too

- **WHEN** an artifact's frontmatter values contain markup or quote characters
- **THEN** they are displayed as text in the metadata view

### Requirement: The interface is a light, compact, text-first instrument

The generated page SHALL render in a single light appearance, with no dark variant and no theme or appearance control. Body and interface text SHALL use the reader's system sans-serif stack, and artifact identifiers and revision values SHALL render monospaced. Text contrast SHALL be strong; structure SHALL be carried by thin borders, deliberate alignment and consistent spacing rather than elevation or enclosure; controls SHALL be square or low-radius. Colour use SHALL be restrained to one accent plus a stable per-artifact-kind palette that does not change between artifacts, views or regenerations, and colour SHALL NOT be the sole carrier of any meaning. The interface SHALL be compact. The page SHALL NOT use gradients, glass or blur effects, decorative illustration, oversized hero typography, or a rounded-card dashboard treatment of its content.

{pdac:cite id="QR-PRESENTATION-001" digest="sha256:b3b5b1e416251e2c9767240a0df454d662d93da74a9ecd06b6add3b53254665e"}

#### Scenario: One light appearance regardless of environment preference

- **WHEN** the page is opened with a light and then a dark environment preference
- **THEN** it renders identically in its single light appearance, and no theme or appearance control exists anywhere on it

#### Scenario: Typography carries identifiers distinctly

- **WHEN** computed styles are inspected across the orientation view, the artifact list and the artifact detail
- **THEN** prose and interface text use the system sans-serif stack and every artifact identifier and revision value renders monospaced

#### Scenario: Kind colour is stable and never the only signal

- **WHEN** each artifact kind's colour is recorded across the delivered views and across two regenerations from identical content, and the page is then rendered with colour removed
- **THEN** each kind's colour is identical everywhere, one accent colour is used, and kind, status and selection remain determinable without colour

#### Scenario: No decorative treatments

- **WHEN** the rendered page is inspected for gradients, glass or blur effects, decorative illustration, hero-scale typography and rounded-card dashboard treatment
- **THEN** none is present

### Requirement: The delivered surfaces are keyboard-operable and accessible

Every capability of the delivered surfaces SHALL be reachable and operable by keyboard alone — the orientation view, the artifact list, the artifact detail and the view navigation — with no trapped focus and no pointer-only control. The focused element SHALL always be visibly identifiable, and focus SHALL land on a meaningful element after every view and selection change. The page SHALL expose semantic landmarks for its regions and a heading hierarchy without skipped levels. The selected artifact SHALL be reported as current with `aria-current` in the list, and the active view SHALL be reported as current in the page navigation. Every icon-only control SHALL carry an accessible name stating what it does. All text SHALL meet WCAG 2.1 AA contrast. No information a reader needs SHALL require hover or pointer proximity to reveal. Where the reader's environment expresses a reduced-motion preference, no non-essential animation or transition SHALL run.

{pdac:cite id="QR-ACCESSIBILITY-001" digest="sha256:04ff33f829373a868cd6a05a8b818e300441baa8467cd713e1783be83e9ac56b"}

#### Scenario: Whole increment operable by keyboard

- **WHEN** a reader orients, narrows the list, selects an artifact and reads it using only the keyboard
- **THEN** every capability is reachable and activatable, with a visible focus indicator at every stop and deliberate focus placement after each view and selection change

#### Scenario: Structure and current state exposed

- **WHEN** the generated document's landmarks, heading outline and accessible state are inspected
- **THEN** every region has a landmark, no heading level is skipped, the selected artifact reports `aria-current` in the list, and the active view reports as current in the navigation

#### Scenario: Contrast, colour and motion

- **WHEN** every text-and-background pair the delivered stylesheet can produce is measured, the page is rendered with colour removed, and it is opened with a reduced-motion preference set
- **THEN** all text meets WCAG 2.1 AA, no meaning depends on colour alone, no needed information is hover-only, and no non-essential animation runs

### Requirement: The opening document is bounded and interaction is measured

The document rendered when the snapshot opens SHALL NOT grow in proportion to the number of artifacts in the model: its size SHALL be bounded by the artifact kinds present and the kind-level aggregate over them. Artifact content and relationship structure SHALL be carried in the file as data the page renders on demand. Generated file size SHALL grow no worse than linearly with authored content, and generation time no worse than linearly with artifact count.

Artifact-selection latency SHALL be measured on an identified reference environment — named hardware, operating system and browser version — across representative models, and the figures SHALL be recorded. A concrete artifact-selection budget SHALL be established from those recorded figures. No numeric interaction budget SHALL be asserted without a measurement supporting it. Artifacts that are hardest at scale — the longest-titled and longest-bodied — SHALL remain readable at every measured scale.

{pdac:cite id="QR-SCALABILITY-001" digest="sha256:ce964e20dec3fb9facb301afb75ef2026c908a05ea56b11f3de1981522a7dfe1"}

#### Scenario: Opening document does not scale with the model

- **WHEN** the opening document is measured for a small and a materially larger model
- **THEN** it contains no artifact body and no artifact-level graph, and its size does not grow in proportion to artifact count

#### Scenario: Size and generation time stay linear

- **WHEN** generated size per authored byte and generation time per artifact are recorded across representative models
- **THEN** neither ratio increases with model size

#### Scenario: Selection latency is measured, not asserted

- **WHEN** artifact-selection latency is recorded across representative models on the identified reference environment
- **THEN** the figures are reported in full including the slowest cases, and the selection budget is derived from them rather than assumed in advance

#### Scenario: Long content stays readable

- **WHEN** the longest-titled and longest-bodied artifacts are selected at every measured scale
- **THEN** text wraps within its container and the page does not scroll horizontally

### Requirement: Relationships are grouped by type and kind with exact counts

An artifact's relationships SHALL be presented grouped within each direction, by relationship type and by the artifact kind at the other end, rather than as one undifferentiated list. Every group SHALL state the exact number of relationships it contains. Grouping and ordering SHALL be derived from the compiled graph and SHALL be identical for identical model content.

{pdac:cite id="FR-SNAPSHOT-002" digest="sha256:1be502387698dc60b2610b02c9ae99bf8ee10c196034a9049e0995cf1145beff"}

#### Scenario: Neighbours arrive grouped, not spilled

- **WHEN** a reader selects an artifact that declares several relationships of different types
- **THEN** its relationships appear in groups labelled by relationship type and by the artifact kind at the other end, each stating how many relationships it contains

#### Scenario: Counts are faithful to the compiled graph

- **WHEN** the groups shown for an artifact are compared with the relationships the compiled graph records for it
- **THEN** the group counts sum to exactly that artifact's relationships in that direction, with none missing and none invented

#### Scenario: Grouping is deterministic

- **WHEN** two snapshots are generated from identical model content
- **THEN** the same artifact's groups appear in the same order with the same members

### Requirement: Large relationship groups start collapsed and expand on request

A relationship group large enough to overwhelm the view SHALL start collapsed, showing its exact count rather than its members, and SHALL reveal its members only when the reader expands it. Expansion SHALL be operable by keyboard, and the collapsed or expanded state SHALL be exposed to assistive technology as state rather than conveyed only by appearance. A group small enough to read at a glance SHALL be shown expanded, so nothing is hidden without reason.

{pdac:cite id="FR-SNAPSHOT-002" digest="sha256:1be502387698dc60b2610b02c9ae99bf8ee10c196034a9049e0995cf1145beff"}

#### Scenario: A high-degree artifact stays readable

- **WHEN** a reader selects the most connected artifact in the model
- **THEN** its neighbours appear as counted groups, the large ones collapsed, and nothing expands until the reader expands it

#### Scenario: Expanding reveals exactly what was counted

- **WHEN** the reader expands a collapsed group that reported a count
- **THEN** exactly that many related artifacts are revealed, each selectable in one step

#### Scenario: Expansion is keyboard-operable and exposed as state

- **WHEN** the reader reaches a collapsed group by keyboard and activates it
- **THEN** it expands, and its expanded state is reported to assistive technology

### Requirement: A complete non-visual relationship list is always available

Every incoming and outgoing relationship of the selected artifact SHALL be readable as text, with its relationship type and its direction, without requiring any visualization. This list SHALL be complete: no relationship the compiled graph records for the artifact may be reachable only through a drawing.

#### Scenario: Relationships are understandable with no graph

- **WHEN** a reader who cannot or does not use a visualization selects an artifact
- **THEN** every relationship in both directions is readable as text, with type and direction, and each related artifact is selectable

#### Scenario: Absence is reported rather than left blank

- **WHEN** the selected artifact has no relationships in a direction
- **THEN** that direction states that there are none

### Requirement: The focused neighbourhood orbits relationship groups around the selected artifact

The focused neighbourhood SHALL anchor on the page's selected artifact and show one hop. What surrounds the anchor SHALL be the artifact's relationship groups rather than its individual artifacts: each satellite SHALL state the artifact kind at the other end and the exact number of relationships it represents, and the relationship type SHALL annotate the line connecting it to the anchor. Incoming and outgoing groups SHALL occupy opposite sides of the anchor, so direction is carried by position and remains determinable with colour removed.

The arrangement SHALL be re-allocated whenever a group is opened or closed, so that an opened group is given the room its members need. No satellite, member or label SHALL overlap another, and nothing SHALL be placed outside the visible canvas, at any combination of open and closed groups. A group small enough to read at a glance SHALL arrive already open.

Activating a group SHALL expand or collapse it and SHALL NOT change the selected artifact; activating a member SHALL select that artifact. Both SHALL be operable by keyboard, and expanded state SHALL be exposed to assistive technology as state.

The projection SHALL support panning, zooming and returning to a fitted view, each operable by pointer and by keyboard. Pan and zoom are reader state and SHALL NOT be persisted anywhere.

A satellite or member SHALL reveal its identity on hover, and SHALL reveal the same on keyboard focus, so nothing needed is available only to a pointer. The equivalent relationship list SHALL remain available whether or not this projection is used.

Placement SHALL remain a pure function of the model and of which groups are open: identical model content with identical groups open SHALL produce an identical arrangement.

{pdac:cite id="FR-SNAPSHOT-009" digest="sha256:ab9721cb7fb71a07fa8a48789379024ecd0eeda9122267329ee3dcbc20718ff7"}

{pdac:cite id="TERM-FOCUSED-TOPOLOGY" digest="sha256:0078e5754fc215a6bdde6b601ac543c391491356666cc36265c26e83fa134595"}

#### Scenario: Groups orbit, not artifacts

- **WHEN** the reader opens the focused neighbourhood for an artifact with several relationship types
- **THEN** one satellite appears per relationship type and other-end kind, each stating its exact count, with the relationship type labelling the line rather than the node

#### Scenario: Expanding re-organises rather than colliding

- **WHEN** the reader expands a group large enough that its members would not fit its previous sector
- **THEN** the arrangement is re-allocated so the expanded group has room, and no satellite, member or label overlaps another

#### Scenario: Nothing is drawn off-canvas

- **WHEN** every group of the most connected artifact in the model is expanded
- **THEN** every satellite, member and label remains inside the visible canvas

#### Scenario: Collapsing returns the room

- **WHEN** the reader collapses a group they had expanded
- **THEN** the arrangement returns to what it was before the group was opened

#### Scenario: The canvas can be navigated

- **WHEN** the reader drags, scrolls or uses the zoom and fit controls, and then does the same with the arrow keys, plus, minus and zero
- **THEN** the view pans, zooms and returns to a fitted view by either means

#### Scenario: The hardest artifact stays legible

- **WHEN** the reader opens the focused neighbourhood for the most connected artifact in the model
- **THEN** the projection shows one satellite per group rather than one node per relationship, and its size tracks the number of relationship types rather than the artifact's degree

#### Scenario: Direction is positional

- **WHEN** an artifact has both incoming and outgoing relationships, and the projection is viewed with colour removed
- **THEN** incoming and outgoing groups remain distinguishable by which side of the anchor they occupy

#### Scenario: The two gestures do different things

- **WHEN** the reader activates a group, and then activates one of its members
- **THEN** the group expands or collapses without changing the selected artifact, and the member becomes the selected artifact

#### Scenario: Nothing is pointer-only

- **WHEN** the reader moves through satellites and members by keyboard
- **THEN** each reveals the same identity that hovering it reveals

### Requirement: The active graph mode is part of the addressable state

The active projection SHALL be represented in the address, so a projection view is directly linkable and is restored by browser Back and Forward alongside the selected artifact.

{pdac:cite id="FR-SNAPSHOT-006" digest="sha256:fa9fc4a9dffadd15a95838034bdeac21922756c93217d53dbce2f4b5ebc000f5"}

#### Scenario: A projection view is linkable

- **WHEN** the reader opens a projection and copies the address
- **THEN** opening that address restores the same projection and the same selected artifact

#### Scenario: Back restores the previous projection

- **WHEN** the reader moves between projections and presses Back
- **THEN** the previous projection and selection are restored

### Requirement: Catalog discovery state is addressable and preserved

The catalog's active query and filters SHALL be part of the page address, serialized in a fixed order so identical states produce identical addresses. Filter and query changes SHALL re-address the page in place without adding history entries. Opening an artifact from the catalog SHALL preserve the active state, and returning SHALL resume it. Filters SHALL exist only for canonical fields — artifact type, status, and bounded context where the model declares one.

{pdac:cite id="FR-SNAPSHOT-008" digest="sha256:6cd3c6602a3a0dacac6a65ef7c15485f9bc635cd30db986f5565ce684a7d43cd"}

#### Scenario: A discovery is shareable

- **WHEN** a query-and-filter state's address is opened in a fresh window from local disk
- **THEN** the same result set appears in the same order and the controls reflect the state

#### Scenario: Open and return resumes

- **WHEN** a reader opens a result from a narrowed catalog and navigates back to the list
- **THEN** the query, filters and result set are as they were left

#### Scenario: Filtering never floods history

- **WHEN** several filters and a query are changed in sequence
- **THEN** the address reflects each state and the history length is unchanged

### Requirement: The orientation view offers family entry points and global search

Each artifact kind on the orientation view SHALL be an entry point into the catalog narrowed to that family, and a global search control SHALL be available on the first screen, landing in the catalog with the query live.

{pdac:cite id="FR-SNAPSHOT-003" digest="sha256:279494d0984f61be58192dd8a11f7b452c4fb706436ea14a6c41b6167f2aaac7"}

#### Scenario: Family entry

- **WHEN** a kind is selected on the orientation view
- **THEN** the catalog opens filtered to that kind, with the filter control reflecting it

#### Scenario: Search from the first screen

- **WHEN** a query is submitted from the orientation view's search control
- **THEN** the catalog opens with that query active and its results displayed

### Requirement: The Reader preserves and names navigation context

Relationship links on the artifact detail SHALL carry the active catalog state, so following an edge preserves the discovery in progress. The detail SHALL name the discovery it returns to — the active kind, status, context, filter and query — visibly and retraceably in one step; without an active discovery it SHALL offer the full catalog.

{pdac:cite id="FR-SNAPSHOT-002" digest="sha256:1be502387698dc60b2610b02c9ae99bf8ee10c196034a9049e0995cf1145beff"}

#### Scenario: Following an edge keeps the discovery

- **WHEN** a reader with an active query and filters follows a relationship link
- **THEN** the address of the target artifact carries the same catalog state

#### Scenario: The way back is named

- **WHEN** an artifact is read during an active discovery
- **THEN** the detail names that discovery and returning resumes it exactly
