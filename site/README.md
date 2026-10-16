# ProductShape public site

The site is a buildless static source under `site/`. Localized page copy lives in `content/en.json` and `content/es.json`; shared presentation is in `assets/site.css`. `scripts/build-public-site.mjs` assembles localized pages, turns the twelve canonical arc42 Markdown sections into navigable pages, and includes the generated Product Snapshot.

Build it after the CLI workspace build and snapshot generation:

```bash
node packages/cli/dist/bin.js graph --format html
node scripts/build-public-site.mjs --out _site --base-path /productshape/
```

Use `--base-path / --site-origin https://example.com` when serving the built output at a domain root, such as Cloudflare Pages or a custom domain. The GitHub Pages project site uses `/productshape/` and the default GitHub Pages origin.

The website is informational and static. The product model explorer is copied from `.product/generated/snapshot.html`; it is not edited in the site source. The first implementation is the reuse pilot. Extract shared components only after the ProductShape, Raccord, and DomusMind needs have been compared.

## Product identity and guidance

ProductShape is the branded reference implementation. Product Definition as Code (PDaC) names the methodology and normative specification. This distinction is defined by [`CON-BRAND-001`](../docs/product/model/requirements/constraints/con-brand-001.md) and is reflected in the header and footer. The ProductShape lockup and icon come from the repository's [`assets/branding.png`](../assets/branding.png) and [`assets/product_shape_icon.png`](../assets/product_shape_icon.png); the PDaC mark comes from the specification site's `src/assets/pdac.png`.

Public onboarding follows the canonical [product model index](../docs/product/model/index.md), [adoption journey](../docs/product/model/journeys/jrn-adopt-001.md), and [initialization use case](../docs/product/model/use-cases/uc-init-001.md). The site links to the authored model and generated snapshot so product claims and instructions can be checked against canonical sources.

## Visual language

ProductShape's logo establishes a technical blueprint identity: white drawing surfaces, blue ink, and fine drafting lines. The public site uses that direction with a white canvas, a faint blue grid, square controls, and a system sans-serif stack. Shared colors and spacing live in [`assets/site.css`](assets/site.css); no web font is downloaded. The presentation requirement [`QR-PRESENTATION-001`](../docs/product/model/requirements/quality/qr-presentation-001.md) governs the generated model explorer specifically. It describes the explorer's compact, text-first interface and is a useful reference, but it is not a complete design system for the public marketing site.

## Engineering reader

Each arc42 section is a static HTML page with a sticky, collapsible section index, a current-section indicator, previous/next links, a source link, and a link to the Architecture Decision Records. On narrow screens the index becomes a collapsible panel above the article. The layout borrows the reading pattern used by the DomusMind engineering snapshot while keeping ProductShape's own content, colors, and routes.

## Adoption guides

The site renders the three general adoption guides directly from `docs/adoption/greenfield.md`, `brownfield.md`, and `existing-repository.md`. These Markdown files stay canonical; the site build turns them into readable, navigable HTML pages in English and Spanish routes. The guide text is currently maintained in English, and Spanish pages say so. OpenSpec and Spec Kit integration guides remain linked as supporting repository documents.
