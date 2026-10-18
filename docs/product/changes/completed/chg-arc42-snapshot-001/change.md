---
id: CHG-ARC42-SNAPSHOT-001
type: product-change
title: Publish ProductShape product and engineering information on separate sites
status: applied
base-revision: '8f47980'
operations:
  add:
    - ACT-ENGINEERING-READER
    - ACT-PUBLIC-READER
    - BC-PUBLICATION
    - FR-ENGINEERING-PORTAL-001
    - FR-PUBLIC-SITE-001
    - TERM-ARCHITECTURE-SNAPSHOT
    - UC-ENGINEERING-PORTAL-001
    - UC-PUBLIC-SITE-001
  modify: []
  remove: []
---

## Problem

ProductShape currently brings public product information and engineering documentation together in one published site. The Product Snapshot, architecture documentation, future E2E reports and public explanation of ProductShape serve different readers and have different sources. Without clear publication boundaries, readers can mistake generated views for canonical sources, and the public site has limited room to explain the product and its engineering process visually.

## Intended Product Outcome

ProductShape provides two distinct, linked publication surfaces:

- A public site helps prospective and current users understand ProductShape, its process and artifacts, and how those artifacts relate. It includes examples of Archify diagrams to explain the process and artifact relationships.
- An engineering portal presents outputs produced by ProductShape's own engineering process: the Product Snapshot, ProductShape's Architecture Snapshot, and E2E journey reports when such reports are available. Each output identifies its source and revision or run where that information exists. These outputs are read-only projections and do not replace their canonical sources.

ArcShape is a separate product in the same product family, focused on a different area. ProductShape may use ArcShape in its own repository workflow to document ProductShape's architecture and generate ProductShape's engineering documentation site. This use does not make either product a dependency, component, prerequisite or distribution of the other. Neither product's lifecycle or utility is part of the other's product promise.

## Rationale

Readers need to know whether they are learning about ProductShape or inspecting evidence and documentation produced by its engineering process. Distinct surfaces make that purpose clear while retaining direct paths between the public explanation and the underlying engineering outputs. Keeping source identity visible helps readers understand that snapshots, reports and diagrams are derived views.

ProductShape and ArcShape have separate product boundaries and can be used independently. ProductShape's use of ArcShape for its own architecture documentation is a repository-level tool choice, not a ProductShape feature offered to consumers or an integration contract between the products.

## Affected Product Areas

Public product information; publication and exploration of ProductShape's Product Snapshot, Architecture Snapshot and available E2E evidence; explanation of ProductShape's workflow and artifacts; and the distinction between authored sources and generated projections.

## Open Questions

None for this product intent. The public domain is `productshape.dev`, which the owner has purchased. Its publication follows the process configured for Raccord's public site at `raccord.dev`. Exact routes, Archify diagrams and E2E report format are delivery-design details.

## Product Acceptance

- A reader can distinguish the public ProductShape site from the engineering portal by their purpose and navigation.
- The public site explains ProductShape's value, process and artifacts and includes Archify diagrams with explanations, without presenting diagrams as canonical product data.
- The engineering portal keeps the Product Snapshot distinct from ProductShape's Architecture Snapshot and from E2E reports.
- An output is presented only when its source exists; available outputs identify their source revision, and E2E reports identify their originating run when available.
- Readers can reach the relevant canonical source from a generated output, and the generated output is identified as read-only and derived.
- ProductShape's use of ArcShape for its own architecture documentation does not imply that ProductShape depends on ArcShape, that ArcShape depends on ProductShape, or that ProductShape offers ArcShape to its users.

## Out of Scope

Designing, building, naming, licensing, hosting, releasing, supporting or migrating ArcShape; offering architecture design, maintenance, renderer packages or host integrations as ProductShape capabilities; making ProductShape a prerequisite for ArcShape or ArcShape a prerequisite for ProductShape as products; changing Product Snapshot semantics; changing the canonical architecture documents or E2E journey definitions; choosing hosting providers, domains, route structures or deployment technology; publishing reports that do not yet exist; and treating any generated snapshot, report or diagram as a canonical source.
