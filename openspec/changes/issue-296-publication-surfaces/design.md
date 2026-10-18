<!-- pdac-scope: cited -->

# Design

## Context

See [proposal.md](proposal.md) for the motivation and publication boundaries. The current GitHub Pages workflow builds one output containing the public pages, Product Snapshot explorer and ProductShape arc42 pages. The site builder assumes a `/productshape/` base path and includes those engineering routes in its sitemap. Product requirements distinguish the public site from the engineering portal and require canonical sources to remain identifiable.

<!-- pdac:cite id="FR-ENGINEERING-PORTAL-001" digest="sha256:641a6d2ae3bbb10951584e3b2b648ba12b59c8aebab1f0e6787aed751f53b1c5" -->
<!-- pdac:cite id="FR-PUBLIC-SITE-001" digest="sha256:3cb2c22372dc4696fedaf5ef88ed42158f828accc65a4fa45f46812ee5a1f20a" -->
<!-- pdac:cite id="BC-PUBLICATION" digest="sha256:8a171d419a25901a88ed4e53e5b34b0a5590ffd71e4a7e8721fc4411cf4801f5" -->

## Goals / Non-Goals

**Goals:** Produce two independently built static outputs with explicit base URLs, source metadata and route inventories. Keep generated reports optional until their pipeline artifacts exist. Reuse the current public pages and assets where possible.

**Non-Goals:** Change Product Snapshot generation; introduce a diagram runtime or new publishing provider; ship ArcShape as a product or create a dependency between ArcShape and ProductShape; fabricate architecture or E2E outputs.

## Decisions

### Keep the current public content source and split its build targets

Refactor the existing builder around explicit output profiles (engineering portal and public site), sharing rendering, localization and static asset helpers where practical. The public profile uses the root-domain URL and contains no generated product model or engineering-documentation routes. The engineering profile owns the Product Snapshot and engineering documentation routes. This preserves current authored content while preventing the public sitemap and navigation from exposing engineering-only pages.

Alternative considered: duplicate the existing site source into a second implementation. Rejected because it would make content, localization and visual changes drift between copies.

### Keep independent publishers and artifact contracts

Retain GitHub Pages for the engineering portal. Change its workflow to assemble and publish only engineering artifacts. Build the public output independently in pull requests and retain a downloadable build artifact for review. Use the Raccord Cloudflare Pages project convention for manual preview and production publication; keep production activation and custom-domain changes under explicit owner control. Do not add Cloudflare credentials or deployment behavior to GitHub Actions. Raccord's operations notes say its current project is manually deployed and its PR workflow does not publish a web preview; confirm the actual Pages project mode before enabling any preview or production setup.

Alternative considered: publish both outputs from one GitHub Pages deployment with path routing. Rejected because the public domain and engineering portal have distinct destinations and deployment controls.

### Treat architecture and E2E reports as optional, source-identified inputs

The engineering build consumes Product Snapshot output as it does today. Its manifest records the source revision for that snapshot and for the Architecture Snapshot assembled from ProductShape's own architecture documentation. E2E reports remain optional; when a journey pipeline supplies one, its manifest entry records a relative path, source revision, run identity and result. Missing reports produce no report card. Architecture documentation may be generated with ArcShape inside ProductShape's own repository, without making ArcShape a ProductShape dependency or part of the public offer.

Alternative considered: have the portal invoke ArcShape or synthesize architecture/E2E pages during site assembly. Rejected because this couples publication to tools and outputs that may not yet be installed or available.

### Publish Archify diagrams as static, labeled assets

Use source-linked static diagrams and captions in the public site. Each diagram identifies whether it is conceptual or mechanically derived and remains understandable without color alone. Keep Archify diagram generation or export outside the public-site runtime; do not add a new package or CLI surface as part of this issue while #295 research is still informing the choice.

Alternative considered: render diagrams dynamically in the browser. Rejected because it would add a runtime dependency and make the public content dependent on client-side graph rendering.

## Risks / Trade-offs

- [Build profiles can accidentally leak routes or produce broken root-domain links] → Assert each profile's route manifest, sitemap host and base path in builder tests and inspect both built outputs.
- [Engineering artifacts may arrive on different schedules] → Drive links from the artifact manifest and omit unavailable outputs; verify metadata against the originating commit and run.
- [Raccord's current PR checks do not establish that a hosted preview exists] → Provide independent PR build validation and a downloadable artifact; confirm Pages project mode and preview policy before claiming a hosted preview.
- [Static diagram exports can become stale relative to their sources] → Keep source links and generation/edit instructions beside each asset, and review updates with the public content.
- [Splitting deployment can temporarily leave the old GitHub Pages URL with stale public pages] → Publish the engineering portal before switching public navigation, then verify both destinations and retain a rollback to the last successful artifacts.

## Migration Plan

1. Build the two outputs locally and validate route inventories, links, sitemaps and source metadata without changing live publication.
2. Build and validate the public output on pull requests, retaining the artifact for review. Confirm the Cloudflare Pages project mode before enabling any hosted preview or production activation.
3. Publish the engineering portal to GitHub Pages with the existing Product Snapshot and only available architecture/E2E artifacts.
4. After explicit owner review, activate public production publication and bind the already-purchased `productshape.dev` through the configured hosting flow. Verify HTTPS, page content, links, locale switching, responsive layout and the separation of engineering outputs.
5. If the new public deployment fails, restore the prior successful public deployment or revert the public-site change; leave domain/DNS configuration untouched unless a separately approved change requires it. Keep GitHub Pages engineering artifacts available throughout rollback.

## Open Questions

None that change the chosen architecture or task breakdown. The exact Raccord Pages project mode is an operational fact to verify before setup, not a product or implementation choice.
