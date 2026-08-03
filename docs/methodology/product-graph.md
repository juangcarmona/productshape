# The product graph

The relationships are the methodology. This page explains how the graph works from a practitioner's point of view; the exact vocabulary and rules are normative in [Relationships](../specification/relationships.md).

## Artifacts are nodes, frontmatter references are edges

Every product artifact — actor, journey, use case, rule, term, context, requirement — is a node. Every typed reference declared in an artifact's frontmatter is an edge. When a use case declares:

```yaml
---
id: UC-VALIDATE-001
type: use-case
title: Validate the product model
status: active
primary-actor: ACT-PRODUCT-ENGINEER
governed-by: [BR-DETERMINISM-001]
uses-terms: [TERM-DIAGNOSTIC]
---
```

it creates three kinds of edges: to its actor, to a governing rule, and to a domain term. Nothing else is needed. There is no separate graph file to maintain, no modeling tool, no import step. You write Markdown; the graph is a consequence.

## One canonical direction, all reverse views derived

Every relationship has exactly one authored direction. The reverse is always computed by the graph compiler and never written by hand.

The clearest example is term ownership. A Domain Term declares where it is defined:

```yaml
id: TERM-PRODUCT-HANDOFF
type: domain-term
defined-in: BC-DELIVERY
```

`defined-in` is canonical. The reverse — a Bounded Context's `owns-terms` — is derived: a context's owned terms are exactly the terms whose `defined-in` points at it. You never author `owns-terms`; the schema rejects it if you try. Tooling may still _display_ it in inspection output and generated indexes, because the derived view is useful — it just is not yours to maintain.

The same rule covers every pair: which journeys involve an actor, which use cases a rule governs, which requirements derive from a use case. Author once, in the canonical direction; read in both. This is why the definition never suffers the classic wiki failure of reciprocal links drifting out of sync — there is nothing reciprocal to drift.

## Compiled, always rebuildable

The graph is compiled from the canonical Markdown (and slice YAML) every time it is needed. It is a derived output, like a build artifact: reproducible, disposable, never edited, never a prerequisite of its own rebuild. Delete every generated file and the next tool run recreates them byte-for-byte from the sources. The authoritative list of what is canonical and what is generated is the [canonical-authority table](../specification/index.md#canonical-authority).

## What the graph is for

- **Validation.** Every reference is checked: unknown IDs, disallowed target types, lifecycle violations (an active artifact referencing a retired one), plus structural warnings such as a requirement unreachable from any actor. See [Validation](../specification/validation.md).
- **Inspection.** Ask about any artifact and see both its authored relationships and every derived reverse view in one place.
- **Structural impact.** Given an artifact, the set of artifacts reachable through graph edges within a stated direction and depth — the deterministic answer to "what is connected to this?"
- **Handoff subgraph selection.** When a delivery slice becomes a Product Handoff, a deterministic closure rule walks the graph to select exactly the context that increment needs — no more, no less. See [Handoff contract](../specification/handoff-contract.md).

## Structural impact is not semantic judgment

The distinction matters enough to state plainly. Structural impact is a graph traversal: it tells you, with certainty and without opinion, which artifacts are _connected_ to a change. It makes no claim about whether any of them is _meaningfully affected_. That judgment — does this rule change actually alter that journey's outcome? — is semantic work, done by people with AI assistance during the [Change operation](change.md), using the structural result as its starting point.

Tools compute reachability. Humans and AI interpret it. Keeping those apart is what lets you trust each for what it is.
