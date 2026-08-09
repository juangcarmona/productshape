---
id: UC-SNAPSHOT-EXPLORE-001
type: use-case
title: Explore the product through a snapshot page
status: active
primary-actor: ACT-PRODUCT-EXPLORER
supporting-actors: []
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CANONICAL-001
uses-terms:
  - TERM-PRODUCT-SNAPSHOT
  - TERM-PRODUCT-GRAPH
  - TERM-PRODUCT-ARTIFACT
  - TERM-GRAPH-PROJECTION
  - TERM-PRODUCT-EXPLORER
  - TERM-FOCUSED-TOPOLOGY
---

## Goal

A person with only a browser understands the product deeply from a Product Snapshot: what it does, for whom, under which rules and in which language — including the connections between artifacts that make the definition a graph rather than a pile of documents. They reach that understanding through the Product Explorer's four surfaces: orienting on the Overview, locating artifacts through the Catalog, reading them in the Artifact Reader, and traversing relationships through the Focused Topology — with every artifact and canonical relationship reachable, and nothing ever rendered all at once.

## Trigger

The Product Explorer receives or opens a Product Snapshot — a file someone shared, or a page their team publishes at a stable address.

## Preconditions

- A generated Product Snapshot is available to open in a browser.

## Main Flow

1. The explorer opens the snapshot in a browser; no installation, account or server is involved.
2. They are oriented on the **Overview**: which product and which model revision this reflects, how many artifacts and relationships the model holds, how the artifacts divide by kind with an entry point into each family, that the page is a generated read-only projection, and how the kinds relate to one another in aggregate. Global search is one gesture away. No artifact content and no artifact-level graph is displayed.
3. They locate an artifact through the **Catalog**: searching by identifier, title or content, or browsing an artifact family and narrowing it by canonical fields. The result set is deterministic and its address shareable.
4. They open an artifact in the **Reader**. Its identity, type, status, metadata and authored content dominate the surface; the Catalog's query and filters survive for their return.
5. They read the artifact's canonical relationships in the Reader, grouped by their actual meaning, incoming distinguished from outgoing where direction matters, every group carrying its complete count, every related artifact's name and identifier a step away.
6. When they want to see rather than read a neighbourhood, they open the **Focused Topology**: the selected artifact as focus, its immediate relationships grouped and counted, collapsed groups showing complete counts, expansion only on their deliberate action.
7. They follow a relationship — from the Reader or from the projection — and the related artifact becomes the new focus everywhere: the Reader shows it, the projection refocuses on it rather than accumulating, and Back returns to where they were with their context intact.
8. They repeat from any surface as far as their question requires; at every step the address reflects where they are, so any state can be shared and reopened.
9. They note the model revision the snapshot reflects, and can hand anyone a link that reopens the page on the artifact they were reading.

## Alternative Flows

- Deep link arrival: the explorer opens a link addressing one artifact and starts in the Reader, with the Overview one step away.
- Retracing: Back and Forward move through the surfaces, selections and discovery states they have already visited.
- Unknown identifier: the link names an artifact this snapshot does not contain. The page says so plainly, names the identifier, and offers orientation and search as ways forward.
- Older link: a bare-identifier fragment from an earlier snapshot resolves to its artifact, and the address quietly becomes the current one without an extra history entry.
- Unconnected artifact: the explorer notices the Overview's group of artifacts holding no relationships, reads it as the fact it is, and opens one directly.
- Heavily connected artifact: the focus has far more relationships than can be read at once. Every group shows its complete count, and the explorer expands only what they care about; where a set is too dense to draw legibly, it is presented as a structured list.
- Isolated artifact: both directions report that there are no relationships, and the artifact reads normally.
- Narrow viewport: the Catalog and the Reader become distinct navigable states rather than a compressed desktop layout.
- Search finds nothing: the page says so and names the query; clearing it returns to browsing without losing the selected artifact.

## Failure Conditions

- None significant within the page: exploration is read-only. Anything the explorer cannot learn from the snapshot — history, active changes, open discussion — belongs to the repository side and its actors.

## Postconditions

- The explorer has understood the product at the depth the canonical model records, without cloning, installing or reading raw Markdown, and without ever having been shown the whole product model or the whole graph at once.
- Every artifact and every canonical relationship in the model was reachable to them, through more than one surface.
- The state they were exploring is addressable, so the same view can be reopened or shared.
- No product knowledge was created, modified or approved: the snapshot offered no such capability, and nothing the explorer did was persisted anywhere.
