---
id: CON-NO-GRAPH-DATABASE
type: constraint
title: The product graph must not require a graph database
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
---

## Constraint

The product graph is always derivable from the authored files by the toolkit alone. Neither authoring, validating, inspecting nor handing off product knowledge may require a graph database or any other running server; the graph exists as a regenerable artifact, never as a system that must be installed, operated or kept in sync.

## Rationale

The methodology must be adoptable by cloning a repository and running a command-line tool. Every piece of required infrastructure is an adoption tax and an operational liability: a graph database would need installation, upgrades, backups and synchronization with the files — and the instant it held anything the files did not, it would compete with them for truth. Keeping the graph a derived file preserves the canonical-source rule and keeps the whole toolkit runnable on a laptop, in CI and in an air-gapped environment alike.

## Consequences

- Impossible: any workflow that depends on a persistent graph service, live graph subscriptions, or graph state that cannot be rebuilt from the repository.
- Harder: ad-hoc graph queries are limited to what the tooling computes — inspection, impact analysis and the generated graph output — rather than an open query language; very large graphs are recompiled rather than incrementally served.
- Mandatory: the toolkit must be able to rebuild the complete graph from the authored files at any time, and adopters carry no server dependency of any kind for working with the product graph.
