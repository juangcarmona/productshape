---
id: FR-RECOVER-001
type: functional-requirement
title: Deterministic recovery session management
status: active
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
  - scenario: With the brief's git discipline declared, the session runs on the dedicated branch and each state-mutating command records a checkpoint commit; without the declaration the tool never touches version control
---

## Requirement

The product MUST manage brownfield recovery as a persistent session under the generated-output root. The session MUST record the recovery brief, the complete authorised evidence inventory (repository files plus user-provided and explicitly authorised external sources) with a content hash per hashable source, per-source processing state, evidence-to-candidate mappings, leads, questions and their answers, validation results and completion status. The tool MUST refuse to create a session when an accepted baseline exists, MUST detect changed, new and missing evidence by re-hashing, MUST invalidate findings recorded against changed content, MUST verify that candidates exist only under the proposed overlay of `CHG-INITIAL` and that the accepted model is unchanged since session start, MUST compute coverage and completion deterministically from persisted state, and MUST produce a final report including an explicit non-acceptance statement. Session state MUST be schema-validated on load and refused with a defect list when unusable.

When, and only when, the recovery brief declares a dedicated recovery branch, the tool MUST run the session on that branch: it MUST create the branch at session start, MUST refuse to start over modified tracked files, and MUST record a checkpoint commit of the session's output after each state-mutating recovery command, under a fixed message convention that names the change and the step. Without that declaration the tool MUST NOT touch version control at all.

The tool MUST NOT perform semantic extraction, MUST NOT write to the accepted model, and MUST NOT apply, merge, push or accept anything.

## Rationale

Whole-repository recovery outlives any single conversation, so its integrity cannot rest on anyone's memory of what was processed. Everything mechanical about the session is made deterministic and persistent, which leaves the assistant and the engineer exactly one job each: interpreting evidence, and deciding what is true. The refusal rules encode the change doctrine at the tool level, where they cannot be forgotten: `CHG-INITIAL` is only for a repository without a baseline, and recovered knowledge is proposed, never accepted, by tooling.

The git discipline is opt-in for the same reason it is bounded: what the doctrine forbids is tooling accepting anything, not tooling checkpointing its own working output. Checkpoint commits on a declared, disposable branch accept nothing and change no baseline; they make a long session auditable step by step, safely interruptible, and cheap to discard and reproduce. A repository that wants no tool-driven commits simply leaves the declaration out, and the tool then never touches version control.

## Acceptance Scenarios

- A repository with an empty model directory starts a session, processes its declared evidence, and reaches completion with candidates confined to `docs/product/changes/active/chg-initial/proposed/`; the model directory is byte-identical before and after.
- A file is modified after being marked processed; the next check reports it stale, completion regresses, and marking it again requires an explicit acknowledgement that the content changed.
- The same recovery brief over the same tree yields the same evidence identifiers, so resumed and repeated sessions agree about what the population is.
- A brief declares a recovery branch. The session starts on it, refuses a working tree with modified tracked files, and each mark, question, lead, check and report leaves one checkpoint commit whose message names the change and the step. The same session without the declaration leaves the repository's version control untouched.
