# Delivery plan: ProductShape publication surfaces

This is a technical planning companion to [CHG-ARC42-SNAPSHOT-001](change.md), not part of the Product Change operations. It records a proposed delivery direction; hosting, routes and workflow details remain design decisions for the linked delivery work.

## Recommendation

Reuse and improve the existing static ProductShape site. Publish it separately from the engineering portal so that each has a clear audience and purpose. Keep GitHub Pages for engineering outputs. Publish the public site at `productshape.dev` using the same process configured for Raccord's public site at `raccord.dev`; domain ownership and provider selection are settled, not open decisions for this work.

The engineering portal should link distinct outputs rather than merge their meanings: Product Snapshot from ProductShape, ProductShape's Architecture Snapshot generated with ArcShape in this repository's documentation workflow, and E2E journey evidence when a pipeline produces it. Include source revision or run identity with each available output. The public site should explain ProductShape and its workflow with authored copy and Archify diagrams that make artifact relationships understandable.

ArcShape remains a separate product with its own lifecycle and users. ProductShape's repository may select it as a documentation tool; neither product should require the other to exist or be useful. Do not package or market ArcShape as part of ProductShape.

## Delivery slices

1. **Inventory and boundaries.** Map current public pages, architecture pages, Product Snapshot generation and deployment. Identify canonical source locations and outputs. Use the #295 Archify/Mermaid/Snapshot research to choose diagram examples and rendering approach.
2. **Engineering portal.** Separate the Product Snapshot, Architecture Snapshot and E2E report entry points. Publish only outputs that exist, identify their source revisions or run, and link to canonical material. Keep reports free of secrets and non-public data.
3. **Public site improvement.** Retain the current site's structure and visual identity while improving its explanation of ProductShape, the PDaC process, artifact relationships and workflow. Add Archify diagrams with textual explanations and accessible labels.
4. **Independent publishing.** Keep the engineering portal on its GitHub Pages publishing lane and publish the public site through the Raccord `raccord.dev` process, adapted to ProductShape's existing site source and build output. Follow that process for previews, production activation and custom-domain setup at `productshape.dev`; do not introduce a separate deployment mechanism or credentials flow.
5. **Qualification.** Review the published surfaces for correct source labels, links, separation, accessibility, and honest availability of generated outputs. Confirm that one publishing failure does not silently replace an existing valid site with incomplete content.

## Dependencies and decisions

- Issue #295's Archify/Mermaid/Snapshot research informs the public site's diagram design; it does not select a production dependency by itself.
- Product Snapshot remains governed by its existing requirements and pipeline.
- Architecture Snapshot generation belongs to ProductShape's architecture documentation workflow and may use the separate ArcShape product. This is a tool choice for ProductShape's repository, not a product-to-product dependency or customer integration.
- E2E publication depends on a real pipeline output and a defined report format. Until then, the portal must not imply that E2E reports are available.
- `productshape.dev` is already purchased. The public site must follow the publication process configured for Raccord and `raccord.dev`; the delivery proposal maps that process onto ProductShape's existing site source and build.
- ProductShape-specific routes, build orchestration and failure/retention policy are delivery details, subject to the same publication and approval controls used for Raccord.
- Roadmap #98 governs broader expansion; #296 records the narrow owner-authorized exception for this publication and presentation work.
