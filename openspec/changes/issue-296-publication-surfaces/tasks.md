<!-- pdac-scope: cited -->

# Tasks

## 1. Separate the site build outputs

<!-- pdac:cite id="FR-PUBLIC-SITE-001" digest="sha256:e6dacb5123f6efa209e9cae09b6142e7f425c772dc3d57343cb392cb4a8e9ce6" -->
<!-- pdac:cite id="FR-ENGINEERING-PORTAL-001" digest="sha256:776b90f97bc43930e3198ef0d4a2d2d548ee40c2cb75359e56a845f4d3ff5984" -->

- [x] 1.1 Refactor the site builder into public and engineering output profiles that share current authored content; verify each output has only its intended routes, navigation and sitemap entries.
- [x] 1.2 Add builder tests for root-domain versus GitHub Pages base paths, route exclusion, sitemap origin and missing optional inputs; verify the focused test suite passes.
- [x] 1.3 Update the site build and contributor documentation with both output commands and their destinations; verify documented commands produce the named output directories.

## 2. Publish source-identified engineering outputs

<!-- pdac:cite id="UC-ENGINEERING-PORTAL-001" digest="sha256:20e19b0a264d92c197cc619352bbd1104e2616a390ada65325fbb320ba13a4f1" -->
<!-- pdac:cite id="TERM-ARCHITECTURE-SNAPSHOT" digest="sha256:9486c0a1757c644e227b4d369f0747b1e8f2d1b20df33c647770b3c66b551e60" -->
<!-- pdac:cite id="FR-SNAPSHOT-001" digest="sha256:4b516c17b1b0895996d48135fa1729bd2cc20913f98a8d820d5a5c82a0310a5d" -->

- [x] 2.1 Add an engineering-output manifest for the Product Snapshot and optional Architecture Snapshot and E2E reports; verify generated portal links and displayed source revision, run identity and result match manifest values.
- [ ] 2.2 Update the GitHub Pages workflow to build and publish only the engineering output, retaining the current Product Snapshot generation contract; verify workflow configuration and the uploaded artifact contain no public marketing routes.
- [x] 2.3 Document how ProductShape's architecture pipeline supplies its snapshot and how available E2E reports enter the manifest; verify the documented process omits unavailable reports rather than displaying placeholders.

## 3. Improve the public site content and diagrams

<!-- pdac:cite id="UC-PUBLIC-SITE-001" digest="sha256:ed15f48fd98ebd974677c1f39b2386e5e509746a7bcb95f0ef63f651b0bae979" -->
<!-- pdac:cite id="CON-BRAND-001" digest="sha256:888e80751e04d389d5cee683c18fb47e1795a39dd8213454b16e09aa426be9cc" -->
<!-- pdac:cite id="BR-CANONICAL-001" digest="sha256:7ed6dc7c588e0b79da8e6036548cf2fd2c6a1b02a9393f467f50cb0cb02475d6" -->

- [x] 3.1 Revise the public pages to explain ProductShape, PDaC, the engineering lifecycle and the relationships between artifacts; verify English and Spanish pages preserve the ProductShape/product-method distinction and link only to available outputs.
- [x] 3.2 Add static Archify diagrams with source links, conceptual or derived labels, and meaning that does not depend on color alone; verify each published diagram resolves to its source and passes the site's accessibility checks.
- [x] 3.3 Update public-site content guidance and diagram source/export instructions; verify a contributor can rebuild the static site without adding a browser diagram runtime or new CLI provider.

## 4. Configure and verify independent publication

<!-- pdac:cite id="BC-PUBLICATION" digest="sha256:00620db94f270da49c3524648069bb2feb9baca443be3d00499d707e8ed21b21" -->
<!-- pdac:cite id="ACT-PUBLIC-READER" digest="sha256:6324c7eb27ca7a22f1a2947e11b26d20b5eb385ed5d4c705fc4f30195e09f10c" -->

- [ ] 4.1 Add independent public-site pull-request build validation and retain its output as a review artifact following Raccord's current process; verify the artifact is downloadable and GitHub Actions receives no Cloudflare deployment credential.
- [ ] 4.2 Prepare the `productshape.dev` Cloudflare Pages project and custom-domain setup under owner control, confirming the configured integration mode and proposed DNS/domain state before activation; verify HTTPS and the expected static site after owner activation.
- [ ] 4.3 Run an integration review of both live destinations, route/link inventories, locale switching, mobile layout and available source metadata; capture the evidence and verify the public site and engineering portal remain independently deployable.

## Workflow follow-up

- Archive the OpenSpec change after review and implementation tasks are complete.
- Refresh citations if implementation changes any cited Product Definition behavior; validate and apply any separately approved Product Change before updating the canonical model.
