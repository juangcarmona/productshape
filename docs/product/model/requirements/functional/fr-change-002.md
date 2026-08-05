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
    scenario: Apply refuses a change whose status is not approved
  - id: S2
    scenario: Apply refuses when a touched artifact changed since base-revision
  - id: S3
    scenario: A dry run reports the plan and the product diff and writes nothing
  - id: S4
    scenario: A successful apply writes the model, archives the change and creates no commit
---

## Requirement

The product MUST apply a Product Change through `prodshape change apply <id>`, and only under these conditions. Apply MUST require `status: approved`. It MUST revalidate the overlay. It MUST fail when any artifact named in the change's operations changed in the baseline since `base-revision`, until the change is explicitly rebased. It MUST write the additions, modifications and removals into the model, naming files by lowercase ID. It MUST compute the product diff between the baseline and the applied result, recording every impacted artifact and its resulting content digest, derived from the result rather than from the declared operations. It MUST validate the resulting model and leave the working tree untouched if that fails. It MUST then set the change to `applied` and move it to `changes/completed/`.

Apply MUST support `--dry-run`, preflighting every planned action before mutating anything and leaving the working tree untouched when the preflight fails. Apply MUST NOT run implicitly, MUST NOT create Git commits, and MUST NOT push, open, approve or merge anything. A successful apply MUST NOT be reported as acceptance.

## Rationale

Apply is the step that makes a proposal concrete, and it is exactly one step. It gates on the change's own validity and nothing else: it carries no evidence contract and asks nothing about whether the work has been built, because whether accepted intent has been implemented is a fact about delivery and not about the product.

Keeping apply separate from acceptance is what stops a tool from deciding product intent. The model files on a working branch are a proposal; the same files on the canonical branch are the accepted Product Definition. Apply changes the first, and only a human merging the pull request changes the second.

The diff is computed from the result because that is the only thing that is true. A declared modification whose proposed text is byte-identical changed nothing, and reporting it as changed would send every citation of that artifact stale for no reason.

## Acceptance Scenarios

- S1: apply refuses a change whose status is not approved
- S2: apply refuses when a touched artifact changed since base-revision
- S3: a dry run reports the plan and the product diff and writes nothing
- S4: a successful apply writes the model, archives the change and creates no commit
