---
id: FR-SNAPSHOT-TOPOLOGY
type: functional-requirement
title: Traverse relationships through the Focus view
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE
  - BR-RELATIONSHIPS
verification:
  - scenario: The Focus view centres the selected artifact and places its direct neighbours around it, grouped by artifact kind, kinds earlier in the Columns order on one side and later kinds on the other
  - scenario: Each neighbour shows its kind, identifier, title, the relationship types connecting it to the focus with their direction, and the count of its own other relationships
  - scenario: Each kind group is headed by its name and complete count and can be collapsed and expanded; a group too large to draw legibly starts collapsed, and nothing collapsed is silently omitted
  - scenario: The rest of the model appears as a faded background in which every other artifact remains individually selectable
  - scenario: Choosing a neighbour or a background artifact refocuses the view on it; the view never accumulates the traversal
  - scenario: A breadcrumb shows the artifacts recently focused in this visit, each one step from becoming the focus again, and browser Back returns to the previous focus
  - scenario: The focus is addressable, so opening the address of a Focus view opens that view on that artifact
  - scenario: The Focus view is one step from the Reader, and the Reader is one step from the Focus view, on the same artifact
  - scenario: Every neighbour shown or counted is also reachable through the Reader, the Catalog, search and deep links
  - scenario: The view is deterministic for the same model, focus, viewport and disclosure state
  - scenario: The view draws no node, relationship or direction the compiled graph does not contain
---

## Requirement

The Product Explorer MUST provide a **Focus view**: one selected artifact, its direct canonical neighbours around it, and the rest of the model behind them.

The focus MUST be the page's selected artifact, drawn at the centre. Its direct neighbours MUST be drawn around it, grouped by artifact kind: kinds that come before the focus's kind in the Columns order defined by FR-SNAPSHOT-PROJECTIONS on one side, and the focus's own kind and the kinds after it on the other, so the position of a group is a stable consequence of its kind. Each neighbour MUST show its kind, its stable identifier and its title, the relationship types that connect it to the focus with their direction stated as text, and the count of its own relationships to artifacts other than the focus. A line MUST join each drawn neighbour to the focus.

Each kind group MUST be headed by the kind's name and the complete count of its members, and MUST be collapsible and expandable by the reader. A group too large to draw legibly MUST start collapsed, showing its count; collapsed content is never silently omitted, and expanding a group changes nothing else. The reader's explicit expansions and collapses are disclosure state, carried in the address as FR-SNAPSHOT-ADDRESSING defines.

Every artifact that is neither the focus nor one of its neighbours MUST appear as a faded background mark that names its artifact to assistive technology and on hover, and that the reader can select. Choosing a neighbour or a background mark MUST make that artifact the new focus; the view MUST NOT accumulate the traversal. A breadcrumb MUST show the artifacts recently focused during this visit, each one step from becoming the focus again, and browser Back MUST return to the previous focus. The breadcrumb is reader state for the open page and is not persisted.

The Focus view MUST be one step from the Reader on the same artifact, and the Reader MUST offer a Focus action that opens the Focus view on the artifact it shows. Every neighbour the view shows or counts MUST remain reachable through the Reader, the Catalog, search and deep links.

For the same model content, focus, viewport and disclosure state, the Focus view MUST be identical. It MUST draw only nodes, relationships and directions the compiled graph contains, and no visual device MAY invent lifecycle, maturity, importance, sequence, causality or dependency absent from the canonical relationships.

## Rationale

The Focused Topology answered "what does this artifact touch" with groups of counts that had to be opened one at a time, beside a Reader that already listed the same groups as text. Readers asked for the opposite trade: see the neighbours themselves, by name, around the thing they selected, and keep a sense of the whole model around it. Grouping by kind and placing the groups by the same fixed order the Columns view uses gives every Focus view the same orientation, so a reader learns once where rules, terms or requirements will be.

Counts on collapsed groups and on each neighbour keep the boundedness honest: the reader always knows how much lies one step further. Refocusing replaces rather than accumulates, and the breadcrumb together with browser Back carries the continuity the old projection left to the history alone.

## Acceptance Scenarios

- A reader focuses a use case: its actors and journeys sit on one side; its bounded context, governing rules, terms, the requirements deriving from it and the behaviours on the other, each grouped under its kind with a count, each neighbour naming the relationship that connects it.
- The most connected artifact is focused: its largest groups start collapsed with their complete counts, and expanding one changes nothing else.
- The reader chooses a neighbour, then a faded background artifact: each becomes the focus in turn, the breadcrumb lists both, and Back returns through them.
- From the Reader the reader chooses Focus, and from the Focus view returns to the Reader, on the same artifact both ways.
- With the view unavailable, every relationship it would show is read in the Reader and reached through the Catalog and deep links.
- The same address opened in two windows of the same size draws the identical view; compared with the compiled graph, nothing drawn or counted is absent from it.
