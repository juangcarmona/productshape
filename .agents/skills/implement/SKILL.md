---
name: implement
description: "Apply the approved plan on its branch, verify the change against the Definition of Done in both lanes, and mark the pull request ready for review. Use when implementing or finishing a planned work item."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

Lifecycle stage 3. Turn an approved plan into a **change that is finished and proven**, and end at the Done gate.

Input is a work item identifier, and it is required. If none was given, ask for one before starting.

Invoke deliberately. No lifecycle stage runs this one on its own.

## When to use

- Implementing or building out a work item whose plan has been approved.
- Finishing a change that is partly done and taking it to the Done gate.
- Re-running the gate after fixing what it reported unmet.

## When not to use

- Designing the solution or deciding the approach. That is `propose`, and its output is the input here.
- Merging the finished change. That is `integrate`.
- Running the deterministic checks alone, outside a lifecycle cycle. That is `verify-like-ci`.

## Workflow

Every external write is shown first and confirmed, except when invoked by an enabled `/ff` run whose durable record authorizes routine lifecycle writes. That mode changes no deterministic check or repository protection rule.

1. **Load the configuration.** Read `docs/engineering-lifecycle.md`. Absent means stop and say to run `adopt` first.
2. **Check the plan was approved.** `read-work-item` plus the pull request's review state via `inspect-pull-request`. In enabled `/ff` mode, the independent review decision recorded for the current plan may satisfy the lifecycle's plan gate. Any approval required by the forge remains required. No applicable approval means stop and point at `propose` for this item. Implementing an unreviewed plan is how a stage builds the wrong thing correctly.
3. **Continue on the plan's branch** via `checkout-branch`. Never a new branch, never a second pull request. The branch already carries the plan; the code joins it.
4. **Apply the plan, task by task**, via `apply-change`, committing incrementally so the branch keeps a narrative a reviewer can follow. Where the configuration's **Provided roles** names a skill for this contract, that skill is `apply-change`; the contract is the same either way.
5. **Surface deviations immediately.** A plan step that cannot be followed as written is reported when it is found, not absorbed silently and mentioned at the end. Update the artifact so the plan and the code stay in step.
6. **Update the documentation the change affects**, in the same branch. Behaviour that changed and documentation that did not is a defect with a delay on it.
7. **Keep the task list honest as you go.** Tick a task only when the code supports it. The authoritative reconciliation against the diff happens in step 9, and it is not yours.
8. **Run the deterministic lane in this session.** `verify-like-ci` runs what the pipeline runs, derived from the pipeline definitions rather than memory. `verify-runtime` captures evidence for a user-facing change. Their output belongs here, where a failure is immediately actionable.
9. **Delegate the independent audit** to the `done-gate-auditor` agent. It reconciles the plan and its task list against the actual diff, checks that the evidence the Definition of Done requires exists and is linked, names verification that is missing rather than merely failing, and prepares the judgement-lane items with their owning roles. This delegation is required: a session that just wrote the change cannot audit whether the change matches the plan, because it carries its own rationalisations. In enabled `/ff` mode, invoke it with the configured different review model; it may decide only judgement items explicitly marked substitutable in `## Fast Forward`.
10. **Close what the gate reported unmet.** Each item comes with what is missing and who or what closes it. Fix, then re-run the **whole** check, never the sub-command that failed.
11. **Commit and push.** Before staging, confirm the branch is the item's branch. After pushing, confirm the remote matches local.
12. **Mark the pull request ready for review** via `update-pull-request`. This starts CI and notifies people, which is why it is a deliberate act and not a side effect.
13. **Move the state** to what the mapping names for review, via `transition-work-item`.
14. **Harden the process if this stage went red.** A failed pipeline, a check that should have caught something earlier, a step reported done that was not: each becomes one durable guard via `harden-process`. The loop improves while it runs, not at some distant retrospective.
15. **Stop at the Done gate.** **Both lanes, or it has not passed**: a green deterministic lane is half the gate, not the gate. In normal mode, the named role decides judgement items. In enabled `/ff` mode, only the configured different review model may decide items explicitly marked substitutable; every other judgement item remains unmet until its named human role decides it. After the gate, a human reviews the change unless `/ff` has a valid independent-review decision and forge policy permits it. Name `integrate` as what follows once the applicable review passes, and do not invoke it.

## Validation

- The plan was approved before any code was written.
- Work happened on the plan's existing branch, with no second branch or pull request.
- Every deviation from the plan is recorded in the artifact, not just in the conversation.
- `done-gate-auditor` ran, and its reconciliation of plan against diff is what the gate rests on.
- Every applicable Definition of Done item has a verdict; unmet ones are named individually with their owning role.
- No check reported as passing was actually unrunnable.
- Documentation affected by the change was updated in the same branch.
- The pull request is ready for review and the remote matches local.
- Anything that went red produced a durable guard.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Implementing a plan nobody approved | Stop and point at `propose` |
| Opening a second branch or pull request | One branch, one pull request, one item |
| Auditing your own work against the plan | Delegate to `done-gate-auditor`. Independence is the point |
| Reporting a subset of checks as green for the whole | A chained command stops at the first failure: the later checks never ran, and their silence is not a pass |
| Treating `unrunnable` as `passing` | A check this machine cannot run leaves its Definition of Done item unmet, by name |
| Re-running only the check that failed | Re-run the whole Definition of Done |
| Softening the gate to unblock the change | Widening it is not passing it |
| Deciding a judgement-lane item yourself | The named role decides. Never approve your own work |
| Running `integrate` after the gate passes | The stage ends at its gate |
