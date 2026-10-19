<!-- pdac-scope: cited -->

## Context

See [proposal.md](proposal.md) for intent and boundaries. The current builder already distinguishes public and engineering routes and copies the standalone Product Snapshot. `engineeringPortalPage` bypasses the public shell, while architecture sections use it. One shared stylesheet already carries the Snapshot-derived compact tokens. The architecture read/parse step currently runs for both profiles.

## Goals / Non-Goals

**Goals:** one reusable rendering path with profile-aware links; independently validated output; a review artifact that the owner can upload manually with known provenance and 404 behavior.

**Non-Goals:** no canonical product/architecture edits, no Snapshot wrapper or generation contract change beyond the narrow CSS repair below, no new publication service, no deployment job, no credentials or domain action. Sharing presentation never transfers canonical ownership.

<!-- pdac:cite id="BC-PUBLICATION" digest="sha256:8a171d419a25901a88ed4e53e5b34b0a5590ffd71e4a7e8721fc4411cf4801f5" -->
<!-- pdac:cite id="BR-CANONICAL-001" digest="sha256:7ed6dc7c588e0b79da8e6036548cf2fd2c6a1b02a9393f467f50cb0cb02475d6" -->
<!-- pdac:cite id="CON-MARKDOWN-001" digest="sha256:e1d4c39d7e5fc5f1a1573dbb6433986a26248289c9a97c11bb039db7af0f5c17" -->
<!-- pdac:cite id="FR-SNAPSHOT-001" digest="sha256:4b516c17b1b0895996d48135fa1729bd2cc20913f98a8d820d5a5c82a0310a5d" -->

## Decisions

### One shell with reader-specific navigation

Route engineeringPortalPage through the existing shell (or a small reusable helper extracted only if needed). Public navigation retains localized product/process/adoption entries and explicit engineering destinations. Engineering navigation contains Engineering portal, Product Snapshot, Architecture Snapshot and the external Public site, plus repository link. Architecture overview and all twelve sections use the same shell and appearance controls; select the appropriate active destination without pretending the engineering portal is localized into Spanish. Keep architecture sidebar and article content intact. Public languages preserve their current matching routes; engineering does not invent translated engineering pages.

Keep one accessible mobile menu behavior and one theme/asset behavior, using existing compact tokens. Header search explicitly means Search product and links to the existing Snapshot search affordance; no new search engine is introduced. Do not add a keyboard shortcut hint unless the action works in the containing page. Standalone Snapshot continues to own its URL-only state and generated header. The engineering workflow passes the existing `--product-url https://productshape.dev` option so its attribution reaches the public product destination; this changes only the publisher invocation, and the resulting generated file is still copied unchanged. Site pages may retain their current local appearance preference; never inject that behavior into the Snapshot.

Alternative: duplicate a second engineering shell. Rejected because themes, assets, responsive behavior and accessibility would drift. Alternative: wrap/rewrite Snapshot to share runtime code. Rejected because it violates its standalone artifact boundary.

<!-- pdac:cite id="CON-BRAND-001" digest="sha256:888e80751e04d389d5cee683c18fb47e1795a39dd8213454b16e09aa426be9cc" -->
<!-- pdac:cite id="UC-PUBLIC-SITE-001" digest="sha256:b769e277997dc9a03d676b6d13370ef0d24ab8c673aa159c04d4e0815ed297f2" -->
<!-- pdac:cite id="UC-ENGINEERING-PORTAL-001" digest="sha256:84771dc17d47b1c61bad40b17d915c6f318ee657de5640234ce9b22c97a26744" -->
<!-- pdac:cite id="FR-SNAPSHOT-001" digest="sha256:4b516c17b1b0895996d48135fa1729bd2cc20913f98a8d820d5a5c82a0310a5d" -->

### Build only profile-owned inputs

Move architecture discovery/validation/rendering under the engineering path. Public requires localized site copy, adoption guides and its static assets; no architecture directory, snapshot or engineering manifest is needed. Engineering still validates all twelve canonical section inputs and provenance and publishes only available optional E2E reports. Canonical text is rendered from the existing sources without copying it into site content.

Alternative: make a second standalone public builder. Rejected because it duplicates route, locale and asset behavior.

<!-- pdac:cite id="FR-PUBLIC-SITE-001" digest="sha256:3cb2c22372dc4696fedaf5ef88ed42158f828accc65a4fa45f46812ee5a1f20a" -->
<!-- pdac:cite id="FR-ENGINEERING-PORTAL-001" digest="sha256:641a6d2ae3bbb10951584e3b2b648ba12b59c8aebab1f0e6787aed751f53b1c5" -->

### Validate the artifact that will be uploaded

Add a dependency-free generated-output validation script, runnable against either profile with explicit directory/base/origin. Inventory emitted files rather than trusting a hand-maintained route list alone. Check required/forbidden routes, all local first-party href/src references (including CSS URLs and same-origin absolute URLs), sitemaps, generated metadata and presence of top-level index.html/404.html for public. Treat external marketing/engineering/repository destinations as external links: assert their expected host/path in deterministic tests and record live availability separately. Do not require network access for build validation or fabricate availability of E2E outputs.

Emit a small publication manifest in each output: schema version, profile, base path, site origin, CLI version and full source revision. GITHUB_SHA identifies the workflow source; local git HEAD plus an explicit dirty flag identifies local output. Never claim an uncommitted build exactly represents a clean commit. Repeated builds of identical inputs and source metadata produce identical output metadata (no wall-clock timestamp). Validate and upload the same public directory. GitHub artifact ZIP has index.html, 404.html, assets/, en/, es/, robots.txt, sitemap.xml and publication manifest at its root; no wrapper directory is required. A top-level 404 prevents Cloudflare's automatic SPA fallback for absent architecture/model routes.

Add validation to public and engineering build workflows and their path filters for any new helper/check input; no deployment trigger or credential is added. Add tests to the existing Vitest suite. Public build remains dependency-free; if a validator needs parser support, implement the constrained generated-markup checks using Node built-ins rather than introducing npm install into the public workflow.

Alternative: rely only on build exit status. Rejected because success does not establish link integrity or profile boundaries. Alternative: add an automated Cloudflare publish workflow. Rejected because manual publication remains owner-operated and account mode is unknown.

### Exact owner-operated handoff

Document tested clean local commands and CI artifact download/unpack shape, then two conditional paths: dashboard folder/ZIP only for a Direct Upload project; Wrangler folder upload for Direct Upload or an existing Git-integrated project. Confirm project name/mode/account before any owner upload. Explain that Direct Upload cannot switch to Git integration in the same project. Use explicit preview branch instructions before a production upload; review canonical SEO origin on preview. Document production branch selection and restore/redeploy of the prior known-good artifact without promising an account capability already exists.

The owner activates productshape.dev through Pages Custom domains > Set up a domain; an apex domain requires the same-account zone and Cloudflare nameservers. Associate the domain before DNS CNAME actions. Link official references and separate future hosted/domain verification from local evidence. The current wrangler.jsonc project name is a default to verify, not an asserted account fact. No local deployment or DNS command is executed during this run.

Official references (checked 2026-10-19): [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [Pages commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/), [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/), [serving pages and 404 behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/).

## Risks / Trade-offs

- [Profile shell mixes destinations] → root/subpath inventory and local-link validation; explicit external surface links.
- [Theme and mobile controls regress] → real Chromium interaction at desktop/narrow sizes, both appearances and system preference, including Escape and focus behavior.
- [Standalone Snapshot contract accidentally changes] → exact byte comparison of copied Snapshot and only the independently approved narrow CSS correction in the generator.
- [Regex-based generated-markup validation misses arbitrary HTML] → limit it to known generated URL attributes and stylesheet URLs, use positive/negative fixture tests, and retain browser navigation checks. This is a site validator, not a general HTML parser.
- [Unknown Cloudflare project mode/domain readiness] → conditional runbook and explicit owner verification before publication; no hosted-preview claim.
- [Review artifact expires] → document seven-day CI retention and preserve the reviewed artifact/source identity before owner activation.

## Migration Plan

1. Validate local output and retain browser evidence; push a PR branch so CI retains independently built artifacts.
2. Complete independent FF audit and stop for human-owned Done judgements and maintainer merge approval. No production publication in this task.
3. After owner authorization, verify account/project mode, upload a preview and inspect root/deep links/404 in the hosted environment.
4. Owner chooses production upload and later custom-domain activation, checking TLS, canonical URLs and cross-surface links. Roll back by restoring the prior retained deployment/artifact; no source rewriting is required.

## Test Plan

- Builder integration: public root and subpath; engineering root and subpath; every emitted first-party link/asset; correct canonical/sitemap origins; root 404; forbidden model/architecture public routes and marketing engineering routes.
- Isolated public fixture: copy the minimum public source inputs to a temporary repository shape without docs/architecture or generated snapshots/manifests; build and validate successfully. Do not rename shared checkout directories in tests.
- Provenance: clean/full workflow revision, local dirty flag, matching manifest profile/base/origin; byte-identical copied Snapshot; twelve sections/source links preserved; unavailable E2E reports omitted and existing valid/invalid manifest fixtures retained.
- Validator negative fixtures: missing CSS/image/local page, incorrect base/origin, leaked engineering route, absent/invalid metadata or 404. Avoid exact-string tests that simply mirror shell markup.
- Real Chromium: public English/Spanish, portal, architecture overview and representative section, generated Snapshot. Desktop/narrow light/dark screenshots; choose light/dark/system, simulate system preference, verify theme assets; mobile menu keyboard activation, expansion, Escape/focus return and route following; no horizontal overflow or console errors. Validate all twelve section links programmatically.
- All repository deterministic checks from engineering-lifecycle.md and current workflow definitions; record commands/results plus passing CI URL for the final head. Browser evidence is local until a hosted preview is owner-authorized; state this limit explicitly.

## Amended design: contain existing Snapshot narrow layout

An unchanged baseline Snapshot measured 604px document scroll width at a 390px viewport and clipped a header appearance control. Restrict the repair to the existing CSS string in packages/core/src/snapshot.ts: give overview grid children min-width:0 so `.gridwrap` retains local horizontal overflow; at the existing narrow breakpoint use a two-row header layout with all search/navigation/appearance controls visible. Preserve table semantics/content, JS/router, generation options, no-storage/no-network guarantees and standalone output. The publisher still copies the regenerated file exactly. No new ADR is needed for this existing-responsive-behavior correction.

<!-- pdac:cite id="QR-ACCESSIBILITY-001" digest="sha256:7694a090493fb8963717e168d1bba8d692e392d7b988a2850ab7357f53cb4f48" -->
<!-- pdac:cite id="QR-PRESENTATION-001" digest="sha256:d16a3c4eb8a38f0282d47a962ec3822bcd882f1910131d504ed0d2ed75352e88" -->
<!-- pdac:cite id="FR-SNAPSHOT-002" digest="sha256:426d0203a9491acef6dd97281ad967d545070f6fe14208ba5f77f13da2f8fc5a" -->

Test at 320px and 390px in light/dark: document width stays within viewport; the complete matrix remains reachable by its local horizontal scroll; all three appearance buttons and the search button can be focused/activated; Overview/Artifacts links work; appearance remains in the URL with empty browser storage. Run existing Snapshot tests and full deterministic checks, plus patch changesets for core/CLI. This amendment requires independent plan approval before the CSS edit.
