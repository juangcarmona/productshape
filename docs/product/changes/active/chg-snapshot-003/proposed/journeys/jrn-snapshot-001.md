---
id: JRN-SNAPSHOT-001
type: journey
title: Understand the product without the repository
status: active
primary-actor: ACT-PRODUCT-EXPLORER
steps:
  - use-case: UC-SNAPSHOT-001
  - use-case: UC-SNAPSHOT-EXPLORE-001
---

## Intended Outcome

A person with no access to the repository — and no intention of ever getting any — understands
the product deeply: its actors, journeys, use cases, rules, language and requirements, and how
they connect. The understanding comes from a Product Snapshot: a read-only projection of the
canonical model, generated as a single self-contained file and shared as one. They reach that
understanding by moving through the model one artifact at a time, never by being handed the whole
corpus at once.

## Entry Conditions

- A validated product model exists in a repository.
- Someone outside the repository workflow wants to understand the product — a stakeholder
  preparing a decision, a product owner reviewing scope, a new teammate, or anyone else curious
  about what the product actually is.

## Journey Narrative

Someone on the repository side — typically the Product Engineer — generates a Product Snapshot
with a single CLI command: one self-contained HTML file containing the complete current product
model and stamped with the revision it was generated from. They share it however the team shares
files: a message, an email, an intranet page.

The Product Explorer opens it in a browser and is oriented before being asked to read anything.
The page tells them which product this is, which revision it reflects, how many artifacts and
relationships the model holds, how those artifacts divide by kind, and that what they are looking
at is a generated read-only projection. A kind-level view of the relationships shows them how the
families of artifacts connect — which kinds govern which, which derive from which — without
showing a single artifact yet.

From there they enter the landscape — the whole product in four bands, every artifact a node with its
name on it — and reach what they want by recognising it there, by searching for something they already
have in mind, or by browsing into a kind that looks relevant. They select one artifact and read it on its own: its title, identifier, kind and
status, and its authored content with the structure the author gave it. Beside it, the artifact's
relationships are laid out in both directions and kept apart — what this artifact declares, and
what refers to it through the derived reverse views the authored files never state. Where an
artifact is heavily connected, its neighbours are grouped and counted rather than spilled, and the
explorer opens the group they care about.

They follow a relationship to the next artifact, and the next, and the selection follows them
everywhere: the list, the search results and the map all agree on which artifact is current, and all
three move it the same way. The product itself never moves. Each selection promotes a new
neighbourhood into the foreground and returns the previous one to the background, so the landscape they
started in is still there, still arranged as it was — which is what lets them recognise where they are
after ten selections rather than reading every label again. When they want to narrow it, they scope by
band; when they want all of it back, they reset. When they want to step back through where they have
been, the browser's Back button retraces it, because every selection and every scope was addressable.

When the model evolves, anyone on the repository side regenerates the snapshot and shares it
again; the stamped revision makes it obvious which state of the product a given page reflects.

## Variants and Branches

- Self-service generation: a developer who has the repository anyway generates the snapshot for
  their own reading — the explorer and the generator are the same person wearing two hats.
- Published snapshot: a team hosts the generated file at a stable address (static hosting,
  intranet, repository pages) so explorers always find the latest snapshot in the same place.
  Hosting is the adopter's concern; the product only generates the file.
- Direct arrival: the explorer is sent a link to one specific artifact rather than to the page as
  a whole, and starts from that artifact instead of from the orientation view.
- Small phone or narrow window: the explorer reads on a device where a side-by-side layout does
  not fit, and the page adapts rather than shrinking a desktop arrangement.

## Completion Conditions

- The Product Explorer can answer, from the snapshot alone, what the product does, for whom,
  under which rules, and in which language — at the depth the canonical model records.
- Every artifact and every relationship in the model was reachable to them, without every artifact's
  content having been displayed at once.
- The product they explored held its shape throughout, so they finished with a sense of where things are
  in it rather than only what is in it.
- The snapshot they used declares the model revision it reflects.
- The canonical model was never touched: exploration is entirely read-only.
