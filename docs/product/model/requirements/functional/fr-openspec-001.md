---
id: FR-OPENSPEC-001
type: functional-requirement
title: Integrate with OpenSpec through citations that bind and configuration that informs
status: active
derived-from:
  - UC-CITATIONS-VERIFY-001
  - BR-SDD-001
  - CON-SDD-AGNOSTIC
verification:
  - id: S1
    scenario: An OpenSpec document that depends on canonical product text carries a citation to every artifact it derives from, and citation verification resolves each one against the product model
  - id: S2
    scenario: The integration merges PDaC authority context and citation rules into openspec/config.yaml, preserving existing schema, context, rules, guidance, comments and unrelated user configuration
  - id: S3
    scenario: The integration never patches OpenSpec-generated commands or skills, never forks OpenSpec's default schema, and never creates Product Handoff, Product Context or coverage sidecars
  - id: S4
    scenario: The integration enumerates the consumer documents of an OpenSpec workspace, distinguishing current changes from archived history, so each can carry a scope declaration
  - id: S5
    scenario: Product IDs appear verbatim in citations and configuration, and resolve without translation
---

## Requirement

The product MUST integrate with OpenSpec through two mechanisms with distinct ownership.

Citations bind. An OpenSpec document that depends on canonical product text MUST carry a citation to every product artifact it derives from, in inline or marker-block form. Citations live in the consumer document and are authored by whoever authors that document; the product side MUST NOT write citations into native OpenSpec files. Citations are verified against the product model through citation verification.

Configuration informs. The integration merges PDaC authority context and citation rules into the official OpenSpec configuration surface (`openspec/config.yaml`), preserving existing schema, context, rules, guidance, comments and unrelated user configuration. The integration MUST NOT patch OpenSpec-generated commands or skills, MUST NOT fork OpenSpec's default schema merely to inject ProductShape, and MUST NOT create Product Handoff, Product Context or coverage sidecars.

The integration MUST be able to enumerate the consumer documents of an OpenSpec workspace — distinguishing current changes from archived history — so that each document can carry a scope declaration and verification can be enforced over a known population. Default verification MUST exclude archived historical changes; historical verification MAY be an explicit mode. Every in-scope current consumer document MUST explicitly declare either `pdac-scope: none` or its ProductShape citations. Verification MUST fail when an expected current consumer document has no scope declaration. Zero discovered citations MUST NOT automatically mean success.

Every product artifact ID MUST be preserved verbatim across both mechanisms, so that citations and configuration refer to the same IDs the product model uses.

## Rationale

The two mechanisms are split by who owns the words. A citation is a claim the consumer makes about its own text, so it belongs in the consumer's document under the consumer's authorship, and a tool that wrote citations into native documents would colonize the framework the boundary rules protect. Configuration is information the product side supplies through the framework's own customization surface, so it must never pretend to be the consumer's work: the integration adds context and rules additively, and everything it writes is separable from the native workflow without loss.

Enumeration and scope declarations are required because verification is framework-blind by constraint and therefore cannot know which documents of a workspace consume product knowledge. That knowledge is framework-specific, so it lives in the integration, and enforcement stands on it: a verifier that cannot name its population can only guess at coverage. Zero discovered citations must not mean success because an empty result could mean the population was not enumerated, not that no citations are needed.

Preserving product IDs is what makes the round trip possible in both mechanisms. A citation of FR-X and configuration recorded against FR-X can be validated against FR-X in the product model without a translation table that could rot. This is the concrete shape of the framework-independence constraint: one integration, a versioned contract, and no OpenSpec concept leaking back into the product model.
