---
id: FR-CITATIONS-VERIFY-001
type: functional-requirement
title: Compute one citation status per citation
status: active
derived-from:
  - UC-CITATIONS-VERIFY-001
  - BR-SDD-001
verification:
  - id: S1
    scenario: A current citation reports status current with no diagnostics
  - id: S2
    scenario: A stale citation reports PRODUCT061
  - id: S3
    scenario: A tampered embedded projection reports PRODUCT062
  - id: S4
    scenario: An unresolved target reports PRODUCT060
  - id: S5
    scenario: A missing anchor reports PRODUCT063
  - id: S6
    scenario: A tampered embedded projection whose target also moved reports tampered and PRODUCT062, never stale or PRODUCT061
---

## Requirement

The product MUST compute, deterministically, exactly one status per citation: `current` (target resolves and digest matches), `stale` (target resolves but content changed), `tampered` (embedded projection differs from canonical content at the recorded digest), or `unresolved` (target ID or anchor does not resolve). Staleness is judged exclusively by the digest of the cited target; unrelated commits and generated-file churn MUST NOT make a citation stale. PRODUCT061 (stale) is a warning; the repository's `warnings-as-errors` configuration may escalate it.

Status is evaluated in a fixed order: invalid digest, unresolved target, unresolved anchor, tampered, stale, current; the first matching status is reported and evaluation stops there. A citation carries the diagnostic of its status and no other, so `PRODUCT062` and `PRODUCT061` are never both reported for the same citation. An embedded projection's faithfulness is judged against its recorded digest alone, never against the target's current content, so a tampered embedding is reported even when the cited target has also changed since the citation was recorded.

## Rationale

The citation contract is the delivery boundary: consumers cite canonical product text rather than re-stating it, and verification detects drift silently. A deterministic status per citation lets a CI pipeline block when a consumer document falls out of sync with the model, without false positives from unrelated changes.

A fixed precedence is what makes the status deterministic when more than one condition holds at once. Without it, two conforming implementations reading the same citation and the same drift could disagree, and a hand-edited embedded projection could hide behind an unrelated canonical edit, downgrading a tampering defect to a staleness warning nobody is required to act on.

## Acceptance Scenarios

- S1: a current citation reports status current with no diagnostics
- S2: a stale citation reports PRODUCT061
- S3: a tampered embedded projection reports PRODUCT062
- S4: an unresolved target reports PRODUCT060
- S5: a missing anchor reports PRODUCT063
- S6: a tampered embedded projection whose target also moved reports tampered and PRODUCT062, never stale or PRODUCT061
