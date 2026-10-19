<!-- pdac-scope: cited -->

## Why

Issue [#300](https://github.com/juangcarmona/productshape/issues/300) completes the separated publication surfaces delivered in #296 / PR #297. The engineering landing has a minimal shell, architecture pages use public marketing navigation, and the public build reads architecture it does not publish; maintainers also lack an exact Cloudflare delivery handoff.

## What Changes

- Reuse one compact shell for public pages and engineering landing/architecture pages, with navigation appropriate to each reader and light/dark/system appearance.
- Keep public and engineering output boundaries independently buildable and validate first-party links at root and non-root paths.
- Retain an explicit top-level 404 and source metadata in the downloadable public build; validate before artifact upload.
- Document exact manual Cloudflare upload, preview, rollback and future owner-operated custom-domain activation. No deployment automation or account configuration is added.

## Capabilities

### New Capabilities

None. This completes existing publication behavior; it adds no product surface, package, provider, or generated Snapshot feature.

### Modified Capabilities

None. `skip_specs: true` is intentional: this is presentation/refactoring, build validation and operational documentation under the existing public-brand and snapshot-generation specifications plus the already-delivered `issue-296-publication-surfaces` engineering-publication/public-product-site deltas. No duplicate requirements or amendments to the accepted product definition are needed.

## Product definition impact

Implements the accepted artifacts of applied Product Change `CHG-ARC42-SNAPSHOT-001`, within #296's explicit bounded exception to roadmap #98. Publication readers, their use cases, the publication context and its two functional requirements define the scope.

<!-- pdac:cite id="FR-PUBLIC-SITE-001" digest="sha256:3cb2c22372dc4696fedaf5ef88ed42158f828accc65a4fa45f46812ee5a1f20a" -->
<!-- pdac:cite id="FR-ENGINEERING-PORTAL-001" digest="sha256:641a6d2ae3bbb10951584e3b2b648ba12b59c8aebab1f0e6787aed751f53b1c5" -->
<!-- pdac:cite id="UC-PUBLIC-SITE-001" digest="sha256:b769e277997dc9a03d676b6d13370ef0d24ab8c673aa159c04d4e0815ed297f2" -->
<!-- pdac:cite id="UC-ENGINEERING-PORTAL-001" digest="sha256:84771dc17d47b1c61bad40b17d915c6f318ee657de5640234ce9b22c97a26744" -->
<!-- pdac:cite id="BC-PUBLICATION" digest="sha256:8a171d419a25901a88ed4e53e5b34b0a5590ffd71e4a7e8721fc4411cf4801f5" -->

ProductShape remains the implementation and Product Definition as Code the methodology. Authored product/architecture files stay canonical; the existing generated Product Snapshot is copied byte-for-byte rather than wrapped, rewritten or given the site's appearance persistence.

<!-- pdac:cite id="CON-BRAND-001" digest="sha256:888e80751e04d389d5cee683c18fb47e1795a39dd8213454b16e09aa426be9cc" -->
<!-- pdac:cite id="BR-CANONICAL-001" digest="sha256:7ed6dc7c588e0b79da8e6036548cf2fd2c6a1b02a9393f467f50cb0cb02475d6" -->
<!-- pdac:cite id="CON-MARKDOWN-001" digest="sha256:e1d4c39d7e5fc5f1a1573dbb6433986a26248289c9a97c11bb039db7af0f5c17" -->
<!-- pdac:cite id="FR-SNAPSHOT-001" digest="sha256:4b516c17b1b0895996d48135fa1729bd2cc20913f98a8d820d5a5c82a0310a5d" -->

Impact discovery compared the model's artifact families to this delivery change before planning. `docs/delivery/ff/300/2026-10-19T1228Z/product-impact.json` records fresh inspect and impact output for all nine dependencies above. Checked neighbors left unchanged: ACT-PUBLIC-READER and ACT-ENGINEERING-READER (reader roles); TERM-ARCHITECTURE-SNAPSHOT (existing generated meaning); UC-SNAPSHOT-001 and TERM-PRODUCT-SNAPSHOT (unchanged generation); product definition and delivery-integration command artifacts (no CLI behavior changes). QR-ACCESSIBILITY-001 / QR-PRESENTATION-001 are Snapshot requirements, used as the existing visual reference for marketing and as binding existing obligations for the narrow Snapshot correction below. CON-NO-WEB-UI remains unchanged; no authoring, approval or stored product state is introduced.

Product definition drift: no new drift identified for this bounded completion. Existing #296 drift findings about diagram accessibility and E2E result detail remain visible in that proposal and are not silently resolved here.

## Impact

`scripts/build-public-site.mjs`, `site/assets/site.css`, `site/design-system.md`, `site/README.md`, publication workflow path filters/checks, site builder tests and a focused generated-output validator. Architecture content and canonical product artifacts are unchanged. The narrow CSS-only Snapshot correction below preserves its generation API/state/standalone contract. A source manifest is derived delivery metadata, never canonical content. No runtime/build dependency is required for site generation.

## Ready and documentation evidence

The issue supplies all thirteen configured Ready dimensions; priority is optional and no unknown blocks reversible work. External KB/attachment roles are absent, so repository docs and the self-contained issue are the available sources. PR #297 has no `docs/reviews/issue-296.md`; #296 remains open/in-progress despite its merged PR. Its unsynced OpenSpec delta and review debt are reported, not administratively closed or archived by #300.

## Definition of Done

Every acceptance criterion needs evidence; all tasks must be completed or explicitly dropped; configured CI and runtime checks must pass; relevant security, design/ADR conformance, documentation, coverage and known limitations require maintainer judgement; model/spec consistency needs deterministic checks and Product Engineer judgement when applicable. Link passing CI plus browser/visual evidence in the PR. Maintainer approval remains required before merge. Neither account setup, domain activation nor production publication is part of Done for this delivery-preparation issue.

## Plan amendment: narrow Snapshot presentation repair

Root browser evidence found an existing defect in the unchanged generated Product Snapshot at 390 CSS pixels: document scrollWidth was 604, the relationship matrix propagated its min-content width through the overview grid, and the single-row header clipped the system appearance button. The family cannot be considered usable on narrow screens with an inaccessible appearance choice.

Include the smallest CSS-only correction under the existing Snapshot responsive/presentation/accessibility obligations: constrain overview grid children so the existing matrix wrapper scrolls locally; lay out the narrow header in two rows so title, Overview/Artifacts navigation, search and all three appearance choices remain reachable at 320 and 390 pixels. Preserve every table cell/label and header control, URL-only state, generated data, API/CLI contract and byte-for-byte copying of the newly generated Snapshot. This is a scoped exception to the original no-generator-edit implementation boundary, not a new Snapshot feature. No script/routing, configurable title, attribution implementation or canonical artifact change is authorized.

<!-- pdac:cite id="QR-ACCESSIBILITY-001" digest="sha256:7694a090493fb8963717e168d1bba8d692e392d7b988a2850ab7357f53cb4f48" -->
<!-- pdac:cite id="QR-PRESENTATION-001" digest="sha256:d16a3c4eb8a38f0282d47a962ec3822bcd882f1910131d504ed0d2ed75352e88" -->
<!-- pdac:cite id="FR-SNAPSHOT-002" digest="sha256:426d0203a9491acef6dd97281ad967d545070f6fe14208ba5f77f13da2f8fc5a" -->

Impact now includes packages/core/src/snapshot.ts CSS, patch changesets for the core and CLI packages required by release drift, and browser regression checks/screenshots at 320/390px in both appearances. Extend the durable runtime harness to assert no document overflow, local matrix scroll/reachability, accessible header controls, search and appearance URL state with no storage/network dependency. Regenerate through the existing CLI, verify its Snapshot tests and copy equality. Independent review must approve this amendment before editing Snapshot source.
