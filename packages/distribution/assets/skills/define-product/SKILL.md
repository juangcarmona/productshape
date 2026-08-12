---
name: define-product
description: Create or extend a greenfield product model as draft artifacts with full traceability; use when a product has no definition yet or new product intent must be turned into actors, journeys, use cases, rules, terms and requirements.
---

# Define Product

## Purpose

Establish or extend a product definition from stated intent. Produce a coherent set of draft product artifacts — actors, journeys, use cases, business rules, domain terms, bounded contexts and requirements — that a human can review, correct and approve. This skill performs semantic reasoning only: it drafts and proposes; deterministic tooling validates structure; humans decide what the product is.

## When to use

- A repository has adopted Product Definition as Code and no Product Definition exists yet (`docs/product/model` is empty or absent): the output becomes `CHG-INITIAL`.
- New product intent must be expressed as artifacts after a baseline already exists: author the drafts on a branch, recorded by a change draft, never directly on the baseline.
- An existing draft definition is incomplete and needs additional artifact families derived from intent already captured.

Do not use this skill to reconstruct knowledge from an existing system (use `recover-product`) or to review an existing model (use `audit-product-model`).

## Required inputs

- A statement of product intent from the user: the outcome the product should create, for whom, and why. If intent cannot be stated in one sentence a stakeholder would sign, ask before drafting anything.
- Whether a baseline exists: check for artifacts under `docs/product/model`. This determines the authoring location (see Allowed modifications).
- The change to author into: `docs/product/changes/active/<chg-id>/`, or the user's request to create one.

## Files to read

- `references/authoring-order.md` in this skill — the Define flow and the conceptual dependency chain this skill implements.
- `.product/templates/<kind>.md` — the artifact templates. Always start new artifacts from the matching template.
- Existing artifacts under `docs/product/model`, including anything already drafted on this branch, before creating anything, to reuse IDs, terms and actors instead of duplicating them.

## Deterministic commands

- `prodshape validate --format json` — structural validation of the model.
- `prodshape change validate` — full-tree validation of the working tree as a proposed change (takes no argument).
- `prodshape graph --format json` — the compiled product graph, for reuse checks.
- `prodshape inspect <ID>` — details of an existing artifact before referencing it.
- `prodshape impact <ID>` — what an existing artifact touches, before extending near it.
- `prodshape schema <kind>` — the allowed frontmatter for a kind, read from the schemas bundled with the CLI. Use it instead of guessing; it needs no repository.
- `prodshape inspect BR-CHANGE-001` — the rule governing how the definition changes: every evolution is an applied and accepted Product Change. Run it to read the rule before authoring a change.

Never substitute your own judgement for these commands. If the CLI reports a structural fact, that fact is authoritative (BR-AI-001).

## Reasoning procedure

1. Understand product intent. Restate it in one sentence and confirm with the user if unclear.
2. Identify actors BEFORE inventing features. List every human, external system and scheduled process that interacts with the product. Purpose, goals, responsibilities, boundaries — no personas, no demographics.
3. Build journeys around outcomes. For each significant actor goal, draft the end-to-end path to the outcome, including branches, failures, waiting and manual steps.
4. Identify use cases from journey steps. Each meaningful interaction becomes a use case with trigger, preconditions, main flow, alternatives, failure conditions and postconditions — observable behaviour only.
5. Extract business rules. Every "unless", "must", "only when" hidden in a flow becomes an independently identifiable Business Rule referenced by ID from the flows it governs.
6. Establish domain terms and bounded contexts. Define every word two people could read differently; when one word carries two meanings, create two terms in two contexts.
7. Derive requirements with traceability. Every functional requirement, quality requirement and constraint names what it derives from (`derived-from`) and carries verification scenarios.
8. Preserve uncertainty. Record every unresolved question visibly in the change's `## Open Questions`. Never invent an answer.
9. Generate draft artifacts from the templates, `status: draft`, one file per artifact named by lowercase ID, in the correct location for the mode (see Allowed modifications).
10. Run deterministic validation (`validate` or `change validate`) and fix every reported error.
11. Present the drafts, open questions and validation result to a human for review. Artifacts become `active` only on explicit human approval — never mark them yourself.

The order above is the natural order of discovery, not a gate sequence: loop back freely when a use case reveals a missing actor or a rule forces a term. See `references/authoring-order.md`.

## Allowed modifications

- Author the artifacts under the change's `proposed/` directory and record their IDs in its `operations`. Never edit a baseline file under `docs/product/model`: apply is what writes the model, and a human runs it.
- Editing existing draft artifacts you created in this session, in either location.

## Forbidden actions

- Modifying `docs/product/model` directly after the initial baseline exists.
- Setting any artifact `status` to `active`, or any change status to `approved` or beyond.
- Inventing product decisions: if the intent does not answer a question, it becomes an open question, not an assumption.
- Adding frontmatter fields the artifact's schema does not define: frontmatter is a closed contract and an unrecognised property is rejected as PRODUCT002. Check with `schema <kind>`.
- Writing implementation design into artifact bodies (class names, frameworks, storage choices).
- Replacing deterministic validation with your own reading of the files (BR-AI-001).
- Merging, pushing, or creating Git commits, unless the user explicitly asks.

## Human approval points

- Confirm the one-sentence product intent before mass-drafting artifacts.
- Confirm whether this is `CHG-INITIAL` or a later Product Change when the situation is ambiguous.
- Present all drafts, open questions and the validation report; the human decides whether to approve the change. Stop and wait, and do not proceed past this.

## Expected outputs

- Draft artifact files, one per artifact, created from templates, valid against their schemas, in the correct location for the mode.
- A `change.md` at `docs/product/changes/active/<chg-id>/` whose `operations` name every proposed artifact.
- A clean run of `prodshape validate` (or `change validate`) — zero errors; remaining warnings explained to the human.
- A summary for the human: what was drafted, the traceability chain, and every open question.

## Completion checks

- Every requirement has a non-empty `derived-from` tracing to use cases, rules or constraints.
- Every use case names an existing `primary-actor`; every journey's steps reference existing use cases.
- Every unresolved question appears explicitly as an open question; none were silently answered.
- `prodshape validate` (or `change validate`) was run after the last edit and reports no errors.
- No artifact was marked `active`; the human review request was issued.
