---
id: BC-PRODUCT-DEFINITION
type: bounded-context
title: Product Definition
status: active
---

## Responsibility

The language of describing and evolving a product as code: what a product artifact is, how identity works, how artifacts relate to form the product graph, what the current product model contains, how Product Changes propose evolution as overlays, and how deterministic validation keeps all of it structurally sound. Everything that decides what the product definition means — and how that meaning changes over time — belongs here.

## Language

Speech in this context is about knowledge and its evolution, not about delivery. Its core words are artifact, identity, canonical, derived, graph, baseline, overlay, Product Change, approval, apply, acceptance, diagnostic and validation. A Product Change is a versioned semantic delta with future-state artifacts, never a Git commit, pull request or work item. "Valid" means deterministically checked against the published contracts; "approved" is a human product decision; "applied" means materialized on a working branch; and "accepted" means present on the canonical branch after merge.

## Boundaries

Outside this context lie: citations and framework-specific configuration, which belong to Delivery Integration; SDD frameworks' own specification and task workflows; backlog tools and their items; and source-code structure — bounded contexts here are product-language boundaries, never implementation modules. This context defines what changes mean; it does not schedule, assign, implement, verify, release or deploy them.

## External Relationships

Any downstream document may consume accepted product artifacts through citations. Delivery Integration supplies that binding and framework-specific configuration without writing product semantics. Questions and contradictions discovered during delivery return as requests for a new or active Product Change; they never silently alter the baseline. Product-definition work and implementation work may share a pull request or proceed at different times, but their decisions and evidence remain separate. Version control provides provenance and review history, while the Product Change records semantic intent.
