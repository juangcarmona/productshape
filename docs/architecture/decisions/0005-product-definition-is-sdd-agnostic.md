# 0005 — Product Definition is SDD-agnostic

Status: Accepted Date: 2026-07-25

## Context

Spec-Driven Development frameworks (OpenSpec, Spec Kit and others) own the specification, design, task and verification workflow for individual implementation increments. Product Definition as Code owns canonical product semantics across increments. These concerns overlap enough to tempt a merger — building the methodology into one SDD framework, or having the toolkit manage SDD artifacts directly — and both temptations were rejected. Coupling to one framework would tie the lifespan of product knowledge to the lifespan of a delivery tool.

## Decision

Product Definition is framework-agnostic. SDD frameworks retain native ownership of their artifacts and lifecycle; the toolkit integrates through adapters, with OpenSpec as the first.

Concretely, for the OpenSpec adapter (`adapter-openspec`):

- The adapter locates OpenSpec changes so that citations inside them can be scanned and verified. It never modifies, reorganizes or generates OpenSpec's own files, and OpenSpec's commands, conventions and archive workflow remain untouched.
- SDD may report questions and contradictions back to Product Definition; discovering during implementation that a business rule is wrong is valuable signal. But SDD never silently rewrites canonical product knowledge — corrections flow through a Product Change like any other evolution.
- Archiving an SDD change never applies or accepts a Product Change. Finishing an implementation increment and evolving the product definition are separate decisions with separate owners (see ADR 0004).

The `core` package has no OpenSpec (or any SDD) knowledge; only the adapter does.

## Consequences

Positive:

- Product knowledge outlives any single delivery framework. Migrating SDD tooling replaces an adapter, not the product model.
- Teams keep their existing SDD workflow unmodified; adoption of Product Definition does not force retraining on delivery mechanics.
- Citations live inside the consumer's own documents, so an OpenSpec repository with the adapter removed is still a fully valid OpenSpec repository.
- Canonical semantics cannot be corrupted by an implementation-side tool acting autonomously.

Negative:

- Teams learn two workflows: the Product Change lifecycle and their SDD framework's lifecycle, plus the citation seam between them.
- Locating a framework's documents requires an adapter per SDD framework. v0.1 ships only the OpenSpec adapter, though the citation contract itself is framework-independent: any document a consumer can point `citations verify` at can carry one.
- Signals must cross the boundary manually: a contradiction found during implementation becomes a reported question, not an automatic fix, which adds latency to corrections.
