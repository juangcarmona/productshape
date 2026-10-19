# ProductShape publication sites

The Astro publication project lives under `src/public-site/`. Localized copy lives in `content/en.json` and `content/es.json`; Astro components live in `src/`; shared presentation lives in `assets/site.css`. One Astro builder creates two independent outputs while the compatibility content compiler preserves the existing rendered appearance:

```bash
# Public ProductShape site for productshape.dev
node src/scripts/build-public-site.mjs --profile public --out dist/public-site --base-path / --site-origin https://productshape.dev

# Engineering portal for GitHub Pages
node src/packages/cli/dist/bin.js graph --format html --product-url https://productshape.dev
node src/scripts/build-public-site.mjs --profile engineering --out _site --base-path /productshape/ --site-origin https://juangcarmona.github.io
```

Validate the same directories that will be uploaded:

```bash
node src/scripts/validate-public-site.mjs --dir dist/public-site --profile public --base-path / --site-origin https://productshape.dev
node src/scripts/validate-public-site.mjs --dir _site --profile engineering --base-path /productshape/ --site-origin https://juangcarmona.github.io

# Browser/runtime evidence (requires a Chromium-family browser)
node src/scripts/check-public-site-browser.mjs --dir dist/public-site --profile public --base-path / --evidence-dir dist/public-site-browser
node src/scripts/check-public-site-browser.mjs --dir _site --profile engineering --base-path /productshape/ --evidence-dir engineering-browser-evidence
```

`publication.json` records the profile, base path, origin, CLI version, full source revision and dirty state. A local uncommitted build is explicitly marked dirty. The public builder needs no generated engineering output or architecture input. The engineering output copies the generated standalone Snapshot byte-for-byte; its attribution URL is selected at generation time with the existing option shown above.

The browser check serves a built directory locally, verifies representative routes in both profiles, checks renderer markers and source surfaces, exercises dark/system appearance, narrow navigation and keyboard focus, and captures route screenshots plus a JSON manifest. When given `--baseline-dir`, it also compares the representative Astro shell HTML byte-for-byte with the legacy compatibility output. CI uploads these files as review evidence; they do not represent a production deployment.

Public and engineering pages reuse the compact shell, theme assets and keyboard/mobile controls. Public navigation serves localized product/process/adoption content; engineering navigation distinguishes the portal, Product Snapshot, Architecture Snapshot and external public site. The standalone Snapshot owns its own interface and URL state.

For exact CI artifact layout, future manual Cloudflare preview/upload, rollback and custom-domain steps, use the [publication runbook](../docs/operations/public-site-deployment.md). No public deployment runs in GitHub Actions.

To preview either static output locally, serve the selected build directory:

```bash
python3 -m http.server 4173 --directory dist/public-site
python3 -m http.server 4174 --directory _site
```

The engineering preview requires its generated Product Snapshot first. The source manifest is optional locally; CI supplies it as shown in the deployment workflow. To preview its `/productshape/` base path, serve a parent directory containing a `productshape` folder, or rebuild locally with `--base-path /` and validate with the same base. Python serves ordinary files; use local Wrangler Pages development to check Cloudflare-specific 404 routing.

The public site contains the localized product pages, adoption guides and static Archify diagrams. It links to the Product Snapshot and engineering portal on GitHub Pages; it does not include the model explorer or architecture routes in its output or sitemap.

The engineering portal contains the generated Product Snapshot and the current twelve-section ProductShape architecture documentation. It does not contain the public product pages. E2E reports are optional and are listed only when a pipeline supplies the manifest and report files described in [`docs/operations/public-site-deployment.md`](../docs/operations/public-site-deployment.md).

## Astro, locales and diagrams

`src/pages/[...path].astro` is the static route shell. It enumerates the profile output produced by the deterministic compatibility compiler, allowing Astro to own the final build while keeping route HTML stable during the migration. `site.config.mjs` is the locale registry: adding a locale adds one content file and one configuration entry, not a page-template copy. A locale may name a fallback; the builder deep-merges missing localized values from that fallback (English is the current fallback).

Authored Mermaid views use fenced `mermaid` blocks in Markdown and the `Mermaid` component. They can be rendered to static SVG with:

```bash
node src/scripts/render-mermaid.mjs --input src/public-site/diagrams --output dist/mermaid
```

Publication workflows set `MERMAID_RENDER=1` so the Astro build also places the generated SVGs under `assets/mermaid/`. Local builds leave rendering opt-in because Mermaid CLI needs a Chromium runtime; the source and HTML fallback remain available without that browser dependency.

The renderer accepts `.md`/`.markdown` documents with fenced Mermaid blocks as well as legacy `.mmd` files. Archify artifacts use the `Archify` component and are checked-in static HTML. Both components expose the renderer and source link; diagrams are explanatory views and never canonical Product Model data. Both renderer routes are built for the public and engineering profiles, and the published artifact must not require a production network service or client-side fetch.

## Product identity and canonical sources

ProductShape is the branded reference implementation. Product Definition as Code (PDaC) names the methodology and normative specification. The distinction is defined by [`CON-BRAND-001`](../docs/product/model/requirements/constraints/con-brand-001.md). Public onboarding follows the canonical [product model index](../docs/product/model/index.md), [adoption journey](../docs/product/model/journeys/jrn-adopt-001.md), and [initialization use case](../docs/product/model/use-cases/uc-init-001.md).

## Archify diagrams

Candidate JSON sources live in `.archify/`; delivered standalone HTML lives in `src/public-site/diagrams/`. The public page labels these diagrams as conceptual explanations and links to the canonical product and architecture sources. Regenerate an artifact with the official Archify CLI after updating its candidate and pinned repository revision; Archify remains an external artifact producer, while the optional Mermaid SVG step is the only publication path that needs a browser runtime. Review the diagram's source links, non-colour labels, mobile layout and captions before publishing.

## Visual language and adoption guides

ProductShape's logo establishes a technical blueprint identity: white drawing surfaces, blue ink, fine drafting lines, and a system sans-serif stack. The model explorer's [`QR-PRESENTATION-001`](../docs/product/model/requirements/quality/qr-presentation-001.md) informs its own compact, text-first interface; it is not the whole site's design system.

The three general adoption guides are rendered from `docs/adoption/greenfield.md`, `brownfield.md`, and `existing-repository.md`. Their Markdown remains canonical; the site turns them into readable HTML pages in English and Spanish routes. The guide text is maintained in English, and Spanish pages say so.
