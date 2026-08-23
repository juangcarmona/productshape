---
id: CHG-SPECKIT-001
type: product-change
title: 'Integrate with Spec Kit and provide a cited context projection'
status: applied
base-revision: '2aa1a8a6159e5af3a3d8b614282a8f59a692eaeb'
operations:
  add:
    - FR-SPECKIT-001
    - UC-CONTEXT-001
    - FR-CONTEXT-001
  modify: []
  remove: []
---

## Problem

The Product Definition states an SDD-agnostic boundary (BR-SDD-001, CON-SDD-AGNOSTIC) but defines an integration for only one framework, OpenSpec (FR-OPENSPEC-001). Spec Kit consumers have no defined integration: no enumerated consumer-document population, so verification over a Spec Kit workspace can pass vacuously; no configuration surface, so guidance has no defined home and could end up in the constitution, which owns how software is built and must not carry product intent.

Upstream demand for exactly this boundary is on record: four Spec Kit issues asking for a product level above feature specs were closed as not planned (github/spec-kit#404, #1047, #1116, #1527).

Separately, nothing in the definition states how a delivery consumer obtains product context at intake. In practice consumers copy or paraphrase canonical text into their specifications, and a paraphrase is exactly what citation verification cannot invalidate.

## Intended Product Outcome

The definition states a Spec Kit integration on the same two-mechanism terms as the OpenSpec one: citations bind, configuration informs. The enumerated population is the spec, plan and tasks documents of every feature directory; Spec Kit has no archive lifecycle, so the whole population is current. The integration configures Spec Kit's own customization surfaces: a managed guidance file in the memory directory, and a managed block merged into the workspace's spec, plan and tasks templates, which Spec Kit copies into every document it generates, so the citation requirement reaches the generating agent at authoring time. The constitution, Spec Kit scripts, generated agent command definitions and feature directories are never written, and user-authored template content is preserved.

The definition also states a cited context projection: a deterministic, derived, non-canonical rendering of requested artifacts' canonical text with ready citation records, plus their structural neighborhood, so delivery work in any SDD framework starts from cited product context instead of paraphrase. The projection's citations verify as current against the model state they were generated from.

## Rationale

BR-SDD-001 already commits the product to consumption through citations from any delivery framework; a second, structurally different framework is what proves the contract is framework-neutral rather than OpenSpec-shaped. Spec Kit is the highest-demand candidate on record and, unlike OpenSpec, has no native change lifecycle and no enumeration CLI, which exercises the parts of the contract OpenSpec does not.

The context projection closes the intake half of the loop the citation contract opened: verification can already prove a citation current or stale, but only if citations exist in the consumer document. Making cited context the starting material is what gets citations into delivery documents at the moment they are authored.

## Affected Product Areas

Delivery integration (BC-DELIVERY-INTEGRATION): a new integration requirement alongside FR-OPENSPEC-001, and a new use case with its requirement for context intake. Citation verification (UC-CITATIONS-VERIFY-001) gains a second provider population but does not itself change. No actor, journey, term, business rule or constraint changes; nothing is removed.

## Open Questions

None.

## Product Acceptance

FR-SPECKIT-001 states the two mechanisms, the enumerated population, the all-current lifecycle and the write-surface boundary including the constitution exclusion. UC-CONTEXT-001 and FR-CONTEXT-001 state the projection's purpose, its derived and non-canonical nature, its determinism and that its emitted citations verify as current. A reader who knows only BR-SDD-001 and CON-SDD-AGNOSTIC finds nothing here that contradicts them.

## Out of Scope

The implementation (packages/integration-speckit, the context and integration commands, their tests and CI wiring) follows this change; it is not part of it. Decomposing product intent into features stays with the consumer and Spec Kit: the projection grounds delivery work, it never plans it. No diagnostic code is introduced, retired or renumbered.
