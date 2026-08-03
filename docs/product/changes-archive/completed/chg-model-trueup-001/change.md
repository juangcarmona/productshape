---
id: CHG-MODEL-TRUEUP-001
type: product-change
title: Make the model describe what initialization and distribution actually do
status: implemented
base-revision: b4dbba1bf92d234fe83f8a3c3cc46cef2d74dfce
operations:
  add:
    - FR-DOCTOR-001
  modify:
    - UC-INIT-001
    - FR-INIT-001
    - FR-DISTRIBUTION-001
  remove: []
---

## Problem

An audit of the v0.2.0 release compared the baseline against the shipped toolkit and found the model describing a product that no longer exists in three places. One of them is not a documentation gap but a governance failure.

**The product deletes files, and the model does not say so.** `integration update` now removes managed files a provider no longer generates. It is the only place in the toolkit that deletes user-visible files. `FR-DISTRIBUTION-001` obliges the product to generate, to be reproducible, to update and to detect hand edits — it authorises nothing about removal. A destructive capability that no requirement carries is exactly what `BR-CANONICAL-001` exists to prevent, and it sits one file away from a requirement titled "Initialize a repository without destroying user content".

**A requirement clause is now literally false.** `FR-DISTRIBUTION-001` states that "the same canonical assets and the same target produce identical files". Since `integrations.shorthand-commands` became a setting, the same assets and the same target produce _different_ file sets depending on configuration. Read strictly, the product fails its own requirement.

**`UC-INIT-001` describes a directory layout that was never created.** Main Flow step 2 says the product tree is created "with places for the current model, changes, slices and handoffs". No `slices/` directory is scaffolded — slices live inside a change directory, created on demand — and handoffs are never written under `docs/product` at all; they go to the SDD change directory or an explicit output path. This predates v0.2.0, but `--flat` made the scaffolded set explicit product surface for the first time, which is when it should have been caught.

**`doctor` is a command with eight health checks and no requirement.** It appears in the model three times, always incidentally, and its only obligation is one clause of `FR-DISTRIBUTION-001` — a requirement about generating assets. Two of the eight checks were added in v0.2.0 and are unmodelled.

**A related asymmetry.** `CHG-CLI-POLISH-001` argued that `init --dry-run` was "a new way of satisfying an existing obligation" and needed no model change. But that same change authored `FR-FIX-001`, which treats the identical capability — report what would happen, change nothing — as a `MUST` with its own verification scenario. The model now describes `fix --dry-run` and not `init --dry-run`, for no principled reason.

## Intended Product Outcome

The baseline describes the product that ships.

Every destructive capability is authorised by a requirement that also states its safety rule, so a reader can find out from the model — not from the source — that the tool removes files and under what conditions it refuses to. Reproducibility is stated in terms that are true when rendering depends on configuration. Repository health has its own requirement, so the checks the product performs are discoverable and can be extended without amending an unrelated one. And the same obligation is modelled the same way wherever it appears: reporting without acting is a distinct interaction with a distinct postcondition, for initialization as much as for repair.

## Rationale

The repository's whole claim is that the model is canonical and the code follows it. That claim survives a model that is incomplete; it does not survive a model that is wrong about what the product does to a user's files. Of the four items here, orphan deletion is the one that would matter if nothing else were fixed: a maintainer auditing what the toolkit is permitted to do would read `FR-DISTRIBUTION-001` and conclude it never deletes.

The reproducibility clause is worth correcting rather than deleting. Reproducibility is a real and valuable obligation — it is what makes drift detection meaningful — and the fix is to name the third input the render actually depends on, not to weaken the guarantee.

`FR-DOCTOR-001` is a new requirement rather than an extension because the alternative is a requirement about asset generation that also happens to specify repository diagnosis. The two answer different questions, are exercised by different commands and will evolve independently; `doctor` already outgrew the clause before anyone noticed it was carrying it.

The `UC-INIT-001` correction is small but it is the kind that erodes trust fastest: a reader who follows the model to look for `docs/product/slices/` finds nothing there, and learns that the model is approximate.

This change is delivered as a single slice. It was first decomposed into two — health reporting, and the corrections — but they land in one work item, and `OD-009` records that a handoff ID is derived from the work item alone, so two slices under one work item produce two handoffs with the same ID. Having just documented that collision, recreating it here to satisfy a decomposition nothing else needed would be the wrong trade. The corrections are not independently deliverable in any case: they are one editorial pass over the baseline.

## Affected Product Areas

**This change's overlay:**

- Add `FR-DOCTOR-001` — repository health reporting as a first-class obligation, derived from `UC-INIT-001` and `BR-CANONICAL-001`.
- Modify `FR-DISTRIBUTION-001` — authorise removal of managed files the product no longer generates, with the digest-verified safety rule; restate reproducibility in terms of assets, target _and_ configuration; add the obligation that shorthand rendering is a persisted choice.
- Modify `UC-INIT-001` — correct Main Flow step 2, and add the report-without-writing alternative flow.
- Modify `FR-INIT-001` — add the obligation to report what initialization would do without doing it.

**Out of this overlay:** no implementation work. Every behaviour described here already ships; this change makes the model catch up with it. That is the reverse of the usual direction and is worth stating plainly rather than dressing up as new capability.

## Open Questions

None. One judgement was made rather than deferred: whether orphan deletion should be modelled at all, or treated as an implementation detail of regeneration. It is modelled, because the test is not "is this interesting" but "can a reader of the model discover everything the product does to their files", and deletion fails that test.

## Product Acceptance

- The model states that the product removes managed files it no longer generates, and states the condition under which it refuses to.
- No requirement clause is falsified by the shipped configuration surface.
- Repository health is a named obligation, not a sub-clause of asset generation.
- A reader can find every directory initialization creates, and no directory it does not.
- Reporting an action without performing it is modelled consistently across initialization and repair.

## Out of Scope

- Changing any of the behaviours described. This change is corrective; the code is already right.
- `FR-DOCTOR-001` enumerating individual health checks. The requirement fixes the obligation and the read-only guarantee; which checks exist is implementation detail that will keep changing.
- The handoff identity collision recorded as OD-009, which needs a decision before it can be modelled.
