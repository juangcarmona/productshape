---
name: analyze-product-change
description: Convert a requested product modification into an explicit, validated Product Change delta against the current product graph; use when a change is requested and no Product Change exists for it yet.
---

# Analyze Product Change

## Purpose

Turn a raw change request — an idea, a stakeholder ask, a defect that is a definition gap, or
findings reported back from an SDD workflow — into a Product Change: an explicit delta against the
baseline product model, expressed as `add`/`modify`/`remove` operations with complete proposed
future-state artifacts. The baseline under `docs/product/model` is never touched; the change is a
separate, validated overlay a human will later approve.

## When to use

- A product modification has been requested and no active Product Change represents it yet.
- SDD feedback (questions, contradictions, gaps) needs to become a definitional change.
- A defect investigation concluded the product definition itself is wrong or incomplete.

Do not use this skill to slice an approved change (use `slice-product-change`), to prepare a
handoff (use `prepare-sdd-handoff`), or to edit the baseline directly (never done by any skill).

## Required inputs

- The change request, in the requester's words: what should be different and why.
- Access to the repository containing `docs/product/model` and `docs/product/changes/`.
- A working `product-definition` CLI.
- Optional: candidate artifact IDs the requester already suspects are affected.

## Files to read

- `docs/product/model/**` — the current baseline; read every artifact plausibly related to the
  request before proposing anything.
- `docs/product/changes/active/*/change.md` — other active changes, to spot overlapping
  `modify`/`remove` sets early (overlap is validation error PRODUCT025).
- `templates/product-change.md` — the change.md template, including required body sections.
- `docs/specification/product-changes.md` — the normative contract for operations and lifecycle.
- `docs/specification/artifacts.md` and `docs/specification/frontmatter-reference.md` — what each
  artifact kind means, and the exhaustive field contract every proposed future-state artifact must
  satisfy.
- `skills/analyze-product-change/references/operations-checklist.md` — the pitfall checklist for
  operations and proposed/ completeness.

## Deterministic commands

- `prodshape graph` — compile the current product graph.
- `prodshape inspect <ID>` — show one artifact and its direct relationships.
- `prodshape impact <ID> [--depth n] [--direction incoming|outgoing|both]` — structural
  impact of touching or removing an artifact.
- `git rev-parse HEAD` — the current baseline revision, recorded as `base-revision`.
- `prodshape change validate <CHG-ID>` — compile and validate the change's overlay.
- `prodshape validate --change <CHG-ID> --format json` — machine-readable diagnostics.
- `prodshape schema <kind>` — the allowed frontmatter for a kind, before authoring a proposed
  artifact of that kind.

## Reasoning procedure

1. Read the request. Restate it in one or two sentences of product behaviour. If you cannot,
   the request is a question, not a change — stop and ask.
2. Inspect the current graph. Run `prodshape inspect` on every candidate artifact and
   `prodshape impact` on artifacts the change would modify or remove. Treat the tool
   output as the certain, structural impact; your judgment about which connected artifacts are
   _meaningfully_ affected is semantic interpretation layered on top. Keep the two distinct and
   say which is which when you report.
3. Identify affected artifacts across all kinds: actors, journeys, use cases, business rules,
   domain terms, bounded contexts, functional requirements, quality requirements, constraints.
4. Decide the operation for each affected artifact: `add` (ID must not exist in the baseline),
   `modify` (ID must exist; the proposed artifact keeps the same ID), or `remove` (ID must exist;
   no tombstone file). Apply `references/operations-checklist.md` to every decision.
5. Choose a change ID (`CHG-<AREA>-<NNN>`) not used by any active or completed change. Create
   `docs/product/changes/active/<chg-id>/` (directory name is the lowercase ID) with `change.md`
   from the template: `status: draft`, `base-revision` set to the output of `git rev-parse HEAD`,
   and the `operations` lists exactly matching your decisions.
6. Author the complete proposed future-state artifacts under `proposed/`, mirroring the layout of
   `docs/product/model`. Every file is the full artifact as it should exist after promotion — not
   a diff, not an instruction like "update the rule". One proposed file per `add` and `modify`
   entry; nothing under `proposed/` that is not listed in operations.
7. Fill the required body sections of `change.md`: Problem, Intended Product Outcome, Rationale,
   Affected Product Areas, Open Questions, Product Acceptance, Out of Scope.
8. Record open questions honestly. Every product decision the request raises but does not answer
   goes into `## Open Questions` — verbatim, visible, unanswered. Do not invent an answer to make
   the change look complete.
9. Run `prodshape change validate <CHG-ID>`. Fix every structural error (PRODUCT001–009,
   PRODUCT020–026) by correcting operations or proposed artifacts, then re-run until errors are
   gone. Report remaining warnings; do not silence them by weakening the change.
10. If a semantic product decision is missing — a behaviour with two defensible interpretations, a
    rule the requester left ambiguous — stop and put the explicit product question to the human.
    Do not pick an interpretation silently.

## Allowed modifications

- Create `docs/product/changes/active/<chg-id>/change.md`.
- Create and edit files under `docs/product/changes/active/<chg-id>/proposed/`.
- Update the same change's `change.md` (operations, body sections, open questions) while iterating.

## Forbidden actions

- Never modify, create or delete anything under `docs/product/model` — all evolution goes through
  the change's `proposed/` directory.
- Never set the change status to `approved`, `in-progress` or `implemented`; leave it `draft` (or
  `proposed` if the human asks for it to be put forward).
- Never run `prodshape change promote` — promotion is human-only.
- Never invent product decisions; unresolved questions stay visible in `## Open Questions`.
- Never create delivery slices or backlog items at this stage; the change must be structurally
  coherent and approved first.
- Never write proposed artifacts as diffs or partial edits; every proposed file is complete.
- Never substitute your own judgment for `prodshape change validate` output.

## Human approval points

- Moving the change from `draft`/`proposed` to `approved` is a human decision (approval point 1
  of the Change operation). Present the change; do not approve it.
- Every open question is a pending human decision. List them explicitly when you hand over.
- If this change overlaps another active change's modify/remove set, a human decides which change
  is rebased or withdrawn.

## Expected outputs

- `docs/product/changes/active/<chg-id>/change.md` — status `draft`, correct `base-revision`,
  operations matching `proposed/` exactly, all seven body sections filled.
- Complete proposed future-state artifacts under `proposed/`.
- A summary for the human: the delta in one paragraph, structural vs semantic impact, the
  operations list, every open question, and the validation result.

## Completion checks

- `prodshape change validate <CHG-ID>` exits 0 with no errors; warnings are reported.
- Every ID in `operations.add`/`modify` has exactly one complete file under `proposed/`, and
  nothing under `proposed/` is unlisted.
- `base-revision` equals the `git rev-parse HEAD` value at creation time.
- The baseline is untouched: `git status docs/product/model` shows no changes.
- Open Questions contains every unresolved decision encountered, or is genuinely empty.
