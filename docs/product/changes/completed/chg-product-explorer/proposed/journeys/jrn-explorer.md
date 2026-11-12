---
id: JRN-EXPLORER
type: journey
title: Understand the product without the repository
status: active
primary-actor: ACT-PRODUCT-STAKEHOLDER
steps:
  - use-case: UC-EXPLORER-GENERATE
  - use-case: UC-EXPLORER-BROWSE
---

## Intended Outcome

A person with no access to the repository — and no intention of ever getting any — understands the product deeply: its actors, journeys, use cases, rules, language and requirements, and how they connect. The understanding comes from a Product Explorer: a read-only projection of the canonical model, generated as a single self-contained file and shared as one. They reach that understanding through the Product Explorer: the whole product mapped by kind and context first, then one artifact and its neighbourhood at a time.

## Entry Conditions

- A validated product model exists in a repository.
- Someone outside the repository workflow wants to understand the product — a stakeholder preparing a decision, a product owner reviewing scope, a new teammate, or anyone else curious about what the product actually is.

## Journey Narrative

Someone on the repository side — typically the Product Engineer — generates a Product Explorer with a single CLI command: one self-contained HTML file containing the complete current product model and stamped with the revision it was generated from. They share it however the team shares files: a message, an email, an intranet page.

The Product Stakeholder opens it in a browser and is oriented before being asked to read anything. The Overview tells them which product this is, which revision it reflects, how many artifacts and relationships the model holds, how those artifacts divide by kind, and that what they are looking at is a generated read-only projection. A map shows every artifact as a chip in its kind's region, use cases and domain terms gathered under their bounded contexts, and hovering one lights everything it touches. A kind-level view of the relationships gives the same connections as exact counts — which kinds govern which, which derive from which. Search is right there when they already know what they came for.

From there they work the Catalog: searching for something they have in mind, or browsing a family and narrowing it by type, status or context until they recognize what they want. They open an artifact and read it on its own: its title, identifier, kind and status, and its authored content with the structure the author gave it. Beside it, the artifact's relationships are laid out by what they actually mean and kept apart by direction — what this artifact declares, and what refers to it through the derived reverse views the authored files never state. Where an artifact is heavily connected, its neighbours are grouped and counted rather than spilled, and the stakeholder opens the group they care about.

When they want to see a neighbourhood rather than read it, they open the Focus view: the artifact becomes the centre, its neighbours gathered by kind around it, the rest of the product faded behind. Following a connection makes the next artifact the focus — the picture refocuses rather than piling up — and a Columns view lays the whole product out kind by kind when they want to follow a thread end to end. A business reader turns on the business lens and reads a use case as its goal, its users, the rules it must obey and how they are proved. Throughout, the browser's Back button walks them back through where they have been, queries and all, because every step they took was addressable. However they move — list, search result, relationship link or map — the selection follows them everywhere, and every surface agrees on where they are.

When the model evolves, anyone on the repository side regenerates the Product Explorer and shares it again; the stamped revision makes it obvious which state of the product a given page reflects.

## Variants and Branches

- Self-service generation: a developer who has the repository anyway generates the Product Explorer for their own reading — the stakeholder and the generator are the same person wearing two hats.
- Published Product Explorer: a team hosts the generated file at a stable address so stakeholders always find the latest Product Explorer in the same place. Hosting is the adopter's concern; the product only generates the file.
- Direct arrival: the stakeholder is sent a link to one specific artifact rather than to the page as a whole, and starts from that artifact instead of from the Overview.
- Small phone or narrow window: the stakeholder reads on a device where a side-by-side layout does not fit, and the page adapts rather than shrinking a desktop arrangement.

## Completion Conditions

- The Product Stakeholder can answer, from the Product Explorer alone, what the product does, for whom, under which rules, and in which language — at the depth the canonical model records.
- Every artifact and every canonical relationship in the model was reachable to them as text, and visible to them on the maps.
- The Product Explorer they used declares the model revision it reflects.
- The canonical model was never touched: exploration is entirely read-only.
