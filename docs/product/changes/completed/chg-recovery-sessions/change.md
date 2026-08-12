---
id: CHG-RECOVERY-SESSIONS
type: product-change
title: Brownfield recovery is a bounded, resumable session
status: applied
base-revision: 'e9e0e9ca7e8b2794f239567f5183daa3383ce5e9'
operations:
  add:
    - UC-RECOVER-001
    - FR-RECOVER-001
  modify: []
  remove: []
---

## Problem

The product defines Recover as an operation and ships a recovery skill, but the model holds no use case and no requirement for it. Whole-repository recovery is long-running work: evidence populations run to thousands of files, sessions span days and multiple assistant conversations, and nothing in the product currently guarantees that coverage is tracked, that changed evidence is detected, that user answers survive an interruption, or that recovered output is confined to the reserved initialisation change. Without those guarantees, recovery quality depends on the diligence of whoever happens to run it.

## Intended Product Outcome

Recovering a product definition from an existing system is a first-class use case with a deterministic contract. A recovery session records the authorised evidence population (repository files, user-provided material, explicitly authorised external resources), tracks per-source processing state with content hashes, persists leads, questions and answers, computes coverage and completion, and confines every candidate to the proposed overlay of `CHG-INITIAL`. Interrupting and resuming a session loses nothing; changing evidence invalidates exactly the state that depended on it; and the session refuses to run at all when an accepted baseline exists, because recovered knowledge then belongs in an ordinary Product Change.

## Rationale

Recovery is where the methodology meets the least structured input it will ever see. The parts a tool can make deterministic (what the evidence population is, what was processed, what changed behind the session's back, where output may land) should be deterministic, so that human and assistant attention is spent entirely on the one part that cannot be automated: deciding what the evidence means. Splitting the operation this way also keeps the AI boundary rule intact: the assistant reasons, the tool measures, and neither is asked to do the other's job.

## Affected Product Areas

The Recover operation and its tooling contract. The change mechanism itself is untouched: `CHG-INITIAL` remains the single initialisation change, and acceptance remains a human decision in a pull request.

## Open Questions

None.

## Product Acceptance

The overlay validates without errors. The recovery tooling described by FR-RECOVER-001 exists, its verification scenarios pass as automated tests from a packed installation, and a session interrupted between any two commands resumes without loss.

## Out of Scope

Automated semantic extraction (reading meaning out of evidence stays with the assistant and the human), recovery of delivery or implementation design, any second recovery lifecycle beyond Product Changes, and migration tooling for recovery state between format versions.
