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
  - scenario: A selected artifact shows its title, ID, kind, status and remaining metadata, and its authored Markdown with the original heading hierarchy
  - scenario: Declared references and derived reverse references appear as separately labelled groups, each naming the relationship type and direction
  - scenario: Every related artifact is selectable directly from the detail without scrolling through a long document
  - scenario: Every artifact and every relationship in the compiled model is reachable, including artifacts with no relationships
  - scenario: On a narrow viewport the list and the detail become separate navigable states rather than a compressed desktop layout
  - scenario: Authored content containing HTML tags, script tags, quotes and brackets is displayed as text and never parsed as markup or executed, whether rendered from markup or from embedded data
  - scenario: Nothing in the page creates, edits, annotates, approves or persists anything
---

## Requirement

The Product Snapshot MUST present artifacts in a master–detail arrangement with exactly one active artifact detail at any moment. The master area MUST let a reader reach any artifact in the model by kind, by search and by filter, and MUST show which artifact is currently selected in a way that persists while the reader works. The detail area MUST show the selected artifact's title, identifier, kind, status and remaining declared metadata, and MUST render its authored Markdown preserving the heading hierarchy the author wrote.

The detail MUST present the artifact's relationships in both directions as two separately labelled groups — the references the artifact's own frontmatter declares, and the derived reverse references computed from the rest of the model — with each entry naming the relationship type and the direction, and each related artifact selectable directly from the group. No artifact's content other than the selected artifact's MAY be present in the active document.

Every artifact and every relationship in the compiled model MUST be reachable through the page. Artifacts with no relationships MUST be reachable and readable, and MUST report the absence of relationships in both directions rather than appearing incomplete. Every artifact MUST display its status.

On viewports too narrow for a side-by-side arrangement, the master and detail MUST become distinct navigable states rather than a scaled-down desktop layout.

Authored content MUST NOT be able to become executable or structural: content that reaches the page as rendered markup and content that reaches it as embedded data the page renders at open time MUST both be escaped or otherwise neutralized so that authored HTML, script or attribute sequences are displayed as the text the author wrote. The page MUST offer no capability to create, edit, annotate or approve anything, and MUST NOT persist anything a reader does outside the address of the current view.

## Rationale

The relationships are the methodology: a pile of rendered documents would communicate less than the repository already does, because the graph — who serves whom, what governs what, what derives from what — is where the product's coherence lives. But relationships only become legible relative to something selected, and a document containing every artifact's body has nothing selected. One active artifact is what makes "these are its incoming relationships" a meaningful statement rather than a section heading in a very long report.

Keeping declared and derived references apart is the snapshot's core value. The authored files never state the reverse direction, the CLI computes it for engineers, and the snapshot is where everyone else finally sees it — but only if the reader can tell which side authored the edge, because that distinction is what tells them where to go to change it.

Reachability is the promise that replaces simultaneous display. A reader accepting that they will not see everything at once needs to know that nothing is hidden from them, which is why the requirement is stated as a completeness obligation on navigation rather than on rendering. The isolated-artifact case is called out because a projection that quietly drops unconnected artifacts would be a projection that lies about the model.

Escaping is stated explicitly and on both channels because progressive disclosure changes the threat: when artifact bodies live in the file as data and become DOM at open time, the escaping that protects generated markup does not automatically protect the rendering path. Product definitions are authored by people and contain code fences, tag names and quoted examples as a matter of course; the snapshot travels outside the repository, so an authored string must never be able to act on its reader.

## Acceptance Scenarios

- A reader opens the snapshot, filters to a kind, selects one artifact and reads the same knowledge the authored file carries, with the author's section structure intact. Inspecting the document confirms no other artifact's body is present.
- From a use case, the reader sees "governed-by → the business rule" in the declared group and "the functional requirement → derived-from" in the derived group, selects either, and lands on it — never needing to know which side authored the edge.
- The reader selects an artifact with no relationships. Both groups state that there are none, and the artifact reads normally.
- The reader walks the master list through every kind and confirms each artifact in the model can be selected; each selected artifact's relationship groups together account for every edge the compiled graph records for it.
- The snapshot is opened at a viewport width of a common phone. The list and the artifact are usable as separate states; no horizontal scrolling is required to read either.
- An artifact body containing `<script>alert(1)</script>`, an unclosed `<div`, and an attribute fragment such as `" onload="x` is displayed verbatim as text. No script executes and no element is created from it, both on first render and after the reader navigates away and back.
- A draft artifact is visibly distinguishable from an active one, and no control on the page creates or changes anything. Reloading the page after exploring restores only what the address encodes.
