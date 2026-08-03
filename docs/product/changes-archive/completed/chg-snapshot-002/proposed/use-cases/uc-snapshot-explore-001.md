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
---

## Goal

A person with only a browser understands the product deeply from a Product Snapshot: what it does, for whom, under which rules and in which language — including the connections between artifacts that make the definition a graph rather than a pile of documents. They reach that understanding by orienting themselves, selecting one artifact, understanding its relationships, and moving to the next, with the page disclosing only what they have asked for at each step.

## Trigger

The Product Explorer receives or opens a Product Snapshot — a file someone shared, or a page their team publishes at a stable address.

## Preconditions

- A generated Product Snapshot is available to open in a browser.

## Main Flow

1. The explorer opens the snapshot in a browser; no installation, account or server is involved.
2. They are oriented: the page states which product and which model revision it reflects, how many artifacts and relationships the model holds, how the artifacts divide by kind, that it is a generated read-only projection, and how the kinds relate to one another in aggregate. No artifact content and no artifact-level graph is displayed at this point.
3. They reach an artifact in one of two ways: searching for an identifier, title, kind or phrase they already have in mind, or browsing into a kind and narrowing the list until they recognize what they want.
4. They select one artifact. Its title, identifier, kind, status and remaining metadata appear, together with its authored content rendered with the structure the author gave it. No other artifact's content competes for the space, and the selected artifact is visibly marked as selected wherever it also appears in a list or a projection.
5. They read the artifact's relationships in both directions, kept apart: what the artifact declares, and what refers to it through the derived reverse views the authored files never state. Each relationship names its type and its direction.
6. When they want to see rather than read those relationships, they open the focused neighbourhood projection anchored on the selected artifact: one hop by default, incoming distinguished from outgoing, neighbours grouped by relationship type and artifact kind, and large groups collapsed with their exact counts until the explorer opens them.
7. They follow a relationship to a neighbouring artifact, which becomes the new selection everywhere on the page, and repeat from step 4 as far as their question requires.
8. When they want broader topology, they ask for it: the layered map, which places real artifacts in four fixed bands — product context, product behaviour, rules and language, product commitments — and which they filter, group and collapse to keep it readable, with exact counts for whatever it is hiding. It does not open on its own, and it is the broadest view the snapshot offers; there is no separate drawing of the entire graph.
9. They note the model revision the snapshot reflects, and can hand anyone a link that reopens the page on the artifact they were reading.

## Alternative Flows

- Deep link arrival: the explorer opens a link addressing one artifact directly and starts from that artifact, with the orientation view still one step away.
- Retracing: the explorer uses the browser's Back and Forward to move through the artifacts and views they have already visited, rather than searching for them again.
- Unknown identifier: the link the explorer was given names an artifact this snapshot does not contain — the model changed, or the identifier was mistyped. The page says so plainly, names the identifier it could not resolve, and offers a way forward rather than opening empty.
- Older link: the explorer opens a link produced by an earlier snapshot, addressing an artifact in the form those snapshots used. It resolves to that artifact, and the address quietly becomes the current one without leaving an extra step in their history to press Back through.
- Unconnected artifact from the overview: the explorer notices the overview's group of artifacts that hold no relationships, reads it as the fact it is, and opens one of them directly.
- Heavily connected artifact: the selected artifact has far more neighbours than can be read at once. The explorer sees exact counts per relationship type and artifact kind and expands only the group they care about.
- Isolated artifact: the selected artifact has no relationships at all. Both directions report nothing rather than appearing broken, and the artifact is still reachable and readable.
- Narrow viewport: the explorer reads on a phone or narrow window where a side-by-side master–detail arrangement does not fit. The page presents the list and the artifact as separate states they move between, rather than compressing a desktop layout.
- Search finds nothing: the explorer's query matches no artifact. The page says so, and clearing the query returns them to browsing without losing the artifact they had selected.

## Failure Conditions

- None significant within the page: exploration is read-only. Anything the explorer cannot learn from the snapshot — history, active changes, open discussion — belongs to the repository side and its actors.

## Postconditions

- The explorer has understood the product at the depth the canonical model records, without cloning, installing or reading raw Markdown, and without ever having been shown the whole corpus or the whole graph at once.
- Every artifact and every relationship in the model was reachable to them.
- The artifact they were reading is addressable, so the same view can be reopened or shared.
- No product knowledge was created, modified or approved: the snapshot offered no such capability, and nothing the explorer did was persisted anywhere.
