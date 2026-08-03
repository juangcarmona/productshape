---
id: UC-CITATIONS-VERIFY-001
type: use-case
title: Verify citations against the product model
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-DELIVERY-INTEGRATION
governed-by:
  - BR-SDD-001
  - BR-CANONICAL-001
uses-terms:
  - TERM-PRODUCT-ARTIFACT
  - TERM-CURRENT-PRODUCT-MODEL
---

## Goal

A deterministic verdict on whether every citation in a set of consumer documents still points
to the canonical content it was recorded against: each citation is `current`, `stale`, `tampered`
or `unresolved`.

## Trigger

The Product Engineer runs `prodshape citations verify` — directly, from a repository hook, or in
a continuous integration pipeline. The AI Assistant runs it after drafting consumer documents to
check that its citations are current.

## Preconditions

- The product model is loaded and valid.
- The consumer documents contain citation records.

## Main Flow

1. The actor runs `prodshape citations verify [target]`.
2. Consumer documents are scanned for citation records in all three forms.
3. Each citation's target artifact is resolved by ID.
4. Each citation's anchor (if present) is resolved to a verification scenario.
5. The artifact's content digest is recomputed and compared to the recorded digest.
6. One status is reported per citation: `current`, `stale`, `tampered` or `unresolved`.

## Alternative Flows

- The repository's `warnings-as-errors` configuration escalates stale citations (PRODUCT061) to
  errors, blocking the pipeline.

## Failure Conditions

- A citation target does not resolve (PRODUCT060).
- A citation anchor does not resolve (PRODUCT063).
- An embedded projection differs from canonical content (PRODUCT062).
- A citation digest is invalid (PRODUCT042).

## Postconditions

- Every citation has a computed status and any diagnostics are reported.
