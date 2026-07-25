---
id: FR-HANDOFF-STALE-001
type: functional-requirement
title: Detect handoff staleness from relevant artifacts only
status: active
derived-from:
  - UC-HANDOFF-STATUS-001
  - BR-SDD-001
verification:
  - scenario: Handoff status reports current, stale, invalid or source-revision-unavailable
  - scenario: A changed referenced artifact makes the handoff stale and the report names it
  - scenario: Modifications to artifacts the handoff does not reference never change its status
---

## Requirement

The product MUST report the status of a Product Handoff as exactly one of: current, when every
referenced artifact's recomputed digest matches the handoff; stale, when at least one referenced
artifact's content changed, naming each stale artifact; invalid, when the handoff document is
malformed, references unknown artifacts or carries uninterpretable digests; or
source-revision-unavailable, when a referenced artifact is absent and the recorded source revision
cannot be resolved. Staleness MUST be judged exclusively by the digests of the artifacts the
handoff references: unrelated commits, unrelated artifact edits and generated-file churn MUST NOT
make a handoff stale.

## Rationale

A handoff is a snapshot, and delivery teams need to know whether the product knowledge they are
implementing is still the product knowledge that was handed over. Digest comparison gives a
precise, per-artifact answer. Just as important is what must not trigger it: a repository is
alive, and if every unrelated commit flipped handoffs to stale, teams would learn to ignore the
signal entirely. Scoping staleness to the referenced artifacts keeps the alarm meaningful — when
it fires, something the delivery actually depends on changed, and the report says exactly what.

## Acceptance Scenarios

- Status is requested for a handoff whose referenced artifacts are unchanged. The report says
  current. After one referenced requirement is edited, the report says stale and names that
  requirement; the other referenced artifacts are not listed as stale.
- A handoff document with a corrupted digest value, and another referencing an ID unknown to the
  model, both report invalid with a diagnostic explaining why.
- Dozens of commits touch artifacts, code and generated files that the handoff does not reference.
  The handoff still reports current. In a clone where a referenced artifact's file is gone and the
  recorded source revision cannot be resolved, the report says source-revision-unavailable.
