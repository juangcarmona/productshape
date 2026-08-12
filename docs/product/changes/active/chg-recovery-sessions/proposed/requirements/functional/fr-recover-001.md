---
id: FR-RECOVER-001
type: functional-requirement
title: Deterministic recovery session management
status: draft
derived-from:
  - UC-RECOVER-001
  - BR-AI-001
verification:
  - scenario: Starting recovery in a repository with an accepted baseline is refused with guidance to use an ordinary Product Change
  - scenario: Two sessions started over identical trees and briefs produce identical evidence inventories
  - scenario: A source changed after processing is reported stale and its findings are not trusted until re-classified
  - scenario: A session interrupted between any two commands resumes from persisted state without loss
  - scenario: An external source is inventoried only with explicit authorisation recorded
  - scenario: Completion is reported only when every source is classified, every lead and question is closed or deferred, validation passes and the accepted model is untouched
---

## Requirement

The product MUST manage brownfield recovery as a persistent session under the generated-output root. The session MUST record the recovery brief, the complete authorised evidence inventory (repository files plus user-provided and explicitly authorised external sources) with a content hash per hashable source, per-source processing state, evidence-to-candidate mappings, leads, questions and their answers, validation results and completion status. The tool MUST refuse to create a session when an accepted baseline exists, MUST detect changed, new and missing evidence by re-hashing, MUST invalidate findings recorded against changed content, MUST verify that candidates exist only under the proposed overlay of `CHG-INITIAL` and that the accepted model is unchanged since session start, MUST compute coverage and completion deterministically from persisted state, and MUST produce a final report including an explicit non-acceptance statement. Session state MUST be schema-validated on load and refused with a defect list when unusable. The tool MUST NOT perform semantic extraction, MUST NOT write to the accepted model, and MUST NOT apply, commit or merge anything.

## Rationale

Whole-repository recovery outlives any single conversation, so its integrity cannot rest on anyone's memory of what was processed. Everything mechanical about the session is made deterministic and persistent, which leaves the assistant and the engineer exactly one job each: interpreting evidence, and deciding what is true. The refusal rules encode the change doctrine at the tool level, where they cannot be forgotten: `CHG-INITIAL` is only for a repository without a baseline, and recovered knowledge is proposed, never accepted, by tooling.

## Acceptance Scenarios

- A repository with an empty model directory starts a session, processes its declared evidence, and reaches completion with candidates confined to `docs/product/changes/active/chg-initial/proposed/`; the model directory is byte-identical before and after.
- A file is modified after being marked processed; the next check reports it stale, completion regresses, and marking it again requires an explicit acknowledgement that the content changed.
- The same recovery brief over the same tree yields the same evidence identifiers, so resumed and repeated sessions agree about what the population is.
