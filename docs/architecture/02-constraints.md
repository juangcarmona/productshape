---
title: Architecture Constraints
arc42-section: '02'
description: Constraints that restrict architecture decisions and their consequences.
---

# Architecture Constraints

| Constraint | Source | Architectural consequence | Negotiable |
| --- | --- | --- | --- |
| Node.js 22 or newer; ESM TypeScript monorepo | Root `package.json`, workspace configuration | Packages target a shared Node runtime and use pnpm workspaces | Runtime baseline changes require a deliberate compatibility decision |
| Product definition is authored in repository files | [`CON-MARKDOWN-001`](../product/model/requirements/constraints/con-markdown-001.md) | No external system of record; outputs are rebuildable from authored files | No |
| No hosted product authoring or approval UI | [`CON-NO-WEB-UI`](../product/model/requirements/constraints/con-no-web-ui.md) | Public HTML is informational or a generated read-only projection; changes remain in files, CLI and review | No |
| Public framework content must not reveal private product information | [`CON-PUBLIC-GENERIC`](../product/model/requirements/constraints/con-public-generic.md) | Examples and adoption learnings must be generic or sanitized | No |
| Keep the deterministic core independent of providers | [ADR 0007](decisions/0007-deterministic-core-and-ai-reasoning-are-separated.md) and package boundaries | Provider behavior belongs in integration packages; core has no AI provider dependency | No |
| Avoid architectural weight that is not needed by a repository-first CLI | [Documented limitations](../limitations.md) and architecture decisions | No web framework or graph database in the CLI runtime; public pages are generated as static files | Revisit only with an explicit architecture decision |

The authoritative runtime and development dependency declarations live in the root and package `package.json` files; this view records the architectural constraint rather than duplicating their evolving inventory.

<!-- pdac:cite id="CON-MARKDOWN-001" digest="sha256:e1d4c39d7e5fc5f1a1573dbb6433986a26248289c9a97c11bb039db7af0f5c17" -->

<!-- pdac:cite id="CON-NO-WEB-UI" digest="sha256:467b7a87238629673c45dac7b72e85e4cb17a969cbcdbf6f4bf5d1711209ddbf" -->

<!-- pdac:cite id="CON-PUBLIC-GENERIC" digest="sha256:04056aaa5acf27088448f595de006f102303667410f3911c958c3d8a7da1653c" -->
