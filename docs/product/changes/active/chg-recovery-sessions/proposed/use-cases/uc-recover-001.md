---
id: UC-RECOVER-001
type: use-case
title: Recover an initial Product Definition from an existing system
status: draft
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CHANGE-001
  - BR-AI-001
uses-terms:
  - TERM-CURRENT-PRODUCT-MODEL
  - TERM-PRODUCT-ARTIFACT
---

## Goal

An evidence-grounded initial Product Definition proposed as the future state of `CHG-INITIAL`: candidate artifacts with provenance and confidence, contradictions and open questions recorded rather than resolved silently, and complete coverage of the authorised evidence population, ready for human review and acceptance through the normal change path.

## Trigger

The Product Engineer starts recovery on a repository that has behaviour, users and history but no accepted Product Definition, typically with the AI Assistant executing the Recover skill against an agreed recovery brief.

## Preconditions

- The repository is initialized for Product Definition as Code and holds no accepted baseline.
- A recovery brief declares the evidence scope: repository roots and filters, forbidden paths, known vocabulary, source authority rules, batch size, and any user-provided or external sources the engineer explicitly authorises.

## Main Flow

1. The engineer and the assistant agree the recovery brief; ambiguity about scope is settled before extraction.
2. The session is started; the tool inventories the authorised evidence population deterministically and records a content hash per source.
3. The assistant processes evidence in bounded batches: reads each source in full, extracts candidate artifacts into the proposed overlay of `CHG-INITIAL` with provenance and confidence, and records how every relevant section was classified.
4. Mentions of unexamined material become persisted leads; each is followed or explicitly closed.
5. Duplicates are merged with provenance preserved; contradictions are recorded and linked to questions; the overlay is revalidated after each batch.
6. When meaning is uncertain, the assistant asks the engineer, presenting evidence, options and a recommendation, and persists the answer.
7. The session checkpoints on every step; work resumes from persisted state after any interruption.
8. When every completion criterion is met, the tool produces a final report and the assistant hands over to the engineer, who reviews `CHG-INITIAL` and accepts or rejects it through a pull request.

## Alternative Flows

- Evidence changes mid-session: the affected source is flagged stale, its findings are invalidated, and it is re-read and re-classified before completion.
- The engineer supplies additional material or authorises an online resource mid-session: it joins the inventory as first-class evidence, hashed where content is available.
- The engineer declines an external source: the related lead is closed with that decision on record.
- A question cannot be answered now: it is deferred with a reason the engineer agrees to, and the deferral appears in the final report.

## Failure Conditions

- An accepted baseline already exists: the session refuses to start, and recovered knowledge is directed to an ordinary Product Change instead of `CHG-INITIAL`.
- Session state is corrupted or was edited by hand: the tool refuses to load it and reports every defect rather than guessing.
- The accepted model changes during the session: the violation is reported and recovery cannot complete until a human resolves it.

## Postconditions

- `CHG-INITIAL` holds the complete proposed future state; the accepted model is byte-identical to the session start.
- The session directory holds the evidence inventory, coverage, leads, questions with answers, validation results and the final report, all generated and non-canonical.
- Nothing was applied, merged or accepted by tooling or assistant.
