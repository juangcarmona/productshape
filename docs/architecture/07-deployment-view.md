---
title: Deployment View
arc42-section: '07'
description: Runtime infrastructure and the mapping of software building blocks onto it.
---

# Deployment View

## Infrastructure Level 1

### Overview

ProductShape has two delivery forms: the npm-distributed CLI used in adopter repositories, and this repository's static public documentation site. The site build also generates and includes a read-only Product Snapshot. No ProductShape application server is deployed.

### Topology Rationale

The CLI runs locally in the repository it operates on. GitHub Actions builds the documentation site from tracked sources and deploys static output to GitHub Pages after a merge to `main` or a manual workflow dispatch.

### Quality and Performance Characteristics

Static hosting avoids a runtime service for public documentation. The explorer file remains self-contained and read-only. The npm package bundles its runtime dependencies and CLI assets.

### Building Block Mapping

| Building block or artifact | Infrastructure element | Environment |
| --- | --- | --- |
| `@prodshape/cli` and bundled packages | npm registry; installed into adopter repository | Consumer development and CI |
| Product model, source, schemas, docs | Git repository | Authoring and review |
| Snapshot generator and site builder | GitHub Actions runner | Build job |
| `_site/` static output | GitHub Pages | Public documentation |
| Generated model explorer | `_site/en/model/explorer.html` | Public, read-only model view |

<!-- pdac:cite id="CON-NO-WEB-UI" digest="sha256:467b7a87238629673c45dac7b72e85e4cb17a969cbcdbf6f4bf5d1711209ddbf" -->

## Infrastructure Level 2

The GitHub Pages workflow installs workspace dependencies, builds the CLI packages, generates the snapshot from `docs/product/model`, assembles the complete static site, uploads one Pages artifact, and deploys that artifact. Deployment concurrency ensures one active Pages publish for this repository.
