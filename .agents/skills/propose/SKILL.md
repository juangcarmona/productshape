---
name: propose
description: "Turn a ready work item into a reviewable solution design with tasks and test impact, raised as a draft pull request. Use when proposing or designing the solution for a ready work item."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

Lifecycle stage 2. Turn a ready item into a **designed solution**, written down and open for review, and end at the Planned gate.

Input is a work item identifier, and it is required. If none was given, ask for one before starting.

Invoke deliberately. No lifecycle stage runs this one on its own.

## When to use

- Proposing the solution for a work item that has passed the Ready gate.
- Designing the solution for a ready item and getting that design reviewed.
- Producing the plan artifact a reviewer will read before any code exists.

## When not to use

- Writing the code. That is `implement`, which continues on the branch this stage creates.
- Defining the problem or authoring acceptance criteria. That is `refine`.
- Recording a decision with lasting trade-offs on its own. That is `adr`, which this stage calls when a decision graduates.

## Workflow

Every external write is shown first and confirmed, except when invoked by an enabled `/ff` run whose durable record authorizes routine lifecycle writes. That mode changes no gate or protection rule.

1. **Load the configuration.** Read `docs/engineering-lifecycle.md`. Absent means stop and say to run `adopt` first.
2. **Check readiness.** `read-work-item`, then `refine-to-ready` in evaluate mode. Not ready means stop and point at `refine` for this item, naming the unmet dimensions. Never plan around an undefined problem: the design will encode the ambiguity and nobody will see it again until implementation.
3. **Inspect the code.** Identify the affected components, the seams the change runs through, and what it will touch that nobody expects.
4. **Check documentation drift** via `classify-doc-drift` where installed. A plan built on a page that is behind the code is a plan built on fiction. A pair reported diverged is a finding for a human, not something to fix here.
5. **Design the solution**: approach, architecture impact, the trade-offs considered and why this one wins. A decision with lasting consequences graduates to an `adr`.
6. **Plan the work**: ordered tasks, each small enough to be verifiably done.
7. **Plan the tests.** What proves this change works: new and affected unit, integration and end-to-end scenarios. A first-class output, not an afterthought.
8. **Name the Definition of Done items this change will have to satisfy**, from the configuration. The Done gate should never be the first time anyone reads them, and an item that will be expensive to satisfy is far cheaper to discover now.
9. **Write the plan artifact** via `propose-change`: proposal, design, tasks and test plan, carrying the work item identifier. Where the configuration's **Provided roles** names a skill for this contract, that skill is `propose-change`; the contract is the same either way.
10. **Pick the item up.** `wip-query` where a cap is configured, and at or over it stop and report which items hold it; `commit-to-sprint` where the project commits to sprints; `transition-work-item` to the in-progress state the mapping names.
11. **Branch and commit.** `create-branch` from the current target, commit the plan artifact, push.
12. **Raise the draft pull request** via `open-pull-request` with `draft` set. The draft state **is** the review gate: unmergeable by construction. The body carries the plan summary and links the item. The draft does **not** guarantee CI will not run: GitHub `pull_request` workflows can run on drafts unless the workflow filters on `draft`. Whether validation ran is a check-state fact, not a draft-state fact.
13. **Share it back** via `comment-work-item` with the plan summary and the pull request link, where that role is installed.
14. **Stop at the Planned gate.** In normal mode, a person reads the plan in the pull request thread and decides whether this is the right problem, solution, and test plan. In enabled `/ff` mode, return the plan for an independent review by the configured different model; only its durable `approve` decision can substitute for this gate. A forge-required human review remains required. Name `implement` as what follows once the applicable review passes, and do not invoke it.

## Validation

- The item passed the Ready gate before any design was written.
- The plan artifact carries proposal, design, ordered tasks and test plan, and names the work item.
- The Definition of Done items this change must satisfy are listed explicitly.
- Exactly one branch and one pull request exist for the item, and the pull request is a draft.
- The work-in-progress cap was respected where one is configured.
- Nothing but the plan artifact was committed, except that an enabled `/ff` run also commits its run evidence record so decisions remain durable.
- The stage ended at the gate, naming `implement` without invoking it.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Writing code while proposing | This stage commits the artifact and nothing else |
| Proposing a solution for an item that is not ready | Point at `refine` and name the unmet dimensions, rather than refusing bare |
| Opening the pull request ready for review | The draft state is the gate. Marking it ready is `implement`'s act, and it means something |
| Assuming the draft suppresses CI | `pull_request` workflows can run on drafts. Read the check state; do not infer it from the draft flag |
| Opening a second branch or pull request for an item that has one | Reuse the existing one |
| Treating the work-in-progress cap as a warning | It is a hard stop where the project configured one |
| Leaving the test plan implicit | It is a first-class output; a change nobody planned tests for is a change nobody can verify |
| Fixing a diverged doc pair here | Report it. Resolving divergence is not this stage's job |
| Running `implement` after opening the pull request | The stage ends at its gate |
