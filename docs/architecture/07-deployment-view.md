---
title: Deployment View
arc42-section: '07'
description: Runtime infrastructure and the mapping of software building blocks onto it.
---

# Deployment View

## Infrastructure Level 1

### Overview

ProductShape has two delivery forms: the npm-distributed CLI used in adopter repositories, and two static publication sites. The public site is served at `productshape.dev`; the engineering portal is served by this repository's GitHub Pages project and includes the read-only Product Snapshot. No ProductShape application server is deployed.

### Topology Rationale

The CLI runs locally in the repository it operates on. GitHub Actions builds the engineering portal from tracked sources and deploys its static output to GitHub Pages after a merge to `main` or a manual workflow dispatch. Cloudflare Pages builds and deploys the public site through its Git integration, including pull-request previews.

### Quality and Performance Characteristics

Static hosting avoids a runtime service for public documentation. The explorer file remains self-contained and read-only. The npm package bundles its runtime dependencies and CLI assets.

### Building Block Mapping

| Building block or artifact | Infrastructure element | Environment |
| --- | --- | --- |
| `@prodshape/cli` and bundled packages | npm registry; installed into adopter repository | Consumer development and CI |
| Product model, source, schemas, docs | Git repository | Authoring and review |
| Snapshot generator and engineering site builder | GitHub Actions runner | Engineering portal build job |
| `_site/` engineering output | GitHub Pages | Product Snapshot and engineering documentation |
| Public site builder (`pnpm run build:public-site`) | Cloudflare Pages Git integration | Public-site builds and pull-request previews |
| `dist/public-site/` static output | Cloudflare Pages | Public ProductShape site |
| Generated model explorer | `_site/en/model/explorer.html` | Engineering portal's read-only Product Snapshot |

<!-- pdac:cite id="CON-NO-WEB-UI" digest="sha256:467b7a87238629673c45dac7b72e85e4cb17a969cbcdbf6f4bf5d1711209ddbf" -->

## Infrastructure Level 2

The engineering workflow installs workspace dependencies, builds the CLI packages, generates the snapshot from `docs/product/model`, assembles only engineering routes, uploads one Pages artifact, and deploys it. Cloudflare's native Git integration builds public-site commits using the root build command and publishes the configured output; GitHub Actions does not build or deploy the public site.
