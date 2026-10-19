---
name: harden-process
description: "Turn one concrete failure into the smallest durable guard in the process itself. Use when a pipeline went red, a defect escaped, a review caught what the process should have, or done was claimed falsely."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

One responsibility: convert one observed failure into one durable guard, so the same class of miss cannot pass silently again.

Fixing the instance restores the build. Fixing the **process** is what stops the next one, and the process is expected to improve itself as it runs, not at some distant retrospective.

Input is what failed and the evidence: a pipeline log, a review comment, a defect report, a claim that turned out to be untrue. Output is the named process gap, the edit that closes it, and the counterfactual check. Or a reasoned *"no guard warranted"*.

## When to use

- When `review` finds a lesson that is a missing guard rather than a one-off.
- Standalone, after a red pipeline, an escaped defect, or a review that caught something the process should have.
- Any moment a stage was reported done when it was not.

## When not to use

- Fixing the code defect itself. That is `implement`, and it restores the build without closing the gap.
- Recording the lesson in the review log. That is `review-entry`, which this skill's outcome feeds.
- Amending `docs/engineering-lifecycle.md` without a shown diff and a human confirmation. `review` owns that proposal.
- Recording a decision with lasting trade-offs. That is `adr`.

## Workflow

1. **State the failure as an observation**, with evidence: what was claimed, what was true, and how the difference surfaced. *Done when:* the claim and the reality are both written down, separately.
2. **Name the process gap, not the code bug.** Ask what the process *permitted*: a verification that was partial; a step whose completion criterion could be satisfied without doing the work; a requirement nobody ever stated; a check reported as "queued" and accepted as "green". *Done when:* the gap is a sentence about the process, and the code defect is explicitly named as *not* the gap.
3. **Locate the single source of truth** for that gap: the one skill, capability, definition or convention that owns it. The same meaning in two places is duplication, and duplicated copies drift apart. *Done when:* exactly one file is identified as the owner.
4. **Land the smallest edit that makes the gap checkable.** In order of preference: sharpen an existing completion criterion; add a step; add a new skill only when a genuinely distinct responsibility has appeared. **The edit must be one an agent can fail**: *"verify X exists"* beats *"remember to X"*. *Done when:* the edit is written, and a run that skipped it would be detectably wrong.
5. **Apply the counterfactual.** Re-read the edited instruction against the original failure and state plainly whether, followed literally, it would have caught it. *Done when:* the answer is yes. If it is no, the edit is not finished.
6. **Record it where the team will meet it**: the work item's per-item retrospective, and a note on the item or the pull request when a reviewer needs to know the process moved. *Done when:* the guard is discoverable by someone who was not in this session.

### Where a guard may live

| The gap is in | The guard goes in |
| --- | --- |
| How a stage is executed | The capability that owns the stage |
| How one responsibility is performed | The skill that owns it, at its source in `.agents/skills/`, never a generated harness copy |
| What the team calls ready | Their Definition of Ready |
| What the team calls done | Their Definition of Done, often as a lane change |
| A decision with lasting trade-offs | A decision record |

A gap in what "done" means is the most valuable kind to find, because moving an item from the judgement lane to the deterministic lane converts a thing people must remember into a thing that fails loudly.

## Validation

- The claim and the reality are recorded separately, with evidence.
- The gap is stated as a property of the process, and the code defect is named as not being it.
- Exactly one file owns the guard, and it is the source rather than a copy.
- The edit is one an agent can fail, not a reminder.
- The counterfactual answers yes against the original failure.
- The guard is discoverable by someone who was not in this session.
- Or the outcome is a recorded *"no guard warranted"*, with its reason.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| One edit covering a cluster of misses | One failure, one guard. Each miss gets its own smallest edit, so each can be judged and reverted independently |
| Adding a line the agent already obeys by default | No no-ops. If the instruction restates a default, the real gap is elsewhere: keep looking |
| Loosening a rule, excluding a path or lowering a threshold | Widening a gate to make a failure disappear is the opposite of hardening |
| Paying a cost on every future run to prevent a one-off | Not worth it. Say so and stop: *"no guard warranted"*, with the reason, is a legitimate and common outcome |
| Fixing the code and calling the process hardened | The instance fix restores the build; naming the process gap is what stops the next one |
| Writing *"remember to X"* | Write *"verify X exists"*. The edit must be one an agent can fail |
| Putting the same meaning in two files | Duplicated copies drift apart. One owner |
| Editing a generated harness copy of a skill | The next copy overwrites it. Fix the source under `.agents/skills/` |
| Attaching the guard to one item's code | The guard belongs to the process |
| Accepting an edit the counterfactual says would not have caught it | The edit is not finished |
