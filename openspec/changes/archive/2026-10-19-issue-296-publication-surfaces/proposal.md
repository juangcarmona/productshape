<!-- pdac-scope: cited -->

# Proposal

## Why

ProductShape's current GitHub Pages build combines its public product site with outputs of the engineering process. Readers need separate destinations for learning about ProductShape and inspecting its generated product, architecture and E2E outputs. Issue [#296](https://github.com/juangcarmona/productshape/issues/296) is the owner-authorized publication and presentation exception to roadmap #98.

The approved Product Change defines the public site and engineering portal, including their reader outcomes and the distinction between canonical sources and derived outputs.

<!-- pdac:cite id="ACT-ENGINEERING-READER" digest="sha256:e04e7ae0b5f8ff07f36eb8c6afa05aaa2ebaaa6a4462a841b978e7e22bc8e7b0" -->
<!-- pdac:cite id="ACT-PUBLIC-READER" digest="sha256:48c4a11a55f2244a81962eb46d42b80dfcd0f68bf346f09242a835cb1d40b21f" -->
<!-- pdac:cite id="BC-PUBLICATION" digest="sha256:8a171d419a25901a88ed4e53e5b34b0a5590ffd71e4a7e8721fc4411cf4801f5" -->
<!-- pdac:cite id="UC-ENGINEERING-PORTAL-001" digest="sha256:84771dc17d47b1c61bad40b17d915c6f318ee657de5640234ce9b22c97a26744" -->
<!-- pdac:cite id="UC-PUBLIC-SITE-001" digest="sha256:b769e277997dc9a03d676b6d13370ef0d24ab8c673aa159c04d4e0815ed297f2" -->

## What Changes

- Separate the GitHub Pages engineering portal from the public ProductShape site while reusing the current site source and content.
- Keep the Product Snapshot, ProductShape's Architecture Snapshot and E2E journey reports as distinct engineering outputs. Publish an output only when its source exists and identify its source revision or run where available.
- Publish the public site at the already-purchased `productshape.dev`, following the configured Raccord process: independent pull-request build validation and owner-controlled Cloudflare Pages publication/domain activation.
- Improve the public site with explanations of ProductShape's process and artifact relationships and source-linked Archify diagrams. Label conceptual explanations and mechanically derived information clearly.
- Keep ArcShape a separate product. ProductShape may use it in its own architecture-documentation workflow; this proposal does not build, package or offer ArcShape, and does not create a product dependency in either direction.

## Capabilities

### New Capabilities

- `engineering-publication`: publish and navigate the distinct ProductShape engineering outputs from a source-aware portal.
- `public-product-site`: explain ProductShape, its process and artifacts through the existing public site, with sourced diagrams and links to available engineering outputs.

### Modified Capabilities

None. Product Snapshot generation and the ProductShape brand contract remain unchanged; this change publishes the existing generated snapshot and improves the separate public site.

## Product definition impact

This proposal implements the applied Product Change `CHG-ARC42-SNAPSHOT-001`. The impact expansion was run for all eight artifacts it adds. Their direct and transitive neighbors are confined to the two reader journeys and requirements within `BC-PUBLICATION`; no existing model artifacts are modified.

<!-- pdac:cite id="FR-ENGINEERING-PORTAL-001" digest="sha256:641a6d2ae3bbb10951584e3b2b648ba12b59c8aebab1f0e6787aed751f53b1c5" -->
<!-- pdac:cite id="FR-PUBLIC-SITE-001" digest="sha256:3cb2c22372dc4696fedaf5ef88ed42158f828accc65a4fa45f46812ee5a1f20a" -->
<!-- pdac:cite id="TERM-ARCHITECTURE-SNAPSHOT" digest="sha256:c9f1eac6b0e1ce2cf346581418848ab28e977dbd2eeec64c96b28dbc12c68a4f" -->

The Product Snapshot remains the generated view of the Product Definition model. Its generation contract and the existing source-of-truth rules remain in force; the engineering portal links to that output rather than replacing or extending its generator.

<!-- pdac:cite id="FR-SNAPSHOT-001" digest="sha256:4b516c17b1b0895996d48135fa1729bd2cc20913f98a8d820d5a5c82a0310a5d" -->
<!-- pdac:cite id="UC-SNAPSHOT-001" digest="sha256:c0ccfa6c37694a43bfad609bc70cada84a512aa0d77db1611051f55bfc97bf58" -->
<!-- pdac:cite id="TERM-PRODUCT-SNAPSHOT" digest="sha256:a9c215c71a4fe379bb72c4b3ba6141957370ef1aea9cea5d0a0d66794f45e22a" -->
<!-- pdac:cite id="BR-CANONICAL-001" digest="sha256:7ed6dc7c588e0b79da8e6036548cf2fd2c6a1b02a9393f467f50cb0cb02475d6" -->
<!-- pdac:cite id="CON-MARKDOWN-001" digest="sha256:e1d4c39d7e5fc5f1a1573dbb6433986a26248289c9a97c11bb039db7af0f5c17" -->

The site must retain the distinction between ProductShape, the reference implementation, and Product Definition as Code, the methodology. The snapshot-specific accessibility requirements were checked and left out of the site capability because they govern `UC-SNAPSHOT-EXPLORE-001`, not the public marketing site.

<!-- pdac:cite id="CON-BRAND-001" digest="sha256:888e80751e04d389d5cee683c18fb47e1795a39dd8213454b16e09aa426be9cc" -->

Product definition drift: #296 requires explanatory diagrams to remain understandable without relying on colour alone, and published E2E reports to include their result. The applied publication requirements do not state those detailed conditions; preserve them visibly for the Product Engineer to decide during review.

<!-- pdac-drift ids="FR-PUBLIC-SITE-001,FR-ENGINEERING-PORTAL-001" summary="Issue #296 adds diagram accessibility and E2E result details to the applied publication requirements." -->

Other checked and unchanged neighbors: `QR-ACCESSIBILITY-001`, `QR-PRESENTATION-001` and `TERM-GRAPH-PROJECTION` remain specific to Product Snapshot exploration or product-graph projections and do not govern the new publication surfaces.

## Test plan and Definition of Done

The implementation plan covers builder-level tests for each output profile, base path, route inventory, sitemap and absent optional artifacts; workflow checks for independent publication; and an integration review of both deployed sites, links, locale switching, mobile layout, diagram accessibility and source metadata. Runtime evidence must come from the deployed previews and, after owner activation, the two production destinations.

Before the implementation PR is ready to merge, it must meet the repository Definition of Done: evidence for every acceptance criterion; all planned tasks completed or explicitly dropped with a reason; CI tests and runtime conformance passing; all blocking deterministic checks passing; security review when relevant; conformance to the approved design and relevant ADRs; required documentation and changelog updates; Product Definition and spec consistency; CI and runtime/visual evidence linked in the PR; maintainer review approval; and explicit known limitations. Product Change application alone does not establish implementation or deployment completion.

## Impact

- `scripts/build-public-site.mjs`, `site/content/`, `site/assets/` and `site/README.md`: retain the current public site and adapt its generated pages and assets for the public domain.
- `.github/workflows/snapshot.yml`: narrow the GitHub Pages publisher to engineering outputs, with distinct links for the Product Snapshot, Architecture Snapshot and E2E evidence when available.
- Product Snapshot output from `prodshape graph --format html`: publish the existing artifact without changing its generation contract.
- ProductShape architecture documentation and ArcShape's repository-level generation workflow: publish the Architecture Snapshot when the output exists; ArcShape itself remains outside this change.
- E2E publication inputs: integrate only report formats actually produced by a pipeline; do not fabricate a report or outcome.
- `productshape.dev`: public site destination, deployed through the existing Raccord publication process, with a separate preview and production lifecycle from GitHub Pages.
- Issue #295 informs Archify diagram choices. It does not authorize a new runtime or build dependency; diagrams must be static output unless separately approved.
