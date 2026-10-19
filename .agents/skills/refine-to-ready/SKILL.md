---
name: refine-to-ready
description: "Judge a work item against the project's Definition of Ready, then close the gaps or name them. Use when refining a backlog item before planning, or when a Ready gate needs a verdict."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

One responsibility: judge a work item against **this project's** Definition of Ready, and close the gaps or name them. The Ready gate asks whether the problem is sufficiently defined, never whether the solution is designed.

Readiness has no build to run and no suite to go green. It is a semantic judgement about a piece of writing, which is why an agent can make it: read the item, read the definition, decide dimension by dimension, and escalate what cannot be settled.

## When to use

- Refining a backlog item before it can be planned.
- Checking whether an item is ready to be picked up.
- Giving a Ready gate a verdict it can act on.

## When not to use

- Recording the outcome on the item. This skill hands back a draft or a verdict; creating, updating, transitioning and commenting belong to the caller.
- Designing the solution or writing the test plan. Identifying affected scenarios is a Ready dimension; the plan itself is a planning output.

## Workflow

### Load the definition first

Read `docs/engineering-lifecycle.md`, section `## Definition of Ready`. That section, including its *Additional to this project* table, is the **only** rubric. Do not carry one here, do not fall back to a generic checklist, and do not import another project's answers.

If the file is absent, stop and report that this repository has no lifecycle configuration and that `adopt` should run first. Never guess a team's definition.

*Done when:* every dimension the project requires is in hand, with its wording.

### Mode: raw input

An idea, a paragraph, a document section: anything not yet a work item.

1. **Read the source and its context.** Follow any path or anchor given, and read what the definition points at (product rules, glossary, prior decisions, specifications), wherever this project records them. *Done when:* the source and every referenced document are in hand.
2. **Draft what the source already answers.** Fill every dimension you can from what you have read and mark the rest as gaps. Lead with a draft; never open with a blank interrogation. *Done when:* each dimension is answered, marked as a gap, or marked `N/A` with a reason.
3. **Close the gaps by asking.** One cluster of questions at a time, blocking ones first. Stop asking about a dimension the moment it is satisfied. *Done when:* no gap remains that the human can close.
4. **Author the acceptance criteria.** Writing clear, verifiable criteria is part of refining, not a precondition for it and not a promise deferred to a later stage. *Done when:* the criteria are observable, verifiable and confirmed.
5. **Surface blocking unknowns instead of assuming.** A dimension that depends on an unresolved decision is recorded as blocked on it. *Done when:* no dimension silently assumes something nobody decided.
6. **Emit the draft**: every dimension the project requires, in its wording, with `N/A` and a reason where inapplicable. *Done when:* the draft is handed back for the caller to record.

### Mode: existing work item

The caller supplies the item's current content. Evaluate; do not interrogate.

1. **Judge every dimension** against what is actually written. Missing, vague and contradictory all count as unmet: a dimension that requires a rereading to find is not met. *Done when:* every dimension is judged met, unmet, or `N/A` with a reason.
2. **Return a verdict.** **Ready** means every applicable dimension met, listing which were judged `N/A` and why so the judgement is auditable. **Not ready** names each unmet dimension and what specifically is missing, concrete enough for the caller to post verbatim, never a bare refusal. *Done when:* the caller can act without re-reading the item.

### Escalate, do not block

A verdict of not ready is an **alert to a human, not a veto**. Report the named gaps and let the human decide whether to close them, override the gate, or reshape the item. Automating this check keeps items with undefined problems from reaching planning by accident; it does not remove the person from the decision.

## Validation

- The rubric came from the project's configuration, not from this file.
- Every dimension the project requires has a verdict: met, unmet, or `N/A` with a reason.
- Unmet dimensions say what specifically is missing, not just that something is.
- Acceptance criteria, where authored, are observable and were confirmed by a human.
- Nothing was created, updated, transitioned or commented on.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Falling back to a generic readiness checklist | The project's adopted definition is the only rubric. Absent configuration means stop |
| Demanding a design before granting readiness | That is a definition no item ever passes. Architecture belongs to planning |
| Treating a vague dimension as met | Missing, vague and contradictory all count as unmet |
| Opening with a blank interrogation | Lead with a draft built from what the source already answers |
| Filling a dimension that depends on an unresolved decision | Record it as blocked on that decision |
| Inventing acceptance criteria the human did not confirm | Draft, confirm, then record |
| Returning a bare "not ready" | Name each unmet dimension and what is missing |
| Duplicating the definition into this file | It lives in the configuration and changes without touching this skill |
