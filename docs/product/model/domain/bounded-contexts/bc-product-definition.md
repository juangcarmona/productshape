---
id: BC-PRODUCT-DEFINITION
type: bounded-context
title: Product Definition
status: active
---

## Responsibility

The language of describing and evolving a product as code: what a product artifact is, how
identity works, how artifacts relate to form the product graph, what the current product model
contains, how Product Changes propose evolution as overlays, and how deterministic validation
keeps all of it structurally sound. Everything that decides what the product definition means —
and how that meaning changes over time — belongs here.

## Language

Speech in this context is about knowledge and its evolution, not about delivery. Its core words
are artifact, identity, canonical, derived, graph, baseline, overlay, change, promotion,
diagnostic and validation. "Change" here always means a Product Change — a versioned semantic
delta with future-state artifacts — never a Git commit or a work item. "Valid" always means
deterministically checked against the published contracts, never a matter of judgment.

## Boundaries

Outside this context lie: the projection of product knowledge into delivery (slices, handoffs,
context documents, coverage and staleness), which belongs to Delivery Integration; SDD
frameworks' own specification and task workflows; backlog tools and their items; and source-code
structure — bounded contexts here are product-language boundaries, never implementation modules.
This context defines what changes mean; it does not schedule, assign or implement them.

## External Relationships

Delivery Integration is the sole downstream consumer of this context's output: approved Product
Changes and the current product model cross the boundary to be carved into slices and packaged
into handoffs. Feedback flows back across the same boundary — questions and contradictions
discovered during delivery return as open questions on the originating Product Change, where they
are resolved in this context's terms. Version control underlies the context as the provenance and
history mechanism, but carries no product semantics of its own.
