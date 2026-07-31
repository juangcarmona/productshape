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
  - TERM-PRODUCT-LANDSCAPE
---

## Goal

A person with only a browser understands the product deeply from a Product Snapshot: what it
does, for whom, under which rules and in which language — including the connections between
artifacts that make the definition a graph rather than a pile of documents. They reach that
understanding by orienting themselves, selecting one artifact, understanding its relationships,
and moving to the next, with the page disclosing only what they have asked for at each step.

## Trigger

The Product Explorer receives or opens a Product Snapshot — a file someone shared, or a page
their team publishes at a stable address.

## Preconditions

- A generated Product Snapshot is available to open in a browser.

## Main Flow

1. The explorer opens the snapshot in a browser; no installation, account or server is involved.
2. They are oriented: the page states which product and which model revision it reflects, how many
   artifacts and relationships the model holds, how the artifacts divide by kind, that it is a generated
   read-only projection, and how the kinds relate to one another in aggregate. No artifact content and no
   artifact-level map is displayed at this point.
3. They enter the Product Landscape and see the complete product laid out in its four bands, every artifact
   present as a node carrying its title. This is the whole model at once, and it is the place they will
   return to.
4. They reach an artifact in one of three ways, all of which do the same thing: selecting it on the map,
   searching for an identifier, title, kind or phrase, or browsing the rail's list until they recognize what
   they want.
5. Whichever way they chose, the artifact becomes the selection: the inspector shows its title, identifier,
   kind, status and remaining metadata together with its authored content, and the map centres on it and
   fits its neighbourhood. The rest of the product stays visible behind, subdued, exactly where it was.
6. They read the artifact in the inspector, which stays beside the map and scrolls on its own, and read its
   relationships in both directions — what it declares and what refers to it through the derived reverse
   views — each naming its type and direction.
7. They look at the neighbourhood on the map: the relationships belonging to it are prominent, the rest of
   the product is context. Where a group of neighbours is too large to read at once, it appears as a counted
   group they open when they want it.
8. They follow a relationship, from the inspector or from the map. The new artifact becomes the selection,
   the camera moves to it, and the neighbourhood they were just in returns to the background rather than
   disappearing. Nothing else has moved.
9. When they want to narrow what the landscape emphasises, they select a band. The landscape and the rail
   scope to it; nothing becomes selected and no focus is created.
10. When they want the whole product again, they reset the map and the landscape returns, with every artifact
    where they last saw it.
11. They note the model revision the snapshot reflects, and can hand anyone a link that reopens the page on
    the artifact they were reading, in the state they were reading it.

## Alternative Flows

- Deep link arrival: the explorer opens a link addressing one artifact directly and starts from
  that artifact, with the orientation view still one step away.
- Retracing: the explorer uses the browser's Back and Forward to move through the artifacts, band scopes
  and map states they have already visited, rather than searching for them again.
- Unknown identifier: the link the explorer was given names an artifact this snapshot does not
  contain — the model changed, or the identifier was mistyped. The page says so plainly, names
  the identifier it could not resolve, and offers a way forward rather than opening empty.
- Older link: the explorer opens a link produced by an earlier snapshot, addressing an artifact in
  the form those snapshots used. It resolves to that artifact, and the address quietly becomes the
  current one without leaving an extra step in their history to press Back through.
- Unconnected artifact from the overview: the explorer notices the overview's group of artifacts that
  hold no relationships, reads it as the fact it is, and opens one of them directly.
- Heavily connected artifact: the selected artifact has far more neighbours than can be read at
  once. The explorer sees exact counts per relationship type and artifact kind and expands only
  the group they care about.
- Isolated artifact: the selected artifact has no relationships at all. Both directions report nothing
  rather than appearing broken, the artifact is still reachable and readable, and it is still visible in the
  landscape where it belongs.
- Narrow viewport: the explorer reads on a phone or narrow window where the rail, the map and the inspector
  do not fit side by side. The page presents them as separate states they move between, keeping the selected
  artifact, rather than compressing a desktop layout.
- Search finds nothing: the explorer's query matches no artifact. The page says so, and clearing
  the query returns them to browsing without losing the artifact they had selected.

## Failure Conditions

- None significant within the page: exploration is read-only. Anything the explorer cannot
  learn from the snapshot — history, active changes, open discussion — belongs to the
  repository side and its actors.

## Postconditions

- The explorer has understood the product at the depth the canonical model records, without
  cloning, installing or reading raw Markdown, and without ever having been shown the whole
  corpus or the whole graph at once.
- Every artifact and every relationship in the model was reachable to them.
- The artifact they were reading is addressable, so the same view can be reopened or shared.
- No product knowledge was created, modified or approved: the snapshot offered no such
  capability, and nothing the explorer did was persisted anywhere.
