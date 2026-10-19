---
name: review-entry
description: "Create one dated, per-work-item retrospective after a change has merged: what worked, what did not, what to change next time, and sourced effort figures. Use when `review` closes out a work item."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

Create exactly one retrospective record for one merged work item. The default path is `docs/reviews/issue-<number>.md`, configured by the project's `## Label conventions` section. One file per issue prevents parallel reviews from contending on a shared append-only file.

This skill does not measure effort. The caller supplies the effort figures and their source. Missing telemetry is recorded as `not captured`.

## When to use

- At post-merge close-out when `review` has drafted the reflections.
- When recording a retrospective for a completed work item.
- When a post-merge finding needs to be attached to the work item.

## When not to use

- Measuring effort; that is `collect-usage`.
- Amending the Definition of Ready or Definition of Done; `review` proposes that change for human approval.
- Recording a cross-item process rule; use the configured process ledger for that durable lesson.
- Authoring a decision record; use `adr` and link its identifier in the record.

## Workflow

The caller supplies the work item identifier and title, date (`YYYY-MM-DD`, default today), what worked, what did not, what to change next time, effort figures and their source, and the configured path.

1. **Resolve the target.** Read `docs/engineering-lifecycle.md` and use its configured per-item review path. If none is configured, use `docs/reviews/issue-<number>.md`. *Done when:* the exact target path is known.
2. **Check for an existing record.** If the target exists, stop and report it. Never overwrite it or append a second entry. *Done when:* the target is confirmed absent.
3. **Compose the record.** Include the work item and title, date, three reflections, sourced effort or `not captured`, and an amendments section. Route structural lessons to an ADR, process ledger, hardening change, or proposed Ready/Done amendment; use `none` when no amendment is warranted. *Done when:* every field is filled or explicitly marked absent.
4. **Create the file exclusively.** Use a create-if-absent write. If another run creates the same path first, stop and read the existing record; do not overwrite it. *Done when:* exactly one record exists at the target.
5. **Report the record.** Give the caller the work item, path, and any lesson routed to another destination. *Done when:* the record and its follow-up are clear.

## Validation

- Exactly one per-item record was created and any existing record remained unchanged.
- The record follows the configured format and includes all required reflections.
- Every effort figure names its source or is marked `not captured`.
- Structural lessons have a destination or the amendments section says `none`.
- No telemetry was read and no collector was started here.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Appending different issues to one shared file | Create one file per issue |
| Replacing an existing issue record | Stop; a correction is a later, explicit amendment, never an overwrite |
| Guessing an effort figure | Record `not captured` |
| Leaving a structural lesson buried in a retrospective | Route it to the process ledger, hardening work, Ready/Done amendment, or ADR |
| Running another capability from here | The calling `review` stage owns composition |
