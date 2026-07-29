## Purpose

Specify the generation of the Product Snapshot: a static, self-contained, read-only HTML page
projecting the whole product model for people without the repository, produced by
`prodshape graph --format html` — self-containment, determinism, revision stamping, honest
diagnostics, and readable by-kind rendering with status badges.

## Requirements

### Requirement: HTML is an output format of the graph command

The system SHALL generate a Product Snapshot when the graph command is invoked with the HTML
format (`prodshape graph --format html`). Generation SHALL produce exactly one self-contained
HTML file under the generated-output area and SHALL report the output path. Generation SHALL
never modify any authored file.

#### Scenario: Engineer generates a snapshot

- **WHEN** an engineer runs `prodshape graph --format html` in a repository with a valid product model
- **THEN** exactly one HTML file is written under the generated-output area and its path is reported

#### Scenario: Generation is read-only towards the model

- **WHEN** a snapshot is generated
- **THEN** no file under the product model directory is created, modified or deleted

### Requirement: The snapshot is one self-contained file

The generated page SHALL function completely when opened from local disk with no server and no
network access: no external scripts, styles, fonts, images or data are referenced. All CSS and
any data the page needs SHALL be embedded in the single file.

#### Scenario: Offline open from local disk

- **WHEN** the generated file is opened in a browser from `file://` with networking disabled
- **THEN** every capability of the page works and no network request is attempted

#### Scenario: No external references in the output

- **WHEN** the generated HTML is inspected
- **THEN** it contains no `http(s)://` resource references required for rendering

### Requirement: Every artifact is rendered, organized by kind, with a status badge

The single generated file SHALL contain every product artifact — its frontmatter, its authored body
and its status — completely, so nothing a reader can reach is missing and nothing is fetched later.
The page SHALL render **exactly one** artifact detail at a time: when an artifact is selected, its
title, ID, kind, status and remaining metadata are shown together with its authored Markdown rendered
with the original heading hierarchy, and no other artifact's content SHALL be present in the document
alongside it. Artifacts SHALL be reachable by kind through a list that can be narrowed by filters,
and every artifact of the model SHALL be selectable from it. Each artifact's status SHALL be
displayed. On viewports too narrow for a side-by-side arrangement, the list and the detail SHALL
become distinct navigable states rather than a scaled-down desktop layout.

Completeness is a property of the file, not of the display: all artifacts are embedded, and none but
the selected one is rendered.

#### Scenario: Browse by kind and select one artifact

- **WHEN** a reader opens the snapshot, narrows the list to a kind and selects one artifact
- **THEN** that artifact's metadata and authored body are rendered with the author's heading
  structure, and inspecting the document confirms no other artifact's body is present

#### Scenario: Every artifact remains reachable

- **WHEN** a reader walks the list across every kind
- **THEN** each artifact of the model can be selected, and the file contains every artifact's content
  whether or not it has been displayed

#### Scenario: Status is visible

- **WHEN** a reader views any artifact
- **THEN** the artifact's status is displayed visibly, and a draft artifact is distinguishable from an
  active one

#### Scenario: Narrow viewport separates list and detail

- **WHEN** the page is opened at a viewport width too narrow for a side-by-side arrangement
- **THEN** the list and the artifact detail are usable as separate navigable states with no horizontal
  page scrolling

### Requirement: The source revision is stamped on the page

The page SHALL display the source revision of the model it was generated from, placed where a
reader finds it without searching.

#### Scenario: Reader checks currency

- **WHEN** a reader opens the snapshot
- **THEN** the model's source revision is visible on the page without scrolling into artifact content

### Requirement: Generation is deterministic

Identical model content SHALL yield a byte-identical HTML file across runs and platforms. Output
SHALL NOT embed timestamps, random values, or environment-dependent content; artifact ordering
SHALL be stable; line endings SHALL be normalized.

#### Scenario: Double generation is byte-identical

- **WHEN** the snapshot is generated twice from the same commit
- **THEN** the two files are byte-identical

#### Scenario: Cross-platform stability

- **WHEN** the snapshot is generated from the same content on different platforms
- **THEN** the files are byte-identical

### Requirement: Generation reports honest diagnostics

When artifacts cannot be parsed, generation SHALL report diagnostics naming each affected file
and SHALL NOT emit a snapshot that silently omits part of the model.

#### Scenario: Unparseable artifact blocks silent omission

- **WHEN** one artifact file is unparseable and generation is attempted
- **THEN** a diagnostic names the file and no snapshot lacking the artifact is emitted silently

### Requirement: The page is read-only

The page SHALL offer no capability to create, edit, annotate or approve anything: no forms, no
editable fields, no controls that mutate state beyond client-side presentation. The page SHALL NOT
persist anything outside the address of the current view: no browser storage, no cookies, no session,
no durable store of any kind. Accepting a filter selection or a selected artifact is presentation
state, not input that becomes product knowledge.

#### Scenario: No mutating controls

- **WHEN** the generated page is inspected and exercised
- **THEN** nothing on it accepts input that creates, edits or approves product knowledge

#### Scenario: Nothing is persisted

- **WHEN** a reader explores the page and browser storage and cookies are then inspected
- **THEN** the snapshot has written nothing, and reloading restores only what the address encodes

### Requirement: Relationships are navigable in both directions

On an artifact's rendered view, every reference to another artifact SHALL be a link that
navigates to the referenced artifact — both the relationships the artifact's frontmatter declares
(outgoing) and the derived reverse views computed from the rest of the model (incoming,
"referenced by"). The reader SHALL NOT need to know which side authored the edge.

#### Scenario: Outgoing reference is a link

- **WHEN** a reader views a use case that declares a governing business rule
- **THEN** the rule's mention is a link that navigates to the rule's rendered view

#### Scenario: Derived incoming reference is a link

- **WHEN** a reader views a use case from which a functional requirement derives
- **THEN** the requirement appears in a "referenced by" view as a link, although no authored
  file states that edge on the use case

### Requirement: Graph visualization with node-selection highlighting

The whole-model graph visualization SHALL NOT be part of the page's opening view and SHALL be reached
only when the reader explicitly asks for it. Where it is present it SHALL continue to convey the
model's shape, and selecting a node SHALL show or highlight that artifact's relationships and provide
navigation to the artifact.

#### Scenario: Not rendered in the opening view

- **WHEN** the snapshot is opened and the opening document is inspected
- **THEN** no artifact-level graph is present — no projection in which individual artifacts appear as
  nodes

#### Scenario: Reached explicitly

- **WHEN** the reader asks for the whole-model visualization
- **THEN** it is presented, and selecting a node highlights that artifact's relationships and offers
  navigation to it

### Requirement: Offline client-side search

The page SHALL provide search over artifact IDs, titles and body content, working entirely
client-side with no network access, from the same single self-contained file.

#### Scenario: Search by ID, title and content offline

- **WHEN** the browser is offline and the reader searches for an artifact's ID, a word from its
  title, or a term from its body
- **THEN** the matching artifacts are returned as navigable results

### Requirement: Navigation additions preserve the generation contract

The embedded script and data serving navigation, visualization and search SHALL be part of the
single self-contained file, SHALL reference no external resources, SHALL offer no capability to
create, edit, annotate or approve anything, and SHALL preserve deterministic generation:
identical model content still yields a byte-identical file.

#### Scenario: Still one deterministic self-contained file

- **WHEN** the snapshot is generated twice from identical model content
- **THEN** the two files are byte-identical, and the page functions fully from local disk with
  networking disabled

#### Scenario: Still read-only

- **WHEN** the page's interactive features are exercised
- **THEN** nothing creates, edits or approves product knowledge; interactivity is limited to
  presentation

### Requirement: The snapshot opens in an orientation view

The page SHALL open in an orientation view whose purpose is to convey the shape of the product, and
which SHALL render no artifact's authored content and no artifact-level graph. It SHALL expose the
product's identity and the source revision, the total number of artifacts and of relationships, the
number of artifacts of each kind present with an entry point into each kind, a plain-language
statement that the page is a generated read-only projection that is never authoritative, and a
kind-level aggregate of the relationships.

The orientation view MAY report the artifacts that hold no relationships, stating the exact count and
their identities as entry points. Where it does, it SHALL present this as derived topology only: no
warning or error presentation, no severity, no scoring, no health or completeness indication, and no
vocabulary such as "orphaned", "dangling", "unused" or "missing".

Everything displayed SHALL be derived from the compiled model. The orientation view SHALL NOT assert
importance, centrality, health, completeness, quality, ownership, ranking, ordering or lifecycle
progression that the model does not record. It SHALL describe only the artifact kinds the model
actually contains.

#### Scenario: Oriented before reading anything

- **WHEN** a reader opens the snapshot for the first time
- **THEN** the product identity, source revision, artifact and relationship totals, counts by kind
  with entry points, and the generated read-only statement are present, and no artifact body and no
  artifact-level graph is rendered

#### Scenario: Counts match the compiled graph

- **WHEN** the orientation view's totals and per-kind counts are compared with `prodshape graph`
  output for the same model
- **THEN** they match exactly

#### Scenario: Unconnected artifacts reported neutrally

- **WHEN** the model contains artifacts with no relationships and the orientation view reports them
- **THEN** the exact count and their identities are shown as entry points, with no warning styling, no
  severity, no score and no vocabulary suggesting a defect

#### Scenario: No fabricated conclusions

- **WHEN** the orientation view is inspected for claims beyond identity, revision, counts, entry
  points, the projection statement and the kind-level aggregate
- **THEN** no artifact is described as important, central, healthy, complete, owned, ranked or ordered
  by anything the model does not record

#### Scenario: Only the kinds present are described

- **WHEN** a snapshot is generated from a model containing only some artifact kinds
- **THEN** the orientation view describes those kinds and does not mention or zero-fill the others

### Requirement: Kind-level relationship aggregate

The page SHALL provide a kind-level aggregate projection: the model's artifacts and relationships
grouped by artifact kind and relationship type, with exact counts, communicating composition and
traceability without rendering individual artifacts. It SHALL display nothing absent from the
compiled graph, SHALL imply no importance, health, ownership or ordering, and SHALL be arranged
identically for identical model content.

#### Scenario: Composition and traceability without artifacts

- **WHEN** a reader opens the kind-level aggregate
- **THEN** which kinds relate to which, by relationship type, and how many relationships each
  combination holds are readable, with no individual artifact rendered

#### Scenario: Aggregate counts are faithful

- **WHEN** the aggregate is compared with the compiled graph
- **THEN** every combination and count corresponds to relationships the graph records, and none is
  invented

#### Scenario: Deterministic aggregate

- **WHEN** two snapshots are generated from identical model content on different platforms
- **THEN** the aggregate's arrangement is identical

### Requirement: One selected artifact addressed by the URL fragment

The page SHALL hold exactly one selected artifact at a time, shared by every part of the page, and
exactly one navigation mechanism SHALL own state transitions. No part of the page may change the
selected artifact or the active view without that mechanism, and the address SHALL always reflect the
state the page is in. The addressable state SHALL represent at least the active view and the selected
artifact's identifier, using the URL fragment so it behaves identically from `file://` and from
ordinary static hosting, with no server-side routing and no request at navigation time.

Opening the page at an address naming an artifact SHALL open on that artifact. Browser Back and
Forward SHALL restore previously visited views and selections. An address naming an artifact the
snapshot does not contain SHALL produce an explicit state naming the identifier it could not resolve
and offering a way to continue exploring.

#### Scenario: Selection is shared and addressable

- **WHEN** a reader selects an artifact from the list
- **THEN** it becomes the page's single selected artifact, every surface showing it reflects that, and
  the address changes to match

#### Scenario: Direct artifact link from local disk and from hosting

- **WHEN** the address of a selected artifact is opened in a new window from local disk with
  networking disabled, and again from a static web server
- **THEN** both resolve to the same artifact in the same view, with no server configuration and no
  request beyond the file itself

#### Scenario: Back and Forward restore exploration

- **WHEN** a reader visits several artifacts and views and then presses Back repeatedly
- **THEN** the previous selections and views are restored in reverse order, and Forward retraces them

#### Scenario: Unknown identifier is explicit

- **WHEN** the page is opened at an address naming an identifier the snapshot does not contain
- **THEN** the page names that identifier, states that this snapshot does not contain it, and offers
  orientation or the artifact list as a way on

### Requirement: Legacy artifact fragments resolve permanently

A bare artifact identifier such as `#FR-SNAPSHOT-002` SHALL resolve to that artifact — the fragment
form earlier snapshots produced. This inbound compatibility is permanent: it SHALL NOT be treated as
transitional and SHALL NOT be withdrawn once shared links are assumed to have aged out. Newly
generated navigation within the page MAY use the current fragment route.

On resolving a legacy fragment, the page SHALL normalize the address to the current route for the same
artifact and SHALL do so in place, replacing the current history entry rather than adding one.
Pressing Back immediately after arriving on a legacy fragment SHALL leave the snapshot, exactly as it
would after arriving on a current-route address.

#### Scenario: Legacy fragment resolves and normalizes in place

- **WHEN** a fragment of the form `#FR-SNAPSHOT-002` produced by an earlier snapshot is opened
- **THEN** it resolves to that artifact and the address becomes the current route without a second
  history entry appearing

#### Scenario: Back after a legacy arrival leaves the page

- **WHEN** Back is pressed immediately after arriving on a legacy fragment
- **THEN** the reader leaves the snapshot and is not returned to the un-normalized address

#### Scenario: Unknown legacy identifier behaves like any unknown

- **WHEN** a legacy fragment names an identifier the snapshot does not contain
- **THEN** the same explicit unresolved-identifier state is produced as for a current-route address

### Requirement: Authored content never becomes executable

Authored content SHALL NOT be able to become executable or structural, on either path by which it
reaches the reader: content emitted as generated markup and content embedded as data the page renders
at open time SHALL both be escaped or otherwise neutralized, so authored HTML, script or attribute
sequences are displayed as the text the author wrote.

#### Scenario: Hostile body content is displayed as text

- **WHEN** an artifact body containing a script element, an unclosed tag and an attribute-injection
  fragment is selected and rendered
- **THEN** all of it is displayed verbatim as text, nothing executes and no element is created from it,
  both on first render and after navigating away and back

#### Scenario: Metadata values are escaped too

- **WHEN** an artifact's frontmatter values contain markup or quote characters
- **THEN** they are displayed as text in the metadata view

### Requirement: The interface is a light, compact, text-first instrument

The generated page SHALL render in a single light appearance, with no dark variant and no theme or
appearance control. Body and interface text SHALL use the reader's system sans-serif stack, and
artifact identifiers and revision values SHALL render monospaced. Text contrast SHALL be strong;
structure SHALL be carried by thin borders, deliberate alignment and consistent spacing rather than
elevation or enclosure; controls SHALL be square or low-radius. Colour use SHALL be restrained to one
accent plus a stable per-artifact-kind palette that does not change between artifacts, views or
regenerations, and colour SHALL NOT be the sole carrier of any meaning. The interface SHALL be
compact. The page SHALL NOT use gradients, glass or blur effects, decorative illustration, oversized
hero typography, or a rounded-card dashboard treatment of its content.

#### Scenario: One light appearance regardless of environment preference

- **WHEN** the page is opened with a light and then a dark environment preference
- **THEN** it renders identically in its single light appearance, and no theme or appearance control
  exists anywhere on it

#### Scenario: Typography carries identifiers distinctly

- **WHEN** computed styles are inspected across the orientation view, the artifact list and the
  artifact detail
- **THEN** prose and interface text use the system sans-serif stack and every artifact identifier and
  revision value renders monospaced

#### Scenario: Kind colour is stable and never the only signal

- **WHEN** each artifact kind's colour is recorded across the delivered views and across two
  regenerations from identical content, and the page is then rendered with colour removed
- **THEN** each kind's colour is identical everywhere, one accent colour is used, and kind, status and
  selection remain determinable without colour

#### Scenario: No decorative treatments

- **WHEN** the rendered page is inspected for gradients, glass or blur effects, decorative
  illustration, hero-scale typography and rounded-card dashboard treatment
- **THEN** none is present

### Requirement: The delivered surfaces are keyboard-operable and accessible

Every capability of the delivered surfaces SHALL be reachable and operable by keyboard alone — the
orientation view, the artifact list, the artifact detail and the view navigation — with no trapped
focus and no pointer-only control. The focused element SHALL always be visibly identifiable, and focus
SHALL land
on a meaningful element after every view and selection change. The page SHALL expose semantic
landmarks for its regions and a heading hierarchy without skipped levels. The selected artifact SHALL
be reported as current with `aria-current` in the list, and the active view SHALL be reported as
current in the page navigation. Every icon-only control SHALL carry an accessible name stating what it
does. All text SHALL meet WCAG 2.1 AA contrast. No information a reader needs SHALL require hover or
pointer proximity to reveal. Where the reader's environment expresses a reduced-motion preference, no
non-essential animation or transition SHALL run.

#### Scenario: Whole increment operable by keyboard

- **WHEN** a reader orients, narrows the list, selects an artifact and reads it using only the keyboard
- **THEN** every capability is reachable and activatable, with a visible focus indicator at every stop
  and deliberate focus placement after each view and selection change

#### Scenario: Structure and current state exposed

- **WHEN** the generated document's landmarks, heading outline and accessible state are inspected
- **THEN** every region has a landmark, no heading level is skipped, the selected artifact reports
  `aria-current` in the list, and the active view reports as current in the navigation

#### Scenario: Contrast, colour and motion

- **WHEN** every text-and-background pair the delivered stylesheet can produce is measured, the page is
  rendered with colour removed, and it is opened with a reduced-motion preference set
- **THEN** all text meets WCAG 2.1 AA, no meaning depends on colour alone, no needed information is
  hover-only, and no non-essential animation runs

### Requirement: The opening document is bounded and interaction is measured

The document rendered when the snapshot opens SHALL NOT grow in proportion to the number of artifacts
in the model: its size SHALL be bounded by the artifact kinds present and the kind-level aggregate
over them. Artifact content and relationship structure SHALL be carried in the file as data the page
renders on demand. Generated file size SHALL grow no worse than linearly with authored content, and
generation time no worse than linearly with artifact count.

Artifact-selection latency SHALL be measured on an identified reference environment — named hardware,
operating system and browser version — across representative models, and the figures SHALL be
recorded. A concrete artifact-selection budget SHALL be established from those recorded figures. No
numeric interaction budget SHALL be asserted without a measurement supporting it. Artifacts that are
hardest at scale — the longest-titled and longest-bodied — SHALL remain readable at every measured
scale.

#### Scenario: Opening document does not scale with the model

- **WHEN** the opening document is measured for a small and a materially larger model
- **THEN** it contains no artifact body and no artifact-level graph, and its size does not grow in
  proportion to artifact count

#### Scenario: Size and generation time stay linear

- **WHEN** generated size per authored byte and generation time per artifact are recorded across
  representative models
- **THEN** neither ratio increases with model size

#### Scenario: Selection latency is measured, not asserted

- **WHEN** artifact-selection latency is recorded across representative models on the identified
  reference environment
- **THEN** the figures are reported in full including the slowest cases, and the selection budget is
  derived from them rather than assumed in advance

#### Scenario: Long content stays readable

- **WHEN** the longest-titled and longest-bodied artifacts are selected at every measured scale
- **THEN** text wraps within its container and the page does not scroll horizontally

### Requirement: Relationships are grouped by type and kind with exact counts

An artifact's relationships SHALL be presented grouped within each direction, by relationship type and
by the artifact kind at the other end, rather than as one undifferentiated list. Every group SHALL
state the exact number of relationships it contains. Grouping and ordering SHALL be derived from the
compiled graph and SHALL be identical for identical model content.

#### Scenario: Neighbours arrive grouped, not spilled

- **WHEN** a reader selects an artifact that declares several relationships of different types
- **THEN** its relationships appear in groups labelled by relationship type and by the artifact kind at
  the other end, each stating how many relationships it contains

#### Scenario: Counts are faithful to the compiled graph

- **WHEN** the groups shown for an artifact are compared with the relationships the compiled graph
  records for it
- **THEN** the group counts sum to exactly that artifact's relationships in that direction, with none
  missing and none invented

#### Scenario: Grouping is deterministic

- **WHEN** two snapshots are generated from identical model content
- **THEN** the same artifact's groups appear in the same order with the same members

### Requirement: Large relationship groups start collapsed and expand on request

A relationship group large enough to overwhelm the view SHALL start collapsed, showing its exact count
rather than its members, and SHALL reveal its members only when the reader expands it. Expansion SHALL
be operable by keyboard, and the collapsed or expanded state SHALL be exposed to assistive technology
as state rather than conveyed only by appearance. A group small enough to read at a glance SHALL be
shown expanded, so nothing is hidden without reason.

#### Scenario: A high-degree artifact stays readable

- **WHEN** a reader selects the most connected artifact in the model
- **THEN** its neighbours appear as counted groups, the large ones collapsed, and nothing expands until
  the reader expands it

#### Scenario: Expanding reveals exactly what was counted

- **WHEN** the reader expands a collapsed group that reported a count
- **THEN** exactly that many related artifacts are revealed, each selectable in one step

#### Scenario: Expansion is keyboard-operable and exposed as state

- **WHEN** the reader reaches a collapsed group by keyboard and activates it
- **THEN** it expands, and its expanded state is reported to assistive technology

### Requirement: A complete non-visual relationship list is always available

Every incoming and outgoing relationship of the selected artifact SHALL be readable as text, with its
relationship type and its direction, without requiring any visualization. This list SHALL be complete:
no relationship the compiled graph records for the artifact may be reachable only through a drawing.

#### Scenario: Relationships are understandable with no graph

- **WHEN** a reader who cannot or does not use a visualization selects an artifact
- **THEN** every relationship in both directions is readable as text, with type and direction, and each
  related artifact is selectable

#### Scenario: Absence is reported rather than left blank

- **WHEN** the selected artifact has no relationships in a direction
- **THEN** that direction states that there are none
