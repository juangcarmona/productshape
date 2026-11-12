---
id: UC-EXPLORER-BROWSE
type: use-case
title: Explore the product through the Product Explorer
status: active
primary-actor: ACT-PRODUCT-STAKEHOLDER
supporting-actors: []
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CANONICAL
uses-terms:
  - TERM-PRODUCT-EXPLORER
  - TERM-PRODUCT-GRAPH
  - TERM-PRODUCT-ARTIFACT
  - TERM-GRAPH-PROJECTION
  - TERM-FOCUSED-TOPOLOGY
---

## Goal

A person with only a browser understands the product deeply from a Product Explorer: what it does, for whom, under which rules and in which language — including the connections between artifacts that make the definition a graph rather than a pile of documents. They reach that understanding through the Product Explorer: seeing the whole product mapped by kind and context on the Overview, centring one artifact among its neighbours in the Focus view, following a thread across kinds in the Columns view, locating artifacts through the Catalog, reading them in the Artifact Reader, and — when they think in business terms — reading a use case through the business lens, with every artifact and canonical relationship reachable as text as well as on the maps.

## Trigger

The Product Stakeholder receives or opens a Product Explorer — a file someone shared, or a page their team publishes at a stable address.

## Preconditions

- A generated Product Explorer is available to open in a browser.

## Main Flow

1. The stakeholder opens the Product Explorer in a browser; no installation, account or server is involved.
2. They are oriented on the **Overview**: which product and which model revision this reflects, how many artifacts and relationships the model holds, that the page is a generated read-only projection, and — on the Overview map — every artifact as a chip in its kind's region, use cases and domain terms grouped by bounded context. Hovering a chip lights what it touches. The kind-level aggregate shows how the kinds relate in aggregate. Global search is one gesture away. No artifact content is displayed.
3. They choose a chip and the **Focus view** centres it, its neighbours grouped by kind around it and the rest of the model faded behind; choosing a neighbour refocuses, and the breadcrumb and Back retrace the way. When they want to follow a thread across the whole model, they switch to the **Columns view**, one column per kind, and select an artifact to keep its neighbourhood lit.
4. They locate an artifact through the **Catalog**: searching by identifier, title or content, or browsing an artifact family and narrowing it by canonical fields. The result set is deterministic and its address shareable.
5. They open an artifact in the **Reader**, from the Catalog or from any map. Its identity, type, status, metadata and authored content dominate the surface; the Catalog's query and filters survive for their return.
6. They read the artifact's canonical relationships in the Reader, grouped by their actual meaning, incoming distinguished from outgoing where direction matters, every group carrying its complete count, every related artifact's name and identifier a step away.
7. They follow a relationship — from the Reader or from a map — and the related artifact becomes the selected artifact everywhere: the Reader shows it, the Focus view centres it, and Back returns to where they were with their context intact.
8. With the **business lens** on, a use case reads as a card in their language: its goal and trigger, who uses it, the rules it must obey and the behaviours that prove them, what else it must be, and what a change would put in question.
9. They repeat from any surface as far as their question requires; at every step the address reflects where they are, so any state can be shared and reopened.
10. They note the model revision the Product Explorer reflects, and can hand anyone a link that reopens the page on the artifact they were reading.

## Alternative Flows

- Deep link arrival: the stakeholder opens a link addressing one artifact and starts in the Reader, with the Overview one step away.
- Retracing: Back and Forward move through the surfaces, selections and discovery states they have already visited.
- Unknown identifier: the link names an artifact this Product Explorer does not contain. The page says so plainly, names the identifier, and offers orientation and search as ways forward.
- Older link: a bare-identifier fragment from an earlier Product Explorer resolves to its artifact, and the address quietly becomes the current one without an extra history entry.
- Unconnected artifact: the stakeholder notices the Overview's group of artifacts holding no relationships, reads it as the fact it is, and opens one directly.
- Heavily connected artifact: the focus has far more neighbours than can be drawn legibly at once. Every kind group shows its complete count, the largest start collapsed, and the stakeholder expands only what they care about; the Reader lists every relationship as text.
- Isolated artifact: both directions report that there are no relationships, and the artifact reads normally.
- Narrow viewport: the Catalog and the Reader become distinct navigable states rather than a compressed desktop layout.
- Search finds nothing: the page says so and names the query; clearing it returns to browsing without losing the selected artifact.

## Failure Conditions

- None significant within the page: exploration is read-only. Anything the stakeholder cannot learn from the Product Explorer — history, active changes, open discussion — belongs to the repository side and its actors.

## Postconditions

- The stakeholder has understood the product at the depth the canonical model records, without cloning, installing or reading raw Markdown.
- Every artifact and every canonical relationship in the model was reachable to them, through more than one surface.
- The state they were exploring is addressable, so the same view can be reopened or shared.
- No product knowledge was created, modified or approved: the Product Explorer offered no such capability, and nothing the stakeholder did was persisted anywhere.
