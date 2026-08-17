---
id: FR-FIX-001
type: functional-requirement
title: Repair filename misalignment mechanically and without partial results
status: active
derived-from:
  - UC-FIX-001
  - BR-IDENTITY-001
verification:
  - scenario: A file differing from its required name only in letter case is renamed on a case-insensitive filesystem
  - scenario: Repeating the repair on an aligned model changes nothing
  - scenario: An ambiguous rename refuses the whole repair and reports each reason
  - scenario: An interrupted repair is completed by the next run, leaving no intermediate file
  - scenario: Reporting the plan without applying it is distinguishable from having nothing to repair
---

## Requirement

The product MUST repair every reported filename misalignment by renaming each artifact file to the name its identifier requires. The repair MUST succeed where the required name differs from the current name only in letter case, including on filesystems that treat the two names as the same file.

The repair MUST be idempotent: applying it to an already-aligned model MUST change nothing.

The repair MUST NOT produce partial results. Where any rename cannot be performed unambiguously — because the required name is held by a different artifact, because two artifacts require the same name, or because an earlier attempt left an unresolvable intermediate file — the product MUST rename nothing and MUST report each such case with its reason. An interrupted repair MUST be completable by a subsequent run, and MUST NOT leave an artifact permanently under an intermediate name.

The product MUST offer to report the planned renames without performing them, and that report MUST be distinguishable from a model that needs no repair, so that misalignment can be gated automatically rather than only observed.

Repair MUST be requested explicitly and MUST NOT be applied as a side effect of any other operation.

## Rationale

Identifiers are the artifact's identity and file names are expected to follow them, so a mismatch is mechanical to detect and mechanical to correct — the correct name is derivable, requiring no judgement about the model's meaning. That is what makes this repairable at all, and why it is the only repair the product offers.

It must be a product capability rather than advice because on the most common developer platforms the manual fix does not work. A case-only rename on a case-insensitive filesystem is a silent no-op, so an engineer following the diagnostic's instruction observes nothing happening and no error. A product that reports a defect it prevents the user from fixing trains users to disregard its reports.

Refusing rather than partially applying follows from what is being modified. These are canonical files, and their identifiers are referenced from other artifacts, Product Changes and citations; a half-completed rename leaves the model referencing artifacts that are no longer where anything expects them. Refusing the whole repair keeps a recoverable state recoverable.

The gate requirement exists because misalignment is reported as a warning. Warnings do not fail a run by default, so without a distinguishable report the condition accumulates silently until someone notices — which is what happened before this requirement existed.

## Acceptance Scenarios

- An artifact file is named in upper case while its identifier requires lower case, on Windows. The repair renames it, and validation subsequently reports no misalignment.
- The repair is run twice. The second run renames nothing and reports that the model is aligned.
- Two artifacts carry identifiers that resolve to the same file name. Nothing is renamed, and both are reported as unresolvable with the reason.
- A repair is interrupted after a file has been moved but before it reaches its final name. The next run completes it and reports having done so; no file remains under an intermediate name.
- The plan is reported without being applied on a model that needs repair. Nothing is written, and the outcome differs from that of an already-aligned model.
