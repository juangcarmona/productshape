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
    scenario: The integration writes only PDaC guidance in the official OpenSpec configuration surface and ProductShape integration metadata; it never patches generated commands or skills or forks OpenSpec's default schema
  - id: S4
    scenario: The integration enumerates the consumer documents of an OpenSpec workspace, distinguishing current changes from archived history, so each can carry a scope declaration
  - id: S5
    scenario: Product IDs appear verbatim in citations and configuration, and resolve without translation
  - id: S6
    scenario: The merged rules direct the consumer to identify impacted product artifacts as a dedicated propose-phase step, semantically first — comparing the change's motivating intent against the entire product definition — then expanding structurally by traversing the product graph from each identified artifact, citing every impacted artifact and recording examined-but-excluded neighbours
  - id: S7
    scenario: Default verification includes archived historical changes, reports every citation defect found in archived material as a warning, and applies the scope-declaration gate to current documents only
  - id: S8
    scenario: The merged rules direct the consumer to record product-definition drift in its proposal as an explicit warning naming the artifacts involved, leaving the resolution to humans through the change process
---

## Requirement

The product MUST integrate with OpenSpec through two mechanisms with distinct ownership.

Citations bind. An OpenSpec document that depends on canonical product text MUST carry a citation to every product artifact it derives from, in inline or marker-block form. Citations live in the consumer document and are authored by whoever authors that document; the product side MUST NOT write citations into native OpenSpec files. Citations are verified against the product model through citation verification.

Configuration informs. The integration merges PDaC authority context and citation rules into the official OpenSpec configuration surface (`openspec/config.yaml`), preserving existing schema, context, rules, guidance, comments and unrelated user configuration. Its repository writes MUST be limited to that official configuration surface and ProductShape's own integration metadata. It MUST NOT patch OpenSpec-generated commands or skills, fork OpenSpec's default schema merely to inject ProductShape, or create documents alongside native OpenSpec changes.

The merged rules MUST direct the consumer to identify the impacted product artifacts as a dedicated step of its propose phase, before proposal content is written, and MUST define identification as semantic first: the consumer compares the change's motivating intent and goals — the backlog item that started the loop, where one exists — against the entire product definition, identifying every artifact the change depends on, alters or contradicts, and only then expands the set structurally by traversing the product graph from each identified artifact. The impacted set enriches the proposal, every impacted artifact is cited from each document of the change that derives from it, and an examined-but-excluded neighbour is recorded in the proposal rather than omitted silently.

The merged rules MUST direct the consumer to surface product-definition drift: when the change's goals contradict the accepted product definition, or require behaviour the definition does not carry, the divergence MUST be recorded in the proposal as an explicit warning naming the artifacts involved, and the resolution — proposing a Product Change, adapting the change, or another human agreement — belongs to humans through the change process. The consumer MUST NOT resolve drift silently, weaken or omit a citation to hide it, or paraphrase around the conflict. Semantic drift is not machine-decidable, so a recorded drift warning is never a conformance criterion and deterministic citation verification neither detects nor gates it.

The integration MUST be able to enumerate the consumer documents of an OpenSpec workspace — distinguishing current changes from archived history — so that each document can carry a scope declaration and verification can be enforced over a known population. Default verification MUST include archived historical changes and MUST verify the citations archived documents carry, reporting every defect found in archived material as a warning, because archived history is immutable and its drift is information rather than a defect a consumer can repair in place. The scope-declaration gate MUST apply to current documents only; holding archived documents to the full gate MAY be an explicit mode. Every in-scope current consumer document MUST explicitly declare either `pdac-scope: none` or its ProductShape citations. Verification MUST fail when an expected current consumer document has no scope declaration. Zero discovered citations MUST NOT automatically mean success.

Every product artifact ID MUST be preserved verbatim across both mechanisms, so that citations and configuration refer to the same IDs the product model uses.

## Rationale

The two mechanisms are split by who owns the words. A citation is a claim the consumer makes about its own text, so it belongs in the consumer's document under the consumer's authorship, and a tool that wrote citations into native documents would colonize the framework the boundary rules protect. Configuration is information the product side supplies through the framework's own customization surface, so it must never pretend to be the consumer's work: the integration adds context and rules additively, and everything it writes is separable from the native workflow without loss.

The impact pass is semantic first because an SDD loop starts from intent stated in natural language, and which artifacts that intent depends on, alters or contradicts is a question about meaning that structural traversal cannot answer: traversal expands an impacted set, it cannot find the first artifact of one. Deterministic tools enforce structure, AI does semantic work, humans decide — so the comparison against the whole definition is assigned to the agent, the expansion to the graph, and the citations that result make the coverage reviewable. Recording exclusions keeps the judgement visible where a reviewer can contest it.

Drift is surfaced rather than adjudicated because the divergence is a disagreement between two human-owned statements of intent: the backlog item and the accepted definition. The consumer is competent to detect that disagreement and incompetent to resolve it — `BR-SDD-001` reserves resolution to humans through the change process. A recorded warning in the proposal is the weakest intervention that guarantees the disagreement reaches the developer and the product owner; anything weaker permits silent divergence, anything stronger has a tool adjudicating product intent.

Enumeration and scope declarations are required because verification is framework-blind by constraint and therefore cannot know which documents of a workspace consume product knowledge. That knowledge is framework-specific, so it lives in the integration, and enforcement stands on it: a verifier that cannot name its population can only guess at coverage. Zero discovered citations must not mean success because an empty result could mean the population was not enumerated, not that no citations are needed. Archived material is verified at warning severity because its documents are immutable history: excluding them withholds drift a reader of that history needs, while gating them as errors would make an immutable document a permanent failure. The scope gate stays current-only because binding and exemption are declarations made while a document is authored, and demanding them retroactively manufactures failures no one can honestly resolve.

Preserving product IDs is what makes the round trip possible in both mechanisms. A citation of FR-X and configuration recorded against FR-X can be validated against FR-X in the product model without a translation table that could rot. This is the concrete shape of the framework-independence constraint: one integration, a versioned contract, and no OpenSpec concept leaking back into the product model.
