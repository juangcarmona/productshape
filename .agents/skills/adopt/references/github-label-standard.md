# Shared GitHub issue lifecycle standard

This is the default GitHub vocabulary for lifecycle status. `adopt` maps the semantics to a repository's live tracker. `adopt defaults` resets its Agentic SDLC configuration to this vocabulary and migrates unambiguous open issues. Neither command changes a label on a closed issue or deletes a label from GitHub.

## Lifecycle status labels

Every open issue has exactly one `status:*` label. GitHub's `OPEN` or `CLOSED` state remains separate. Use these exact names for new and migrated lifecycle labels:

| Label | Meaning | Set by |
| --- | --- | --- |
| `status:backlog` | Accepted for consideration; refinement has not passed (`#EDEDED`) | Issue creation or reset migration |
| `status:ready` | Definition of Ready passed (`#0E8A16`) | `refine` |
| `status:proposed` | The planned approach passed its review gate (`#1D76DB`) | `propose` |
| `status:in-progress` | An approved plan is being implemented (`#FBCA04`) | `implement` on entry |
| `status:in-review` | Implementation passed its Done gate and its pull request awaits integration (`#D93F0B`) | `implement` on exit |
| `status:done` | The linked pull request is confirmed merged (`#6F42C1`) | `integrate` after merge |

The transition sequence is `backlog → ready → proposed → in-progress → in-review → done`. `implement` may pass through both `in-progress` and `in-review`. The pull request body links the issue with `Closes #<number>`; the issue is closed only by the merge.

`blocked` and `owner-review` are optional overlays. They never replace the one lifecycle status, and removing an overlay does not advance the work. Pull-request state is read from the linked pull request; no second issue label duplicates it. A post-merge retrospective is recorded by `review` and does not add another lifecycle status.

## Other labels

Type, area, priority, planning, and operational labels are separate from lifecycle status. Preserve the repository's useful vocabulary and metadata. `adopt defaults` does not clear these labels or remove labels from GitHub. It migrates only a recognized legacy lifecycle label on an open issue after checking the issue and its linked pull request.

Do not add command labels by default. A command is an explicit request from the user, not a label-triggered action. Never infer that a label authorizes a pull request, merge, deployment, or other protected operation.

## Mapping and migration

During ordinary adoption, record the repository's exact state store and map its current states to these semantics. Existing alternatives may remain where migration was not requested; report the mapping in `docs/engineering-lifecycle.md`.

During `adopt defaults`, use this mapping for open GitHub issues. Preserve prior retrospective files, logs, PR comments, and process ledgers as historical records; set a new retrospective baseline date instead of bulk-converting prior history. A process ledger remains separate from per-item retrospectives.

| Existing state | Default state |
| --- | --- |
| No status label; linked ready-for-review PR | `status:in-review` |
| No status label; draft PR contains implementation work | `status:in-progress` |
| No status label; draft PR contains a plan but no implementation | `status:proposed` |
| No status label; active branch has implementation but no PR | `status:in-progress` |
| No status label and no evidence of planning, implementation, or a linked PR; or `status:backlog` | `status:backlog` |
| `stage:refine`, `status:ready`, `refined` | `status:ready` |
| `stage:propose`, `status:proposed`, `proposed` | `status:proposed` |
| `stage:implement`, `bot-working` | `status:in-progress` |
| `stage:integrate`, `status:in-review`, `pr-pending` | `status:in-review` |
| `stage:review`, `status:done` | `status:done` |

Resolve ambiguous labels such as `review`, and missing labels on issues with an active branch or pull request, from the issue, pull request draft/readiness, branch changes, checks, and merge state. A draft PR is `proposed` only when it carries a plan without implementation; a draft PR carrying implementation is `in-progress`. If evidence does not establish one state, leave that issue untouched and report it. Read each issue immediately before migration, preserve its other labels, replace the recognized old lifecycle label in one update, then reread and verify exactly one `status:*` label remains. Never infer `done` from a closed issue alone.

## Review records

The shared default is one append-once retrospective file per work item at `docs/reviews/issue-<number>.md`. This avoids a shared-file append conflict when reviews run in parallel. Each record carries the work item, date, what worked, what did not, what to change next time, effort and its source, and amendments or `none`. The configuration records a baseline date; older merged items are historical and are excluded from review debt.

Keep any repository process ledger separate: it records durable, cross-item process improvements, not a second copy of every retrospective. Preserve an existing process ledger and its format. `status` reports review debt by checking for the configured per-item record.

## Fast Forward defaults

`/ff <work-item>` composes the existing lifecycle stages from the observed state through the configured integration and post-merge review. It uses the same status labels and per-item review records. It may prepare and update the pull request, push its branch, and merge only when all lifecycle gates pass and forge protection permits it. The run record keeps the evidence and reviewer decision tied to the exact commit. Human-only decisions, required human approvals, deployments, and repository red lines remain stop conditions.

## Issue and pull request content

Preserve existing forms and required fields. Where a repository has no issue convention, use an outcome-focused title, problem statement, `## Acceptance criteria`, explicit scope, dependencies, and known risks. A pull request links the issue, summarizes the implemented change, links verification evidence, and records known limitations. Repository-specific product, safety, and operations fields remain in place.
