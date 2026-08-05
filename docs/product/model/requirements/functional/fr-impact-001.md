---
id: FR-IMPACT-001
type: functional-requirement
title: Analyze structural impact deterministically
status: active
derived-from:
  - UC-IMPACT-001
  - BR-RELATIONSHIPS-001
verification:
  - scenario: Impact distinguishes direct from transitive reachability and traversal direction
  - scenario: A depth limit bounds the traversal and is reflected in the result
  - scenario: Affected active changes, slices and handoffs are included and output is deterministic
---

## Requirement

The product MUST answer, for any artifact ID, which artifacts are structurally reachable from it through the product graph. The result MUST distinguish direct neighbours from transitively reached artifacts, MUST distinguish incoming from outgoing traversal direction, and MUST honour a user-supplied depth limit. The result MUST include the active Product Changes, Delivery Slices and Product Handoffs that reference any affected artifact. The analysis MUST be deterministic, and it MUST present itself as structural reachability only — the product MUST NOT claim that reachable artifacts are semantically affected or that unreachable ones are safe.

## Rationale

Before changing an artifact, an author needs to know what depends on it — and what in-flight work would be disturbed. Structural reachability over the graph answers that question cheaply and repeatably. The distinctions matter: direct versus transitive tells the author how immediate the coupling is, direction tells them whether they are looking at what the artifact needs or what needs the artifact, and a depth limit keeps large models tractable. The honesty clause is equally part of the obligation: reachability is a structural fact, not a semantic judgement, and a tool that overstated its certainty would invite teams to skip the human reading that semantic impact requires.

## Acceptance Scenarios

- Impact is requested for a use case. Requirements deriving from it appear as direct incoming neighbours; a handoff-relevant journey reached through those requirements appears as transitive, and each entry states its direction and distance.
- Impact is requested with a depth limit of one. Only direct neighbours are returned, and the output records that the traversal was bounded.
- An affected requirement is modified by an active change and covered by an approved slice with a generated handoff. The impact result lists that change, slice and handoff. Running the same analysis twice over identical content produces identical, identically ordered output, and the report describes its findings as structural reachability.
