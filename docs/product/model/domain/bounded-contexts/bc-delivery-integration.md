---
id: BC-DELIVERY-INTEGRATION
type: bounded-context
title: Delivery Integration
status: active
---

## Responsibility

The language of projecting product knowledge into delivery: carving approved Product Changes into Delivery Slices, relating slices to backlog references, generating Product Handoffs and their Product Context documents, tracking requirement coverage across a change, judging handoff staleness, and adapting the whole projection to specific SDD frameworks. This context owns the boundary across which product knowledge reaches the people and tools that implement it.

## Language

Speech here is about increments and contracts, not about meaning. Its core words are slice, handoff, context, coverage, staleness, work-item reference, digest and adapter. "Implements" here means a slice's or handoff's declared coverage of requirements, not code. "Stale" is a precise per-artifact judgment — a digest mismatch against current canonical content — never a feeling that a document is old. "Adapter" names the translation to one SDD framework's native layout, such as the OpenSpec sidecar placement.

## Boundaries

Outside this context lie: the definition and evolution of product knowledge itself — artifacts, the graph, changes, overlays, promotion — which belong to Product Definition; the internals of SDD frameworks, whose proposals, specs, tasks and verification workflows remain natively theirs; and backlog tools, which this context references by work-item identifier but never models. This context packages and projects knowledge; it never redefines it.

## External Relationships

Upstream, Product Definition supplies the current product model and approved Product Changes; this context consumes them read-only and returns questions and contradictions discovered during delivery as feedback on the originating change. Downstream, SDD frameworks such as OpenSpec receive versioned Product Handoffs with accompanying Product Context through framework-specific adapters, while keeping native ownership of their own artifacts. Delivery tracking tools connect only through work-item references carried on slices and handoffs.
