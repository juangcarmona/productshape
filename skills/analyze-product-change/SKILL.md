---
name: analyze-product-change
description: Convert a requested product modification into a structured change draft and proposed artifacts in the working tree; use when a change is requested and no change draft exists for it yet. The change is delivered via a pull request — this skill drafts the intent and the artifacts, not the delivery.
---

# Analyze Product Change (ps:change)

Turn a raw change request into a structured change draft (`change.md`) and proposed product artifacts in the working tree. The change is delivered via a pull request — this skill drafts the intent and the artifacts, not the delivery.

**This skill modifies the working tree** (creates/edits files under `docs/product/model/` and `docs/product/changes/`). It does NOT merge, promote, or touch the canonical branch. The engineer reviews, adjusts, and opens a PR.

## Purpose

Provide a structured, AI-assisted drafting workflow that reads the product graph, identifies what changes, drafts new/modified artifacts, validates them, and surfaces open questions — all before the PR is opened.

## When to use

- A stakeholder requests a product modification and no change draft exists yet.
- The engineer wants AI assistance to identify affected artifacts and draft them.
- Do NOT use when the change is already drafted — use `prodshape change validate` to check it instead.

## Required inputs

- The product model under `docs/product/model/` (must exist and be valid).
- The change request (natural language intent from the user).
- A directory slug for the change draft (e.g. `chg-add-cite`).

## Files to read

- All artifact files under `docs/product/model/**` (to understand the current graph).
- `.product/config.yaml` for repository configuration.
- `templates/product-change.md` for the change-draft template.

## Deterministic commands

```bash
prodshape validate              # Validate the current model (before drafting)
prodshape change validate       # Validate the working tree as a proposed change
prodshape change list           # List change drafts
prodshape change archive <ID>   # Archive a change draft after its PR is merged
prodshape impact <ID>           # Check structural reach of an affected artifact
prodshape inspect <ID>          # Inspect an artifact that will be modified
prodshape schema <kind>         # Check the frontmatter contract for a kind
```

## Reasoning procedure

1. **Validate the current model** — run `prodshape validate` to ensure the baseline is structurally sound before drafting changes against it.
2. **Read the full model** — read all artifact files under `docs/product/model/**`. Understand the current graph: actors, journeys, use cases, rules, terms, requirements.
3. **Analyze the change request** — identify which artifacts need to be added, modified, or removed. Use `prodshape impact <ID>` to check structural reach when relevant.
4. **Create a change draft** — create `docs/product/changes/chg-<slug>/change.md` with:
   - `id`: a `CHG-` ID
   - `status`: `draft`
   - `affected-artifacts`: the IDs that will be touched
   - Body sections: Intent, Affected Artifacts, Open Questions, Out of Scope
5. **Draft the artifacts** — create or modify the actual artifact files under `docs/product/model/` directly. These are the proposed changes that will be in the PR.
6. **Validate the proposed change** — run `prodshape change validate` to check the working tree (the model with your changes applied). Fix any diagnostics.
7. **Surface open questions** — any unresolved decisions go in the `Open Questions` section of the change draft. The engineer must resolve them before the PR is ready.
8. **Report** — summarize what was added/modified/removed, what diagnostics were found and fixed, and what open questions remain.

## Allowed modifications

- Create new artifact files under `docs/product/model/`.
- Modify existing artifact files under `docs/product/model/`.
- Create a change draft under `docs/product/changes/`.
- Run `prodshape` commands to validate and inspect.

## Forbidden actions

- Do NOT merge, push, or touch the canonical branch.
- Do NOT invent product decisions — surface them as open questions for the human.
- Do NOT delete artifacts without explicit confirmation from the engineer.

## Human approval points

- The engineer reviews the drafted artifacts before the PR is opened.
- The engineer resolves all open questions before the PR is marked ready.
- The engineer decides when the change is ready to merge (the PR review).

## Expected outputs

- A change draft (`change.md`) with intent, affected artifacts, and open questions.
- New or modified artifact files under `docs/product/model/`.
- A validation report from `prodshape change validate`.
- A summary of what changed and what remains open.

## Completion checks

- `prodshape change validate` reports zero errors.
- All open questions are either resolved or explicitly marked as accepted by the engineer.
- The change draft's `affected-artifacts` list matches the actual files changed.
