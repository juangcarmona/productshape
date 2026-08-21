---
id: CHG-OPENSPEC-COVERAGE-002
type: product-change
title: Impact identification is semantic first, and goal drift is surfaced to humans
status: applied
base-revision: 'e8ac0ec'
operations:
  add: []
  modify:
    - FR-OPENSPEC-001
  remove: []
---

## Problem

`CHG-OPENSPEC-COVERAGE-001` made the impact pass a dedicated propose-phase step, but defined it as traversal: run impact analysis "on every artifact the change touches". That presupposes the consumer already knows which artifacts the change touches — and at the start of an SDD loop it does not. The loop starts from a backlog item stated in natural language; which product artifacts that intent depends on, alters or contradicts is a semantic question about meaning, answerable only by comparing the intent against the entire product definition. Structural traversal can expand an impacted set; it cannot find the first artifact of one.

The requirement is also silent about disagreement. A backlog item whose goals contradict the accepted definition, or require behaviour the definition does not carry, currently meets no obligation at all: the consumer can paraphrase around the conflict, cite what agrees and omit what does not, and nothing surfaces the divergence to the people who own the decision.

## Intended Product Outcome

The merged rules direct the consumer to identify impacted artifacts semantically first: compare the change's motivating intent and goals against the entire product definition, identify every artifact the change depends on, alters or contradicts, and only then expand the set structurally by traversing the product graph from each identified artifact. The impacted set enriches the proposal, and every impacted artifact is cited from each document of the change that derives from it — proposal, specs, design or tasks — with examined-but-excluded neighbours recorded.

The merged rules direct the consumer to surface product-definition drift: when the change's goals contradict the accepted definition or exceed what it carries, the divergence is recorded in the proposal as an explicit warning naming the artifacts involved, and the resolution — propose a Product Change, adapt the change, or something else — belongs to the humans who own it. The consumer never resolves drift silently.

## Rationale

Deterministic tools enforce structure, AI does semantic work, humans decide. Mapping intent to impacted artifacts is the semantic half of the impact pass, and pretending it is traversal hides the step that actually decides coverage: an agent that never reads the whole definition cannot know what it failed to cite. Putting the semantic comparison first, with the deterministic traversal as its expansion, assigns each half of the pass to the party that can perform it.

Drift must surface rather than block or self-resolve because the divergence is a legitimate disagreement between two human-owned statements of intent: the backlog item and the accepted definition. The consumer is competent to detect the disagreement and incompetent to adjudicate it — `BR-SDD-001` already reserves resolution to humans through the change process. A recorded warning in the proposal is the weakest intervention that guarantees the disagreement reaches a reviewer; anything weaker permits silent divergence, anything stronger has the tool adjudicating product intent. Deterministic verification stays out of it: semantic drift is not machine-decidable, so a flagged divergence is never a conformance criterion and citation verification neither detects nor gates it.

## Affected Product Areas

OpenSpec integration (`FR-OPENSPEC-001`), within delivery integration. `BR-SDD-001` is unchanged and is the authority the drift obligation leans on: consumers report contradictions back, humans resolve them through the change process. `BR-AI-001` is unchanged: no deterministic validation is delegated to AI; the semantic pass is agent guidance, not validation. Citation verification (`FR-CITATIONS-VERIFY-001`) is unchanged.

No actor, journey, term, business rule or constraint changes. Nothing is added and nothing is removed.

## Open Questions

None.

## Product Acceptance

`FR-OPENSPEC-001` states that the merged rules mandate semantic-first impact identification against the entire product definition with structural traversal as its expansion, and mandate recording product-definition drift in the proposal as an explicit warning for humans to resolve. The shipped merged rules say both, and verification of this repository reports no errors.

## Out of Scope

Generalizing the semantic-impact and drift obligations to a framework-neutral SDD consumer contract waits until a second SDD provider exists. Tooling that enumerates or reports recorded drift warnings is follow-up work. Enriching an external backlog tool's items is outside the repository boundary; the proposal is the in-repository record the backlog item can mirror. No diagnostic code is introduced, retired or renumbered.
