---
id: FR-CONTEXT-001
type: functional-requirement
title: Render a deterministic cited context projection for delivery intake
status: active
derived-from:
  - UC-CONTEXT-001
  - BR-SDD-001
verification:
  - id: S1
    scenario: The projection carries each requested artifact's canonical text with a ready inline citation recording the artifact's current digest
  - id: S2
    scenario: The projection lists the structural neighborhood of the requested artifacts, each entry with a ready citation, and names the traversal depth
  - id: S3
    scenario: Citations emitted by the projection verify as current against the model state the projection was generated from
  - id: S4
    scenario: The projection is deterministic for a given model state, with the same output for the same input and no timestamps
  - id: S5
    scenario: The projection declares itself a derived, non-canonical rendering; a requested ID that does not exist in the model refuses the whole projection
---

## Requirement

The product MUST render a context projection for a requested set of product artifact IDs. The projection MUST carry each requested artifact's canonical text together with a ready inline citation recording the artifact ID and its current content digest, and MUST list the structural neighborhood of the requested artifacts (bounded by a traversal depth) with a ready citation per entry, so a consumer can cite a neighbor it also depends on without computing anything.

The projection is a derived, non-canonical rendering of the current product model: it MUST declare itself as such, MUST NOT be a product artifact with its own lifecycle, and MUST be regenerable at will. It MUST be deterministic for a given model state and MUST NOT embed generation time. Its emitted citations MUST verify as current against the model state it was generated from.

The projection grounds delivery work; it MUST NOT decompose product intent into delivery units, plan work or carry implementation state. A requested artifact ID that does not exist in the model MUST refuse the projection with no partial output.

A human-readable and a machine-readable form MUST both exist, on the same content.

## Rationale

Citation verification can prove a citation current or stale, but only over citations that exist. The moment delivery work is specified is when canonical text enters consumer documents; if it enters as paraphrase, the model can never invalidate it. Handing the author the canonical text with the citation already attached makes the grounded path the cheapest path. Keeping the projection derived and disposable keeps the boundary of BR-CANONICAL-001: the Markdown model stays the only authority, and losing every projection loses nothing.
