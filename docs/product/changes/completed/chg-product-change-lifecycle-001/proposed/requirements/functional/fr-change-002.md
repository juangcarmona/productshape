---
id: FR-CHANGE-002
type: functional-requirement
title: Apply an approved Product Change without accepting it
status: active
derived-from:
  - UC-CHANGE-001
  - BR-CHANGE-001
verification:
  - id: S1
    scenario: Apply refuses a change whose status is not approved with PRODUCT028 and exit code 1
  - id: S2
    scenario: Apply refuses when a modified or removed artifact changed since base-revision
  - id: S3
    scenario: A dry run reports the plan and the product diff and writes nothing
  - id: S4
    scenario: A successful apply writes the model, archives the change and creates no commit
  - id: S5
    scenario: Every product diff entry carries its impact kind, and a removal carries no digest
  - id: S6
    scenario: Apply makes no claim about implementation, verification, release or deployment
---

## Requirement

The product MUST apply a Product Change through `prodshape change apply <id>`, and only under these conditions.

Apply MUST require `status: approved`, and MUST refuse any other status with the diagnostic `PRODUCT028`, exit code `1` and the working tree untouched. It MUST revalidate the overlay. It MUST fail when any artifact named in the change's `operations.modify` or `operations.remove` changed in the baseline since `base-revision`, until the change is explicitly rebased; an artifact counts as changed when its normalized content digest differs from its digest at `base-revision`, so a commit that touched the file without changing its content is not drift. `operations.add` is not drift-checked: an addition has no baseline artifact to compare against, and an ID that has appeared in the baseline since is already reported by the revalidated overlay.

It MUST write the additions, modifications and removals into the model, naming files by lowercase ID. It MUST compute the product diff between the baseline and the applied result, derived from the result rather than from the declared operations, and MUST report it in both a human-readable and a machine-readable form. Each diff entry MUST name the impacted artifact, the kind of impact — added, modified or removed — and, for an addition or a modification, the resulting content digest; a removal has no resulting content and carries no digest. Apply MUST NOT write the diff into the archived change, which is immutable once archived.

It MUST validate the resulting model and leave the working tree untouched if that fails. It MUST then set the change to `applied` and move it to `changes/completed/`.

Apply MUST support `--dry-run`, preflighting every planned action before mutating anything and leaving the working tree untouched when the preflight fails. Apply MUST NOT run implicitly, MUST NOT create Git commits, and MUST NOT push, open, approve or merge anything. A successful apply MUST NOT be reported as acceptance and MUST NOT require, discover or attest implementation, verification, release or deployment.

## Rationale

Apply is the step that makes a proposal concrete, and it is exactly one step. It gates on the change's own validity and nothing else: it carries no evidence contract and asks nothing about whether the work has been built, because whether accepted intent has been implemented is a fact about delivery and not about the product.

Keeping apply separate from acceptance is what stops a tool from deciding product intent. The model files on a working branch are a proposal; the same files on the canonical branch are the accepted Product Definition. Apply changes the first, and only a human merging the pull request changes the second.

The status precondition carries a diagnostic code because `status` is a field in the change document, which makes refusing it a finding about the model rather than a complaint about a malformed invocation. The invocation is well formed, so apply exits `1` and not `2`. Drift is judged by content digest so that a formatting-only commit does not force a rebase, and it skips additions because an addition has nothing to be compared against.

The diff is computed from the result because that is the only thing that is true. A declared modification whose proposed text is byte-identical changed nothing, and reporting it as changed would send every citation of that artifact stale for no reason. The diff is derived and recomputable from `base-revision` and the applied result, so reporting it is the obligation; persisting it into a directory that is about to become immutable would make a derived artifact look canonical.

## Acceptance Scenarios

- S1: apply refuses a change whose status is not approved with PRODUCT028 and exit code 1
- S2: apply refuses when a modified or removed artifact changed since base-revision
- S3: a dry run reports the plan and the product diff and writes nothing
- S4: a successful apply writes the model, archives the change and creates no commit
- S5: every product diff entry carries its impact kind, and a removal carries no digest
- S6: apply makes no claim about implementation, verification, release or deployment
