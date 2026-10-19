---
name: review
description: "Learn from a merged cycle: record what happened with measured effort and route the lessons into the process itself. Use when retrospecting a merged work item or closing out a cycle."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

Lifecycle stage 5. Turn a merged change into **a better process**.

Post-merge, and deliberately so. This stage sees what no pre-merge retrospective can: the deploy outcome, CI on the target branch, and anything that broke *because* of the merge.

The Done gate asked whether one change was done enough to integrate. This asks what should change about how the team works. They are never merged into one step.

Input is a work item identifier. If omitted, offer the merged items that have no review entry.

Invoke deliberately. `integrate` offers this stage; it never runs it. This stage gates nothing and blocks no one.

## When to use

- Retrospecting a merged work item or closing out a cycle.
- Improving the lifecycle from something that just happened.
- Clearing review debt that `refine` or `status` reported.

## When not to use

- Reviewing the code in a pull request before merge. That is the human review after the Done gate.
- Setting up or reworking the configuration because the toolchain changed. That is `adopt` in reconcile mode.
- Turning one concrete failure into one guard, on its own. That is `harden-process`, which this stage calls.

## Workflow

1. **Load the configuration.** Read `docs/engineering-lifecycle.md`. Absent means stop and say to run `adopt` first.
2. **Look at what happened after the merge**: the pipeline on the target branch via `inspect-ci-result`, the deploy outcome where the project has one, and anything reported since. This is the material a pre-merge retrospective cannot have.
3. **Measure the effort** via `collect-usage`. Missing telemetry is reported as missing, never replaced with a plausible figure, because every summary built on the log afterwards inherits the lie.
4. **Draft the reflections** from what actually happened: the commit narrative, the blockers hit, the review findings, the gate that fired or failed to. In normal mode, lead with a draft for the human to correct. In enabled `/ff` mode, ask the configured independent review model for a retrospective from the durable run evidence and reconcile it against the executor's draft; unresolved disagreement is recorded as a follow-up for the human.
5. **Record it** via `review-entry`. Create the per-item file once; never overwrite an existing retrospective.
6. **Route what graduates.** Each structural lesson goes where it can take effect:

   | Lesson | Destination |
   |---|---|
   | A problem was underspecified | An amendment to the **Definition of Ready** |
   | Something shipped that should not have | An amendment to the **Definition of Done**: a new item, or a lane change from judgement to deterministic |
   | A role capability misbehaved | The installed capability at its source, `.agents/skills/<role>/SKILL.md`, never a generated harness copy, which the next copy overwrites |
   | A gate fired at the wrong moment | A **gate** change |
   | A decision with lasting trade-offs | `adr` |
   | A missing guard | `harden-process` |

7. **Propose the amendment as a diff.** Any change to `docs/engineering-lifecycle.md` is shown and confirmed by a human before it is written. Nothing edits that file silently: it is the contract the whole loop reads. Route a cross-item improvement to the repository's existing process ledger; the per-item retrospective remains the work item's cycle record.
8. **Feed the next item.** Report what changed and why, so the next `refine` run starts from a better definition than the last one did.

**The improvement that matters most** is moving a Definition of Done item from the judgement lane to the deterministic lane: turning something people must remember into something that fails loudly. When a lesson can be expressed that way, prefer it. It is the only kind of process change that keeps working when everybody is busy.

## Validation

- Post-merge evidence was read, not inferred from the pull request.
- Effort figures come from telemetry, and anything missing is reported as missing.
- The per-item record was created once, never edited over an existing one.
- Every structural lesson has a destination, or a recorded reason for warranting no change.
- No amendment to the configuration was written without a shown diff and a confirmation.
- A role capability fix was made at its source, not in a generated copy.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Editing an earlier entry to correct it | Append-only. A correction is a new, later entry that says what it corrects |
| Estimating effort when telemetry is missing | Missing is a valid, honest answer. A guess poisons every later summary |
| Amending the configuration silently | Diff, then confirm. The whole loop reads that file |
| Turning a one-off into a permanent guard | A cost paid on every future run to prevent something that happened once is not worth it. "No change warranted", with the reason, is a legitimate outcome |
| Fixing a role capability in a harness copy | The next copy overwrites it. Fix the source |
| Opening with "how did it go?" | Lead with a draft built from what actually happened |
| Treating this stage as a gate | It runs after the merge and blocks no one |
