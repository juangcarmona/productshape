---
title: Building Block View
arc42-section: '05'
description: Static decomposition, responsibilities, interfaces, and dependencies.
---

# Building Block View

## Whitebox Overall System

### Overview

ProductShape is a pnpm workspace whose published CLI bundles the core, distribution logic, and provider integrations. The repository also contains schemas, templates, canonical assistant skills, documentation, and the product model used to exercise the implementation against itself.

### Decomposition Rationale

The core owns deterministic model behavior. The CLI owns command parsing, orchestration, output, and exit codes. Distribution and integration packages translate canonical operations into repository or provider-specific files. This keeps provider details outside the core and leaves the normative PDaC contract in its separate specification.

### Contained Building Blocks

| Building block | Responsibility | Interfaces | Source location |
| --- | --- | --- | --- |
| Core | Parse artifacts; validate schemas and relationships; compile graph; plan changes; emit and verify citations | TypeScript library API | `packages/core/` |
| CLI | Commands, arguments, output formats, exit codes, command orchestration | `prodshape` binary | `packages/cli/` |
| Distribution | Initialize repositories and render/update managed assistant assets | CLI-internal package API | `packages/distribution/` |
| Provider integrations | Map canonical skills/commands to Claude, Copilot, Codex, and OpenCode paths | Renderer interfaces | `packages/integration-*` |
| SDD integrations | Configure OpenSpec and Spec Kit workflows around the product-definition interface | Integration package APIs | `packages/integration-openspec/`, `packages/integration-speckit/` |
| Schemas and templates | Authoring contracts and conformant examples | Files loaded by CLI or printed on demand | `schemas/`, `templates/` |
| Static site builder | Build separate public and engineering output profiles from shared localized content and static assets | Node build script | `scripts/build-public-site.mjs`, `site/` |

### Important Interfaces

Internal package edges are acyclic. Provider renderers are consumed through structurally typed interfaces; there is no shared provider-types package. The CLI is the supported public interface for repository operations, while each integration package also publishes its own package API.

## Level 2

### Whitebox: CLI operation

The CLI resolves the working repository, delegates model behavior to `core`, and delegates managed-file or provider configuration work to `distribution` and SDD integration packages. It formats results but does not make semantic product decisions.

### Whitebox: Publication assembly

The public profile builds the localized product pages, adoption guides and standalone diagrams for `productshape.dev`. The engineering profile copies the CLI-generated Product Snapshot and renders the twelve canonical arc42 Markdown sections for GitHub Pages. Neither output includes the other's primary content routes.
