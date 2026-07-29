---
id: FR-SNAPSHOT-002
type: functional-requirement
title: Navigate the product graph within the snapshot page
status: draft
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
  - BR-RELATIONSHIPS-001
verification:
  - scenario: Artifacts are browsable by kind and every artifact's rendered content is readable on the page
  - scenario: An artifact's relationships are followable in both directions, including derived reverse views
  - scenario: A graph visualization presents the model's shape, and selecting a node highlights its relationships
  - scenario: Client-side search finds artifacts by ID, title and content with no network access
  - scenario: Every artifact displays its status, and nothing on the page allows editing
---

## Requirement

The generated Product Snapshot MUST let a reader browse all product artifacts organized by kind,
read each artifact's rendered content, and follow each artifact's relationships in both
directions — the relationships its frontmatter declares and the derived reverse views computed
from the rest of the model — as navigable links: on an artifact's rendered view, every reference
to another artifact is a link that navigates to it. The page MUST include a graph visualization
conveying the model's overall shape, in which selecting a node shows or highlights that
artifact's relationships (its neighborhood), and a client-side search
over artifact IDs, titles and content that works without network access. Every artifact MUST
display its status, and the page MUST offer no capability to create, edit, annotate or approve
anything.

## Rationale

The relationships are the methodology: a pile of rendered documents would communicate less than
the repository already does, because the graph — who serves whom, what governs what, what derives
from what — is where the product's coherence lives. Making the derived reverse views navigable is
the snapshot's core value: the authored files never state them, the CLI computes them for
engineers, and the snapshot is where everyone else finally sees them. Search and visualization
serve the two ways a reader arrives: knowing what they are looking for, and not knowing what
exists. Displaying statuses keeps the projection honest about the model's maturity, and the
absence of any editing capability is what lets the snapshot remain a projection rather than
becoming a second home for product truth.

## Acceptance Scenarios

- A reader opens the snapshot, picks a kind, opens an artifact, and reads the same knowledge the
  authored file carries.
- From a use case, the reader follows an outgoing link to the business rule that governs it, and
  an incoming derived link to the requirement that derives from it — neither direction requiring
  the reader to know which side authored the edge.
- The reader opens the graph visualization, grasps the model's shape, selects one node, and
  sees that artifact's relationships highlighted.
- The reader searches for a term they heard in a meeting and lands on the matching artifacts,
  with the browser offline.
- A draft artifact is visibly distinguishable from an active one, and no control on the page
  creates or changes anything.
