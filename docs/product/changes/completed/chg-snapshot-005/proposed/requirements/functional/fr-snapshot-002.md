---
id: FR-SNAPSHOT-002
type: functional-requirement
title: Read one artifact at a time in the snapshot
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
  - BR-RELATIONSHIPS-001
verification:
  - scenario: Exactly one artifact detail is active at a time and no other artifact's content is present in the document alongside it
  - scenario: Artifacts are reachable by kind through a searchable, filterable list, and every artifact in the model can be selected from it
  - scenario: The list groups artifacts by kind in groups the reader can open and close; the group holding the selected artifact is open, is marked as holding it by more than colour, and keeps the selected entry in view
  - scenario: The master area can be collapsed to a compact rail of the artifact kinds that still marks the selected artifact's kind, and is restored in one step
  - scenario: A selected artifact shows its title, ID, kind, status and remaining metadata, and its authored Markdown with the original heading hierarchy
  - scenario: Declared references and derived reverse references appear as separately labelled groups by relationship meaning, each naming the relationship type and its direction where direction matters
  - scenario: Every relationship group exposes its complete count, groups large enough to overwhelm the reading start collapsed with that count, and nothing collapsed is silently omitted
  - scenario: Every related artifact appears with its title and stable identifier and can become the new focus in one step
  - scenario: Every identifier of an artifact the model contains, where it appears in the selected artifact's metadata or authored content, is a link that makes that artifact the new focus, and the authored text is otherwise displayed unchanged
  - scenario: The Reader offers the previous and next artifact of the current list in one step each, and states the selected artifact's position within its kind
  - scenario: The reader's navigation context — how they arrived — remains visible and retraceable from the Reader
  - scenario: Every artifact and every relationship in the compiled model is reachable, including artifacts with no relationships
  - scenario: On a narrow viewport the list and the detail become separate navigable states rather than a compressed desktop layout
  - scenario: Authored content containing HTML tags, script tags, quotes and brackets is displayed as text and never parsed as markup or executed, whether rendered from markup or from embedded data
  - scenario: Nothing in the page creates, edits, annotates, approves or persists anything
---

## Requirement

The Product Snapshot MUST present artifacts through the Artifact Reader: a master–detail arrangement with exactly one active artifact detail at any moment. The master area MUST let a reader reach any artifact in the model by kind, by search and by filter, and MUST show which artifact is currently selected in a way that persists while the reader works. It MUST group the artifacts by kind in groups the reader can open and close; the group holding the selected artifact MUST be open, MUST be marked as holding it by more than colour, and MUST keep the selected entry in view whenever the selection moves. The reader MUST be able to collapse the master area to a compact rail of the artifact kinds, which still marks the selected artifact's kind and opens the master area on any kind in one step, and to restore it in one step, so the Reader and the projection can take the room. The selected artifact MUST dominate the detail: its title, stable identifier, kind, status and remaining declared metadata, and its authored Markdown rendered with the heading hierarchy the author wrote.

The detail MUST present the artifact's canonical relationships grouped by their actual meaning — the relationship type — in both directions, kept apart: the references the artifact's own frontmatter declares, and the derived reverse references computed from the rest of the model. Each group MUST name the relationship type, MUST distinguish incoming from outgoing where direction matters, and MUST expose its complete count. A group large enough to overwhelm the reading MUST start collapsed, showing that complete count, and MUST expand only when the reader asks: collapsed content is never silently omitted. Each entry MUST carry the related artifact's title and stable identifier, and any related artifact MUST be able to become the new focus in one step. Wherever the selected artifact's metadata or authored content names an artifact the model contains by its identifier, that identifier MUST be a link that makes the named artifact the new focus; the authored text around it MUST be displayed exactly as written, and an identifier the model does not contain MUST remain plain text. The Reader MUST offer the previous and the next artifact of the current list — the list as the active filters shape it — in one step each, and MUST state the selected artifact's position within its kind. No artifact's content other than the selected artifact's MAY be present in the active document.

The reader's navigation context MUST survive reading: how they arrived — the discovery or the artifact they came from — remains visible and retraceable from the Reader, consistent with the addressing and history behaviour FR-SNAPSHOT-006 defines. The model MUST be navigable as a graph through the Reader alone, without requiring any visual projection.

Every artifact and every relationship in the compiled model MUST be reachable through the page. Artifacts with no relationships MUST be reachable and readable, and MUST report the absence of relationships in both directions rather than appearing incomplete. Every artifact MUST display its status.

On viewports too narrow for a side-by-side arrangement, the master and detail MUST become distinct navigable states rather than a scaled-down desktop layout.

Authored content MUST NOT be able to become executable or structural: content that reaches the page as rendered markup and content that reaches it as embedded data the page renders at open time MUST both be escaped or otherwise neutralized so that authored HTML, script or attribute sequences are displayed as the text the author wrote. The page MUST offer no capability to create, edit, annotate or approve anything, and MUST NOT persist anything a reader does outside the address of the current view.

## Rationale

The relationships are the methodology: a pile of rendered documents would communicate less than the repository already does, because the graph — who serves whom, what governs what, what derives from what — is where the product's coherence lives. But relationships only become legible relative to something selected, and a document containing every artifact's body has nothing selected. One active artifact is what makes "these are its incoming relationships" a meaningful statement rather than a section heading in a very long report.

Identifiers are how artifacts cite one another in prose as well as in frontmatter. An identifier the reader can see but not follow sends them back to search for something the page already knows; making every known identifier a link turns the authored text itself into part of the graph, without changing a character of it. Grouping the list by kind with the selected group open and marked keeps the reader's place visible in a long model, and a collapsible master area lets the reading surfaces take the room once the reader has found what they came for.

Keeping declared and derived references apart is the snapshot's core value: the authored files never state the reverse direction, and the reader must be able to tell which side authored the edge because that distinction tells them where to go to change it. Complete counts are what make the groups honest at scale — a heavily connected artifact is better served by "governed-by: 6 use cases" with the option to open it than by an unreadable spill, and the exact count is what keeps the collapsed state from hiding anything. Titles and identifiers together are what make an entry both recognizable to a person and quotable in a conversation.

The Reader carrying the whole graph as text is a deliberate load-bearing decision: it is what lets every visual projection be an accelerator rather than a gatekeeper, and what keeps the model navigable for every reader on every device. Navigation context surviving the read is what turns a lookup into an exploration — a reader who loses their place every time they open something will stop opening things.

Escaping is stated explicitly and on both channels because progressive disclosure changes the threat: when artifact bodies live in the file as data and become DOM at open time, the escaping that protects generated markup does not automatically protect the rendering path. Product definitions contain code fences, tag names and quoted examples as a matter of course; the snapshot travels outside the repository, so an authored string must never be able to act on its reader.

## Acceptance Scenarios

- A reader opens the snapshot, filters to a kind, selects one artifact and reads the same knowledge the authored file carries, with the author's section structure intact. Inspecting the document confirms no other artifact's body is present.
- From a use case, the reader sees its governing rules under the declared group and the requirements deriving from it under the derived group, each group counted, each entry showing title and identifier, and lands on either in one step — never needing to know which side authored the edge.
- The most connected artifact in the model is selected: its groups are counted rather than spilled, large groups start collapsed showing their complete counts, and expanding one changes nothing else silently.
- A reader follows a relationship into another kind: the list opens that kind's group, marks it as holding the selection, and scrolls the selected entry into view. The reader collapses the master area to its rail, sees the selected kind still marked, and restores it in one step.
- A use case whose body names `BR-CANONICAL-001` and whose metadata names its primary actor is selected: both identifiers are links that make their artifacts the focus, and the body text reads exactly as authored. A made-up identifier in the same body stays plain text.
- The reader steps to the next and previous artifact of a filtered list without returning to it, and the Reader states the position within the kind.
- The reader selects an artifact with no relationships. Both groups state that there are none, and the artifact reads normally.
- The reader arrives at an artifact from an in-progress Catalog discovery, reads it, follows a relationship, and retraces: the context they came from is visible from the Reader and restored on return.
- The reader walks the master list through every kind and confirms each artifact in the model can be selected; each selected artifact's relationship groups together account for every edge the compiled graph records for it.
- The snapshot is opened at a viewport width of a common phone. The list and the artifact are usable as separate states; no horizontal scrolling is required to read either.
- An artifact body containing `<script>alert(1)</script>`, an unclosed `<div`, and an attribute fragment such as `" onload="x` is displayed verbatim as text. No script executes and no element is created from it, both on first render and after the reader navigates away and back.
- A draft artifact is visibly distinguishable from an active one, and no control on the page creates or changes anything. Reloading the page after exploring restores only what the address encodes.
