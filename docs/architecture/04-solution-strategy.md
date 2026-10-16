---
title: Solution Strategy
arc42-section: '04'
description: Fundamental approaches that shape the architecture and realize its drivers.
---

# Solution Strategy

| Driver | Strategy | Detailed view or ADR |
| --- | --- | --- |
| Product knowledge must remain reviewable | Markdown and YAML are canonical; generated graphs and snapshots are disposable | [ADR 0001](decisions/0001-markdown-is-canonical.md), [ADR 0002](decisions/0002-the-graph-is-derived.md) |
| Artifacts must remain linkable as files move | Stable identifiers own identity; paths are repository-relative locations | [ADR 0003](decisions/0003-stable-identifiers-over-paths.md) |
| Proposed product evolution must be inspectable before acceptance | Current model and Product Changes are separate; apply materializes a reviewed proposal on a branch | [ADR 0004](decisions/0004-current-model-and-changes-are-separated.md) |
| Product Definition must work across delivery methods | SDD integrations consume a common product-definition interface rather than defining product semantics | [ADR 0005](decisions/0005-product-definition-is-sdd-agnostic.md), [ADR 0006](decisions/0006-product-handoff-is-the-integration-contract.md) |
| Structural verdicts must be reproducible | Deterministic code validates structure; AI supports semantic reasoning; people approve meaning | [ADR 0007](decisions/0007-deterministic-core-and-ai-reasoning-are-separated.md) |
| Provider files must not become competing sources | Canonical skills and commands render provider-specific managed assets | [ADR 0008](decisions/0008-vendor-assets-are-generated.md) |
| Reference docs must track validation schemas | Generate reference material from the same schemas the CLI enforces | [ADR 0009](decisions/0009-reference-documentation-is-generated.md) |

The public site follows the same derived-output approach: its model explorer is generated from the accepted model, while informational pages and architecture views are authored in the repository and published as static files.
