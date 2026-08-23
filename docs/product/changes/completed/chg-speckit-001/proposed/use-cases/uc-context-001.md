---
id: UC-CONTEXT-001
type: use-case
title: Ground delivery intake in a cited context projection
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-DELIVERY-INTEGRATION
governed-by:
  - BR-SDD-001
  - BR-CANONICAL-001
  - BR-AI-001
uses-terms:
  - TERM-PRODUCT-ARTIFACT
  - TERM-CITATION
  - TERM-CURRENT-PRODUCT-MODEL
  - TERM-GRAPH-PROJECTION
---

## Goal

Start delivery work (a Spec Kit feature, an OpenSpec change, any consumer document) from the canonical text of the product artifacts it implements, with ready citation records attached, instead of a copy or paraphrase the model cannot invalidate.

## Trigger

The Product Engineer or AI Assistant is about to specify delivery work that implements identified product artifacts.

## Preconditions

- The product model validates.
- The artifacts the delivery work implements are identified by their stable IDs.

## Main Flow

1. The actor names the product artifacts the delivery work implements.
2. The product renders a projection carrying each requested artifact's canonical text with a ready inline citation, plus the structural neighborhood of the requested artifacts as a cited listing.
3. The actor feeds the projection into the delivery workflow (for example a Spec Kit specify run) and keeps the citation lines next to the text derived from them.
4. Citation verification later confirms each kept citation as current, or reports it stale once the accepted meaning moves.

## Alternative Flows

- The AI Assistant requests the projection in machine-readable form and derives the consumer document from it, preserving the citation records so drift stays detectable.
- The actor widens or narrows the structural neighborhood by traversal depth before deriving.

## Failure Conditions

- A requested artifact ID does not exist in the model (the projection is refused, nothing is emitted).
- The consumer drops the citations while deriving, leaving paraphrase the model cannot invalidate; the scope gate of an enumerated population reports the document unclassified.

## Postconditions

- The delivery document carries citations that verify as current against the model state the projection was generated from.
- The projection itself remains disposable: derived, non-canonical and regenerable at will.
