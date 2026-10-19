---
name: refine
description: "Take a raw idea or an existing work item to the project's Definition of Ready, authoring the acceptance criteria. Use when refining, grooming or shaping a backlog item, or taking an idea to ready."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

Lifecycle stage 1. Turn fuzzy input into a work item whose **problem** is sufficiently defined, and end at the Ready gate.

Input is a work item identifier or a raw idea. If neither is given, ask for one before starting.

Invoke deliberately. No lifecycle stage runs this one on its own.

## When to use

- Refining, grooming or shaping a backlog item.
- Taking a raw idea to the point where it can be planned.
- Closing the gaps a Ready gate verdict named.

## When not to use

- Designing the solution, choosing an approach or breaking work into tasks. That is `propose`.
- Checking whether an item is ready without changing it. That is `refine-to-ready` in evaluate mode, or `status`.
- Setting up the project's Definition of Ready in the first place. That is `adopt`.

## Workflow

Every external write is shown first and confirmed.

1. **Report review debt.** Name any merged item with no entry in the review log, then continue anyway. This is the loop's feedback arrow: observable, never blocking. Nobody is stopped from starting work because a past retrospective is outstanding, but nobody gets to not know either.
2. **Load the configuration.** Read `docs/engineering-lifecycle.md`. Absent means stop and say to run `adopt` first. Never invent a Definition of Ready.
3. **Gather the item's context.** `read-work-item`, then `read-work-item-links` and `read-work-item-attachments` where installed. Skip for a raw idea. An item whose requirement lives in an attachment is common, and unread attachments are how a stage confidently refines the wrong thing.
4. **Gather documentation context.** `discover-related-docs` from the item's summary and components, then `read-kb-page` on the promising ones. Where those roles are not installed, read what the project's own documentation points at.
5. **Judge against the Definition of Ready** via `refine-to-ready`, which returns either a ready verdict or the named unmet dimensions.
6. **Close the gaps.** Ask the blocking questions first, grouped, leading with a draft rather than a blank question. Stop asking about a dimension the moment it is satisfied.
7. **Author the acceptance criteria.** Writing clear, verifiable criteria is this stage's job, not a precondition for it, and never a promise deferred to planning. Draft them, confirm the intent, record them.
8. **Record.** An existing item gets `update-work-item`; a raw idea gets `create-work-item`.
9. **Move the state** where the configuration's mapping says refinement changes it, via `transition-work-item`. A configuration that maps no transition to this stage means the item's state does not move here, and that is a valid answer.
10. **Stop at the Ready gate.** It is agent-verified: readiness is a semantic judgement about a piece of writing, so make it and escalate what cannot be settled. Every applicable dimension satisfied means ready; anything missing, vague or contradictory means alerting the human, naming the dimensions and what could not be found. A verdict of not ready is an alert, **not a veto**: the human decides whether to close the gaps, override, or reshape the item. Name `propose` as what follows and do not invoke it.

## Validation

- The configuration was read, not assumed.
- Every applicable Definition of Ready dimension has a verdict, and unmet ones are named individually.
- Acceptance criteria exist on the item and are verifiable as written.
- Attachments and links were read where those roles are installed.
- Every write was confirmed, and its content shown first.
- Review debt was reported, and did not block anything.
- The stage ended at the gate, naming `propose` without invoking it.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Designing the solution while refining | Architecture and tasks belong to `propose`. A Definition of Ready that demands a design is one no item ever passes |
| Granting readiness on criteria promised for later | Authoring them is this stage's work |
| Filling a dimension that depends on an unresolved decision | Record it as blocked on that decision, never with something plausible |
| Asking one blank question per dimension | Group them, lead with a draft, and stop the moment a dimension is satisfied |
| Firing a transition the configuration marks human-only | Report finding one; never fire or reverse one |
| Treating a not-ready verdict as a refusal | It is an alert. The human decides |
| Running `propose` after reporting ready | The stage ends at its gate |
