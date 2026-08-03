---
id: UC-CITE-001
type: use-case
title: Emit a citation to a product artifact
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-DELIVERY-INTEGRATION
governed-by:
  - BR-SDD-001
  - BR-AI-001
uses-terms:
  - TERM-PRODUCT-ARTIFACT
  - TERM-PRODUCT-CONTEXT
  - TERM-CURRENT-PRODUCT-MODEL
---

## Goal

Produce a machine-verifiable reference from a consumer document (an SDD spec, a task, an agent
prompt file, a design doc) to canonical product text, carrying the target artifact ID, a content
digest, and an optional scenario anchor.

## Trigger

The Product Engineer or AI Assistant needs to reference a product artifact from a consumer
document without re-stating its content.

## Preconditions

- The target artifact exists in the product model.
- The consumer document is being authored or updated.

## Main Flow

1. The actor identifies the target artifact by its stable ID.
2. The actor computes the artifact's content digest (or uses `prodshape cite` to compute it).
3. The actor emits a citation record in one of three forms: an inline structured reference, a
   Markdown marker block (optionally embedding the canonical text), or a YAML sidecar ledger.
4. If the citation targets a specific verification scenario, the actor includes the scenario's
   stable `id` as the anchor.

## Alternative Flows

- The AI Assistant drafts consumer documents and emits citations automatically, preserving the
  recorded digest so drift is detectable later.

## Failure Conditions

- The target artifact does not exist in the model (the citation is unresolved).
- The digest does not match the artifact's current content (the citation is stale).

## Postconditions

- The consumer document carries a citation record that `prodshape citations verify` can check.
