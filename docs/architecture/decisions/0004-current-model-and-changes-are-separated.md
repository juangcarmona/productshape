# 0004 — The Product Definition and its changes are separated

Status: Accepted Date: 2026-07-25

## Context

A product model that is edited in place whenever someone wants something new stops being a statement of what the product currently is. Reviewers cannot tell accepted behaviour from aspiration, and there is no unit that can be validated, approved and traced as one evolution. The methodology needs a hard line between "the product as defined today" and "a proposed evolution of it".

Git is not that line. It records that files changed; it does not record that the product changed, or what that meant, and it offers nothing for a product diff and its impact analysis to attach to.

## Decision

The baseline, the accepted Product Definition under `docs/product/model`, is unchanged while changes are live. Every semantic evolution is represented as a **Product Change** under `docs/product/changes/active/<chg-id>/`: a canonical `change.md` naming `add`, `modify` and `remove` operations, plus complete proposed future-state artifacts under `proposed/`.

Validation never mutates the baseline. It compiles an **overlay**, the baseline with the change's operations applied virtually, and runs full structural validation against that overlay. Concurrent live changes are checked for overlapping `modify` and `remove` sets (`PRODUCT025`).

Materializing a change happens only through explicit **apply**, which requires `approved` status, revalidates the overlay, checks baseline-revision compatibility, supports `--dry-run`, and is never triggered implicitly by hooks, SDD archival or any automation. Apply gates on the change's own validity and nothing else. It carries no evidence contract: whether accepted intent has been built is a fact about delivery, not about the product.

Apply is not acceptance. The model files on a working branch are a proposal; the same files on the canonical branch are the accepted Product Definition. Apply changes the first. Only a human merging the pull request changes the second.

The first Product Definition enters through `CHG-INITIAL`, a reserved identifier for the single initialisation change. Greenfield authoring and brownfield recovery both produce it: discovery is an input activity to `CHG-INITIAL`, not a separate lifecycle. There is no bootstrap exception, because a product with two ways to evolve has two things to explain, and the second one is always the one someone forgets.

## Consequences

Positive:

- The baseline is always a trustworthy statement of current, accepted product semantics; readers and consumers never see half-adopted proposals.
- A Product Change is a reviewable, approvable, traceable unit with its own lifecycle, rationale and open questions, and it is what the product diff and impact analysis attach to.
- Overlay validation proves a proposal structurally sound before anyone implements against it.
- Explicit, dry-runnable apply keeps humans in control of when the definition moves, and separating it from acceptance keeps a tool from ever deciding product intent.

Negative:

- Modified artifacts are duplicated while a change is live: the baseline file and the complete proposed future-state file both exist, and reviewers diff them rather than reading one edit.
- Concurrent changes need overlap checks, and an overlap blocks until one change is rebased or withdrawn. That is coordination cost in-place editing would not surface, though in-place editing would silently lose instead.
- The workflow has more steps than editing a document, which is a real adoption hurdle for teams used to wikis.
