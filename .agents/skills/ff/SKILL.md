---
name: ff
description: "Run the configured development lifecycle end to end with bounded, independent agent reviews and durable evidence. Stops at any unmet deterministic check, protected human gate, or unsupported model selection."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

Fast Forward (`/ff`) runs the repository's existing lifecycle stages for one work item, from refinement through integration and review. It composes the stage skills; it does not implement their logic again.

Input is a work item identifier or a raw idea. A raw idea must be recorded through the configured `refine` flow before planning.

Fast Forward is opt-in per repository. It may execute authorized reversible lifecycle writes without pausing for per-write confirmation, because the user explicitly invoked `/ff`. It cannot issue or alter credentials, rewrite shared history, touch production, waive a check, override a forge rule, or satisfy a gate explicitly designated human-only. Judgement gates recorded as substitutable may be decided by the configured independent reviewer.

## Preconditions

1. Read `docs/engineering-lifecycle.md`. If absent, stop and direct the user to `adopt`.
2. Read its `## Fast Forward` and `## Label conventions` sections. Stop if Fast Forward is disabled, any required setting is unresolved, or the work item cannot be mapped to the configured lifecycle.
3. Resolve the executor and independent-review model identifiers using the current harness. Confirm they are different models, not just different agent names or sessions. If the harness cannot select and attest both models, stop before making changes.
4. Confirm the maximum correction rounds is a positive bounded integer and the evidence location is writable in the working tree. If the work item has no branch yet, the run record must be carried into and committed on the branch `propose` creates before implementation starts.
5. Read `AGENTS.md`, equivalent repository instructions, the relevant specs, and the current work item. Any red line or policy requiring human action is a stop condition.
6. Create a run ID and start a durable evidence record at the configured location. Include the work item, branch, starting commit, start time, both model identifiers, configured loop limit, and `running` status. Do not record secrets or private prompts.

## Execution

Invoke each existing stage skill by name and honor its full workflow and gate. Pass the Fast Forward run ID and configured execution mode so stage evidence can be linked to this run. Do not skip or reinterpret a stage because a label or earlier report says it passed.

1. Run `refine` and require its Ready result. If it reports unresolved requirements, use a bounded correction round through `refine`, then stop as `blocked` if Ready is still unmet.
2. Run `propose` (the existing `/plan` alias delegates to the same skill) and require a complete plan artifact. Request an independent review from the configured review model before implementation. The reviewer receives the work item and plan, but not the executor's rationale or verdict. It returns `approve`, `request-changes`, or `stop`, with evidence and findings. A `request-changes` result consumes one correction round; rerun the existing `propose` skill after corrections. A `stop` result ends the run.
3. Run `implement`, including all checks and runtime evidence required by the repository. Invoke `done-gate-auditor` in the independent review model for a fresh audit of plan, diff, and evidence. The reviewer may decide only judgement items explicitly marked substitutable in the Fast Forward configuration. Any human-only or forge-required decision remains unmet and stops the run.
4. On requested changes, invoke `implement` to correct them and rerun the complete applicable deterministic lane and independent audit. Never rerun only a failed sub-check. Stop when the configured correction limit is reached.
5. Run `integrate`, which performs its own final-head Done audit, rechecks review and protection state, and invokes the configured spec synchronization, archive, merge, and tracker roles. The independent review model must audit the final head after the last push. If a push resets a required human approval, or branch protection requires a human review, stop without merging.
6. Run `review` after successful integration. It creates the configured per-item retrospective; route any cross-item process improvement through the repository's existing process ledger. This is the final existing lifecycle stage, not a replacement review implementation.

The independent reviewer must be invoked as an isolated model execution selected by the harness. A separate prompt in the executor's own model context is not independent. Preserve the review request, reviewer identity/model, commit SHA, findings, decision, and correction count as durable evidence. Do not expose hidden chain-of-thought; record concise findings and source evidence only.

## Durable run record

Maintain one machine-readable `run.json` plus a concise human-readable `summary.md` under `<configured evidence path>/<run-id>/`. Use this stable record shape so `status` can read it across providers:

| Field | Contents |
| --- | --- |
| `schemaVersion` | Evidence schema version, initially `1`. |
| `runId`, `workItem`, `branch`, `startedAt` | Stable run identity and lifecycle context. |
| `executorModel`, `reviewerModel` | Harness-resolved model identifiers; they must differ. |
| `maxCorrectionRounds`, `status` | The configured bound and current run status (`running`, `blocked`, `failed`, `awaiting-integration`, or `complete`). |
| `stages` | Ordered stage name, start/end time, input and output commit SHA, result, and evidence references. |
| `reviews` | Reviewer model, review kind, reviewed commit SHA, decision, concise findings, and evidence references. |
| `corrections` | Gate, round number, requested changes, resulting commit, and rerun check/audit outcomes. |
| `stopReason`, `pullRequest`, `links` | Exact stop reason when applicable and durable tracker/PR references. |

Update the same run record throughout execution; do not create a new record on retry. After merge, use the existing `comment-work-item` role to publish the final run ID, `complete` status, merged commit, independent decisions and evidence path. This post-merge summary makes the terminal result durable without writing directly to the protected target branch.

## Stop conditions

- Configuration is absent, disabled, incomplete, or out of date with live tooling.
- The executor and reviewer models cannot be selected and verified as different.
- A deterministic check fails, is skipped, or cannot run.
- An independent review requests changes beyond the correction limit or returns `stop`.
- A human-owned gate is not explicitly substitutable in the repository configuration.
- Branch protection, required approvals, checks, signing, or other repository policy prevents the next action.
- Any credential, shared-history, or production red line is encountered.
- The evidence record cannot be durably updated.

On stop, update the evidence record with the exact reason and name the existing lifecycle capability or human action that can resume the flow. Never label a partial run complete.

## Validation

- The configured executor and independent reviewer are different, resolved models.
- Every existing lifecycle stage ran in order or the record names the exact stop point.
- Deterministic checks and repository protections were honored without exception.
- Every substituted judgement has an independent reviewer decision attached to the commit it covers.
- Corrections stayed within the configured bound and reran the complete affected gates.
- The durable run record reports an accurate terminal status and can be read by `status`.
