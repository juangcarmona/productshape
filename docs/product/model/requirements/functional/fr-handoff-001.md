---
id: FR-HANDOFF-001
type: functional-requirement
title: Generate framework-independent Product Handoffs
status: active
derived-from:
  - UC-HANDOFF-001
  - BR-SDD-001
verification:
  - scenario: An approved slice yields a handoff with subgraph, digests, revision and work item
  - scenario: Generation from a non-approved slice is refused with a diagnostic
  - scenario: The generated product context is marked as generated and contains no technical design
---

## Requirement

The product MUST generate a Product Handoff from an approved delivery slice of a validated Product
Change. The handoff MUST contain the product subgraph selected by the deterministic closure rule,
a content digest and repository-relative path for every included artifact, the source repository
revision, and the reference to the delivery work item. Generation MUST refuse a slice that is not
approved, reporting the documented error. The handoff and its generated product context MUST
contain product knowledge only: technical design, implementation tasks and framework decisions
MUST never appear in them, and the product context MUST be marked as generated and non-canonical.

## Rationale

The handoff is the single contract between product definition and delivery, so it must carry
exactly what delivery needs and nothing it must not own. A deterministically selected subgraph
means two people generating from the same slice hand over the same context — the boundary is a
rule, not a judgement call. Digests and the source revision give the handoff provenance: staleness
becomes detectable instead of debatable. Refusing non-approved slices keeps unreviewed scope from
reaching delivery, and the ban on technical design keeps ownership clean — the moment a handoff
starts deciding how, the SDD layer stops owning its own decisions and the framework independence
of the contract is lost.

## Acceptance Scenarios

- A handoff is generated from an approved slice. It lists the implemented requirements, the
  affected artifacts and the closure-selected context, each entry carrying its path and content
  digest; the document records the source revision and the work-item provider, repository and ID.
- Generation is requested for a slice whose status is not approved. The command refuses, emits the
  documented diagnostic naming the slice, and writes no handoff.
- The generated product context opens with a generated marker naming the handoff ID, presents the
  requirements, affected behaviour, governing rules and domain language, and introduces nothing
  absent from the canonical sources — no tasks, no design, no framework instructions.
