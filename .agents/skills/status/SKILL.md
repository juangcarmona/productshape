---
name: status
description: "Report where a work item sits in the lifecycle, what comes next, and what has drifted. Read-only. Use when asking where an item stands or whether its gates have passed."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

Diagnose a work item's position in the lifecycle and name the next capability. Read-only: mutates no state, no comment, no label, no branch.

Input is a work item identifier. If omitted, infer it from the current branch; if that fails, ask.

Available two ways. In the main session it is this skill. Where the raw tracker, branch, pull request and CI output would rather not enter the working context, the `flow-reporter` agent runs the same procedure in its own context and returns the report.

## When to use

- Asking where an item stands and what to do next with it.
- Checking whether an item's Ready or Done gate has passed.
- Looking for lifecycle drift across the board.
- Finding out what review debt exists.

## When not to use

- Changing anything at all. Every mutation belongs to the stage that owns it.
- Auditing the Done gate to decide whether a change may merge. That is `done-gate-auditor`, invoked by `implement` and `integrate`.

## Workflow

1. **Load the configuration.** Read `docs/engineering-lifecycle.md`. Absent means report that this repository has no lifecycle configuration and that `adopt` should run first, then stop.
2. **Read the item** via `read-work-item`, and its branch and pull request where they exist.
3. **Place it** against the configuration's stage-to-state mapping, and name what comes next:

   | Where it is | What comes next |
   |---|---|
   | Not yet refined | `refine` |
   | Refined, Ready gate unmet | `refine` again: the named dimensions are still open |
   | Ready | `propose` |
   | Planned, awaiting review | a human reviews the plan in the draft pull request |
   | Plan approved | `implement` |
   | In progress | `implement` finishes it out to the Done gate |
   | Done gate unmet | the unmet items, each with its lane and owning role |
   | Done, awaiting review | a human reviews the change |
   | Approved | `integrate` |
   | Merged | `review` |

4. **Report the Done gate's detail** where the item has reached implementation: read the existing evidence and the Done gate configuration, and list the unmet items with their lanes and roles. This is a read-only pass: read the evidence files the Definition of Done records, read the configuration, and report what is satisfied, what is unmet, and what was never verified. Do **not** run `verify-done`'s full workflow, which runs checks and captures runtime artifacts — that writes files and contradicts this skill's read-only guarantee. Where no evidence has been recorded yet, report that rather than running the checks to produce it. "Not done" is only useful with the list attached.
5. **Report review debt**: items merged on or after the retrospective baseline date in `## Label conventions` with no per-item retrospective at the configured path (default `docs/reviews/issue-<number>.md`). Earlier merges are historical, not debt. Naming the missing records is the whole job here; this capability never chases anyone.
6. **Flag drift** where the item's recorded state and reality disagree: an open pull request against an item still marked ready, a merged pull request against an item still in progress, a branch with no item, an item in progress with no branch.
7. **Report Fast Forward history** when `## Fast Forward` is enabled or a run record exists for the item. Read the configured evidence location and the work item's final integration comment where available. Report each matching run's ID and effective status, executor and reviewer models, commit reviewed, gate decisions, correction rounds, stop reason, and PR link. Treat an `awaiting-integration` record as complete only when the linked pull request is confirmed merged and the final completion comment matches its run ID. A review decision is valid only for the commit SHA recorded with that decision. Do not resume, edit, or repair a run record.

## Validation

- Nothing was written: no transition, no comment, no label, no branch, no push.
- The next capability is named explicitly, not left for the reader to infer.
- A "not done" verdict carries the list of unmet items with lanes and roles.
- Drift is reported as a finding, not corrected.
- Review debt is reported even when it is empty.
- Matching Fast Forward executions and independent review decisions are reported from durable evidence, or their absence is stated.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Quietly correcting drift because it is obvious | Drift is a finding. A read-only capability that writes once is one nobody trusts again |
| Running `verify-done` to produce Done gate detail | Read existing evidence instead. `verify-done` runs checks and captures artifacts, which writes files and breaks the read-only guarantee |
| Reporting "not done" with no detail | Attach the unmet items, their lanes and their owning roles |
| Leaving the reader to guess the next step | Name the capability. This is the discoverability surface for a seven-capability loop |
| Invoking the capability it names | Reporting the next step is the job; taking it is the operator's |
| Reporting what should be true rather than what is | Read the tracker, the branch and the pull request, and report those |
