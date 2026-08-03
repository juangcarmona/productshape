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

A person with no access to the repository — and no intention of ever getting any — understands the product deeply: its actors, journeys, use cases, rules, language and requirements, and how they connect. The understanding comes from a Product Snapshot: a read-only projection of the canonical model, generated as a single self-contained file and shared as one. They reach that understanding through the Product Explorer, one artifact and one neighbourhood at a time, never by being handed the whole corpus at once.

## Entry Conditions

- A validated product model exists in a repository.
- Someone outside the repository workflow wants to understand the product — a stakeholder preparing a decision, a product owner reviewing scope, a new teammate, or anyone else curious about what the product actually is.

## Journey Narrative

Someone on the repository side — typically the Product Engineer — generates a Product Snapshot with a single CLI command: one self-contained HTML file containing the complete current product model and stamped with the revision it was generated from. They share it however the team shares files: a message, an email, an intranet page.

The Product Explorer opens it in a browser and is oriented before being asked to read anything. The Overview tells them which product this is, which revision it reflects, how many artifacts and relationships the model holds, how those artifacts divide by kind, and that what they are looking at is a generated read-only projection. A kind-level view of the relationships shows them how the families of artifacts connect — which kinds govern which, which derive from which — without showing a single artifact yet. Search is right there when they already know what they came for.

From there they work the Catalog: searching for something they have in mind, or browsing a family and narrowing it by type, status or context until they recognize what they want. They open an artifact and read it on its own: its title, identifier, kind and status, and its authored content with the structure the author gave it. Beside it, the artifact's relationships are laid out by what they actually mean and kept apart by direction — what this artifact declares, and what refers to it through the derived reverse views the authored files never state. Where an artifact is heavily connected, its neighbours are grouped and counted rather than spilled, and the explorer opens the group they care about.

When they want to see a neighbourhood rather than read it, they ask for the Focused Topology: the artifact they are reading becomes the centre of a small, legible picture of its immediate relationships, grouped and counted, expanding only where they choose. Following a connection makes the next artifact the focus — the picture refocuses rather than piling up — and the browser's Back button walks them back through where they have been, queries and all, because every step they took was addressable. However they move — list, search result, relationship link or projection — the selection follows them everywhere, and every surface agrees on where they are.

When the model evolves, anyone on the repository side regenerates the snapshot and shares it again; the stamped revision makes it obvious which state of the product a given page reflects.

## Variants and Branches

- Self-service generation: a developer who has the repository anyway generates the snapshot for their own reading — the explorer and the generator are the same person wearing two hats.
- Published snapshot: a team hosts the generated file at a stable address so explorers always find the latest snapshot in the same place. Hosting is the adopter's concern; the product only generates the file.
- Direct arrival: the explorer is sent a link to one specific artifact rather than to the page as a whole, and starts from that artifact instead of from the Overview.
- Small phone or narrow window: the explorer reads on a device where a side-by-side layout does not fit, and the page adapts rather than shrinking a desktop arrangement.

## Completion Conditions

- The Product Explorer can answer, from the snapshot alone, what the product does, for whom, under which rules, and in which language — at the depth the canonical model records.
- Every artifact and every canonical relationship in the model was reachable to them, without any of it having been displayed all at once.
- The snapshot they used declares the model revision it reflects.
- The canonical model was never touched: exploration is entirely read-only.
