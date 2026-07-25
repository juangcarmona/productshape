# 0002 — The graph is derived

Status: Accepted
Date: 2026-07-25

## Context

The relationships between artifacts are the methodology: actors to journeys, use cases to rules
and terms, requirements to their origins. A graph could be authored directly (a graph database, an
edges file) or compiled from the artifacts. Authored bidirectional references are a known failure
mode in documentation systems: reciprocal links drift apart, and no one knows which side is right.

## Decision

The product graph is compiled from artifact frontmatter by the toolkit. It is never authored, and
`product-graph.json` is a derived output that can be rebuilt from the canonical files at any time.

Every relationship has exactly one canonical direction — one source artifact type, one frontmatter
field, one allowed target set — defined in the
[relationships specification](../../specification/relationships.md). All reverse relationships are
derived by the graph compiler. The worked example that fixes the pattern:

- `Domain Term.defined-in` (term → bounded context) is canonical and authored.
- `Bounded Context.owns-terms` is derived: a context's owned terms are exactly the terms whose
  `defined-in` references it. The bounded-context schema rejects an authored `owns-terms` field.

Users never maintain reciprocal references. Tools may display derived fields in inspection output
and generated indexes, clearly marked as derived.

There is no graph database in v0.1. The graph is an in-memory structure plus a serialized JSON
snapshot under `.product/generated/`; at product-model scale this is fast to recompute, and a
database would add operational weight without adding capability.

## Consequences

Positive:

- One authoritative direction per relationship eliminates reciprocal-reference drift entirely;
  there is no second copy to fall out of sync.
- Authoring stays cheap: adding a domain term to a context is one field on the term, not edits to
  two files.
- The graph is always rebuildable, so a stale or corrupted `product-graph.json` costs nothing.
- Derivation is deterministic, which makes reverse indexes testable and platform-independent.

Negative:

- Derived views must be recomputed to be trusted. A previously generated graph file says nothing
  about the current state of the canonical files; consumers must regenerate or verify.
- Graph queries are limited to what the compiler exposes (typed edges, reverse indexes, reachability
  and impact traversals). Arbitrary ad-hoc graph queries of the kind a graph database would answer
  are not available in v0.1.
- Every consumer pays the compile cost on each run; acceptable at product-model scale, but it is a
  real constraint on very large models.
