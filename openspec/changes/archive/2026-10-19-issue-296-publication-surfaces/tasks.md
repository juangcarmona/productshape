<!-- pdac-scope: cited -->

# Tasks

## 1. Separate the site build outputs

<!-- pdac:cite id="FR-PUBLIC-SITE-001" digest="sha256:3cb2c22372dc4696fedaf5ef88ed42158f828accc65a4fa45f46812ee5a1f20a" -->
<!-- pdac:cite id="FR-ENGINEERING-PORTAL-001" digest="sha256:641a6d2ae3bbb10951584e3b2b648ba12b59c8aebab1f0e6787aed751f53b1c5" -->

- [x] 1.1 Refactor the site builder into public and engineering output profiles that share current authored content; verify each output has only its intended routes, navigation and sitemap entries.
- [x] 1.2 Add builder tests for root-domain versus GitHub Pages base paths, route exclusion, sitemap origin and missing optional inputs; verify the focused test suite passes.
- [x] 1.3 Update the site build and contributor documentation with both output commands and their destinations; verify documented commands produce the named output directories.

## 2. Publish source-identified engineering outputs

<!-- pdac:cite id="UC-ENGINEERING-PORTAL-001" digest="sha256:84771dc17d47b1c61bad40b17d915c6f318ee657de5640234ce9b22c97a26744" -->
<!-- pdac:cite id="TERM-ARCHITECTURE-SNAPSHOT" digest="sha256:c9f1eac6b0e1ce2cf346581418848ab28e977dbd2eeec64c96b28dbc12c68a4f" -->
<!-- pdac:cite id="FR-SNAPSHOT-001" digest="sha256:4b516c17b1b0895996d48135fa1729bd2cc20913f98a8d820d5a5c82a0310a5d" -->

- [x] 2.1 Add an engineering-output manifest for Product Snapshot, Architecture Snapshot and optional E2E reports; verify generated portal links and displayed source revisions, run identity and result match manifest values.
- [x] 2.2 Update the GitHub Pages workflow to build and publish only the engineering output, retaining the current Product Snapshot generation contract; verify workflow configuration and the uploaded artifact contain no public marketing routes.
- [x] 2.3 Document how the portal workflow builds its Architecture Snapshot from canonical documentation and how available E2E reports enter the manifest; verify the documented process omits unavailable reports rather than displaying placeholders.

## 3. Improve the public site content and diagrams

<!-- pdac:cite id="UC-PUBLIC-SITE-001" digest="sha256:b769e277997dc9a03d676b6d13370ef0d24ab8c673aa159c04d4e0815ed297f2" -->
<!-- pdac:cite id="CON-BRAND-001" digest="sha256:888e80751e04d389d5cee683c18fb47e1795a39dd8213454b16e09aa426be9cc" -->
<!-- pdac:cite id="BR-CANONICAL-001" digest="sha256:7ed6dc7c588e0b79da8e6036548cf2fd2c6a1b02a9393f467f50cb0cb02475d6" -->

- [x] 3.1 Revise the public pages to explain ProductShape, PDaC, the engineering lifecycle and the relationships between artifacts; verify English and Spanish pages preserve the ProductShape/product-method distinction and link only to available outputs.
- [x] 3.2 Add static Archify diagrams with source links, conceptual or derived labels, and meaning that does not depend on color alone; verify each published diagram resolves to its source and passes the site's accessibility checks. Archify `browser-check --require-provenance` passed on both diagrams across its supported viewports and theme states.
- [x] 3.3 Update public-site content guidance and diagram source/export instructions; verify a contributor can rebuild the static site without adding a browser diagram runtime or new CLI provider.

## 4. Configure and verify independent publication

<!-- pdac:cite id="BC-PUBLICATION" digest="sha256:8a171d419a25901a88ed4e53e5b34b0a5590ffd71e4a7e8721fc4411cf4801f5" -->
<!-- pdac:cite id="ACT-PUBLIC-READER" digest="sha256:48c4a11a55f2244a81962eb46d42b80dfcd0f68bf346f09242a835cb1d40b21f" -->

- [x] 4.1 Add independent public-site pull-request build validation and retain its output as a review artifact following Raccord's current process; verify the artifact is downloadable and GitHub Actions receives no Cloudflare deployment credential.
- [ ] 4.2 Prepare the `productshape.dev` Cloudflare Pages project and custom-domain setup under owner control, confirming the configured integration mode and proposed DNS/domain state before activation; verify HTTPS and the expected static site after owner activation.
- [ ] 4.3 Run an integration review of both live destinations, route/link inventories, locale switching, mobile layout and available source metadata; capture the evidence and verify the public site and engineering portal remain independently deployable.

## Workflow follow-up

- Archive the OpenSpec change after review and implementation tasks are complete.
- Refresh citations if implementation changes any cited Product Definition behavior; validate and apply any separately approved Product Change before updating the canonical model.
