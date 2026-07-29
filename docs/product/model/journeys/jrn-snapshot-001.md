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
they connect. The understanding comes from a Product Snapshot: a static, self-contained page
generated from the canonical model and shared as a single file.

## Entry Conditions

- A validated product model exists in a repository.
- Someone outside the repository workflow wants to understand the product — a stakeholder
  preparing a decision, a product owner reviewing scope, a new teammate, or anyone else curious
  about what the product actually is.

## Journey Narrative

Someone on the repository side — typically the Product Engineer — generates a Product Snapshot
with a single CLI command: one self-contained HTML file projecting the current product model,
stamped with the revision it was generated from. They share it however the team shares files: a
message, an email, an intranet page. The Product Explorer opens it in a browser and explores:
starting from the artifact kinds, opening an actor or a journey, following its relationships in
both directions — including the derived reverse views the authored files never state — glancing
at the graph to see the product's shape, and searching when they know what they are looking for.
When the model evolves, anyone on the repository side regenerates the snapshot and shares it
again; the stamped revision makes it obvious which state of the product a given page reflects.

## Variants and Branches

- Self-service generation: a developer who has the repository anyway generates the snapshot for
  their own reading — the explorer and the generator are the same person wearing two hats.
- Published snapshot: a team hosts the generated file at a stable address (static hosting,
  intranet, repository pages) so explorers always find the latest snapshot in the same place.
  Hosting is the adopter's concern; the product only generates the file.

## Completion Conditions

- The Product Explorer can answer, from the snapshot alone, what the product does, for whom,
  under which rules, and in which language — at the depth the canonical model records.
- The snapshot they used declares the model revision it reflects.
- The canonical model was never touched: exploration is entirely read-only.
