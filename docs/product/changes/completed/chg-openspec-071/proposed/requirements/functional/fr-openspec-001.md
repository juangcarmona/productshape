---
id: FR-OPENSPEC-001
type: functional-requirement
title: Integrate with OpenSpec through citations that bind and sidecars that inform
status: active
derived-from:
  - UC-CITATIONS-VERIFY-001
  - BR-SDD-001
  - CON-SDD-AGNOSTIC
verification:
  - id: S1
    scenario: An OpenSpec document that depends on canonical product text carries a citation to every artifact it derives from, and citation verification resolves each one against the product model
  - id: S2
    scenario: The adapter places handoff, context and coverage sidecars into a native OpenSpec change without creating, modifying or removing any native file
  - id: S3
    scenario: Regenerating the sidecars leaves every native OpenSpec artifact byte-identical
  - id: S4
    scenario: The adapter enumerates the consumer documents of an OpenSpec workspace so each can carry a scope declaration
  - id: S5
    scenario: Product IDs appear verbatim in citations and sidecars, and resolve without translation
---

## Requirement

The product MUST integrate with OpenSpec through two mechanisms with distinct ownership.

Citations bind. An OpenSpec document that depends on canonical product text MUST carry a citation to every product artifact it derives from, in inline or marker-block form. Citations live in the consumer document and are authored by whoever authors that document; the product side MUST NOT write citations into native OpenSpec files. Citations are verified against the product model through citation verification.

Sidecars inform. The adapter MAY place generated informational artifacts, the Product Handoff document, the product context and the coverage mapping, alongside the native artifacts of an OpenSpec change. Only the adapter writes sidecars. The adapter MUST NOT create, modify or remove any native OpenSpec file, and regenerating the sidecars MUST touch only the sidecar files, leaving every native OpenSpec artifact byte-identical.

The adapter MUST be able to enumerate the consumer documents of an OpenSpec workspace, so that each document can carry a scope declaration and verification can be enforced over a known population.

Every product artifact ID MUST be preserved verbatim across both mechanisms, so that citations, coverage evidence and traceability refer to the same IDs the product model uses.

## Rationale

The two mechanisms are split by who owns the words. A citation is a claim the consumer makes about its own text, so it belongs in the consumer's document under the consumer's authorship, and a tool that wrote citations into native documents would colonize the framework the boundary rules protect. A sidecar is information the product side supplies, so it must never pretend to be the consumer's work: only the adapter writes it, and everything the adapter writes is separable from the native change without loss. Scoping the byte-identical guarantee to the adapter is what lets both promises hold at once; stated over the whole integration it would forbid the citations that make binding real.

Enumeration is part of the requirement because verification is framework-blind by constraint and therefore cannot know which documents of a workspace consume product knowledge. That knowledge is framework-specific, so it lives in the adapter, and enforcement stands on it: a verifier that cannot name its population can only guess at coverage.

Preserving product IDs is what makes the round trip possible in both mechanisms. A citation of FR-X and coverage recorded against FR-X can be validated against FR-X in the product model without a translation table that could rot. This is the concrete shape of the framework-independence constraint: one adapter, a versioned contract, and no OpenSpec concept leaking back into the product model.
