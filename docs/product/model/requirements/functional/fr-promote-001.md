---
id: FR-PROMOTE-001
type: functional-requirement
title: Promote Product Changes explicitly and safely
status: active
derived-from:
  - UC-PROMOTE-001
  - BR-CHANGE-001
verification:
  - scenario: Promotion is refused without implemented status, resolved slices and coverage evidence
  - scenario: A dry run reports exactly what promotion would do without modifying any file
  - scenario: Promotion applies the operations, preserves the change history and commits nothing
---

## Requirement

The product MUST promote a Product Change into the baseline only through an explicit promotion
command. Before applying anything, promotion MUST verify that the change has reached implemented
status, that every delivery slice of the change is resolved, that coverage evidence exists for the
implemented requirements, that the overlay still validates against the current baseline, and that
the baseline revision the change was validated against is compatible — an incompatible revision
without explicit resolution MUST be an error. The product MUST offer a dry run that reports what
promotion would do without modifying any file. Successful promotion applies the change's add,
modify and remove operations to the baseline and preserves the change's history; promotion MUST
never run implicitly and MUST never create a version-control commit.

## Rationale

Promotion is the moment a proposal becomes product truth, and it is the only moment the baseline
may change on a change's behalf. Every precondition guards a distinct failure: promoting an
unimplemented change would make the model describe a product that does not exist; unresolved
slices mean delivery is still in flight; missing coverage evidence means nobody can show the
requirements were actually verified; a stale baseline means the change was judged against a world
that has moved. The dry run lets a maintainer see the exact consequence before accepting it, and
leaving the commit to the human keeps version control — the audit trail of the product — under
human control, exactly where the methodology places final authority.

## Acceptance Scenarios

- Promotion is requested for a change that is not yet implemented, then for one with an unresolved
  slice, then for one lacking coverage evidence. Each attempt is refused with a diagnostic naming
  the unmet precondition, and the baseline is untouched.
- A dry run over a promotable change lists every file that would be added, modified or removed.
  Afterwards the working tree is byte-identical to before the dry run.
- A promotable change is promoted. The baseline reflects the applied operations, the change's
  record and history remain available for traceability, no commit was created, and a change
  validated against an older, incompatible baseline revision is refused until explicitly resolved.
