# 0004 — Current model and changes are separated

Status: Accepted Date: 2026-07-25

## Context

A product model that is edited in place whenever someone wants something new stops being a statement of what the product currently is. Reviewers cannot tell accepted behaviour from aspiration, and there is no unit that can be validated, approved, sliced and traced as one evolution. The methodology needs a hard line between "the product as defined today" and "a proposed evolution of it".

## Decision

The baseline — the current product model under `docs/product/model` — is immutable while changes are active. Every semantic evolution is represented as a **Product Change** under `docs/product/changes/active/<chg-id>/`: a canonical `change.md` naming `add`/`modify`/`remove` operations, plus complete proposed future-state artifacts under `proposed/`.

Validation never mutates the baseline. It compiles an **overlay** — baseline plus the change's operations applied virtually — and runs full structural validation against that overlay. Concurrent active changes are checked for overlapping `modify`/`remove` sets (`PRODUCT025`).

Applying a change to the baseline happens only through explicit **promotion**, which requires `implemented` status, completed slices, traceability evidence and baseline-revision compatibility, supports `--dry-run`, and is never triggered implicitly by hooks, SDD archival or any automation.

One bounded exception exists: an initial baseline MAY be established directly during initialization or the first Define operation, without a Product Change. Afterwards every semantic evolution MUST go through a Product Change. The rationale is practical: a first Product Change against an empty model would be pure ceremony — an overlay over nothing, approving a delta whose "before" state does not exist. The exception is bounded (it applies exactly once, to the first accepted baseline) and auditable, because the bootstrap commit is plainly visible in Git history.

## Consequences

Positive:

- The baseline is always a trustworthy statement of current, accepted product semantics; readers and handoff generators never see half-adopted proposals.
- A Product Change is a reviewable, approvable, traceable unit with its own lifecycle, rationale and open questions.
- Overlay validation proves a proposal structurally sound before anyone implements against it.
- Explicit, dry-runnable promotion keeps humans in control of when the product definition moves.

Negative:

- Modified artifacts are duplicated while a change is active: the baseline file and the complete proposed future-state file both exist, and reviewers diff them rather than reading one edit.
- Concurrent changes need overlap checks, and an overlap blocks until one change is rebased or withdrawn — coordination cost that in-place editing would not surface (it would silently lose instead).
- The workflow has more steps than editing a document, which is a real adoption hurdle for teams used to wikis.
