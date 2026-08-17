---
id: BC-DELIVERY-INTEGRATION
type: bounded-context
title: Delivery Integration
status: active
---

## Responsibility

The language of binding delivery and other consumer documents to accepted product knowledge: emitting citations, resolving their artifact IDs and optional scenario anchors, comparing content digests, reporting citation status, enumerating framework-native consumer documents and configuring framework-specific guidance. This context owns the boundary across which product knowledge reaches people and tools without becoming delivery state.

## Language

Speech here is about references and consumers, not about changing product meaning. Its core words are citation, consumer document, artifact ID, digest, anchor, current, stale, tampered, unresolved and integration. "Stale" is a deterministic citation judgment: the canonical artifact resolves, but its current digest differs from the recorded digest. "Integration" names framework-specific discovery and configuration built on the same Citation Contract.

## Boundaries

Outside this context lie: the definition and evolution of product knowledge itself — artifacts, the graph, Product Changes, overlays, approval, apply and acceptance — which belong to Product Definition; and the internals of SDD frameworks, whose proposals, specs, tasks and verification workflows remain natively theirs. This context binds consumers to product knowledge; it never redefines either side or records delivery progress.

## External Relationships

Upstream, Product Definition supplies accepted canonical artifacts and their digests; this context consumes them read-only. Downstream, SDD frameworks such as OpenSpec retain native ownership of their artifacts while carrying citations and receiving PDaC guidance through their own configuration surfaces. Questions and contradictions discovered during implementation return to Product Definition as change requests. Product-definition work and implementation work have independent cadence, even when their files are reviewed in one pull request.
