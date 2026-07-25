---
id: FR-COVERAGE-001
type: functional-requirement
title: Validate requirement coverage before SDD closure
status: active
derived-from:
  - UC-COVERAGE-001
  - UC-HANDOFF-001
  - BR-SDD-001
verification:
  - scenario: An implemented requirement without a coverage mapping is reported before closure
  - scenario: Coverage is validated deterministically from mappings, never inferred from file names
  - scenario: Full coverage of every implemented requirement allows closure to proceed
  - scenario: A declared evidence path that does not exist fails the check naming the path
---

## Requirement

The product MUST verify, before an SDD change implementing a handoff is closed or archived, that
every requirement the handoff implements has a coverage mapping linking it to specification and
verification evidence. A requirement without such a mapping MUST be reported with the documented
error code, and the report MUST arrive before closure so the gap can be fixed while the work is
still open. Coverage MUST be established deterministically from the declared mappings; the product
MUST NOT infer coverage from file names, folder placement or any other resemblance heuristic, and
MUST verify that every declared evidence path exists.

## Rationale

A handoff makes a promise: these requirements will be implemented. Coverage validation is where
the promise is checked before the delivery work disappears into an archive. Without it, "the slice
is done" is an assertion nobody can audit, and promotion — which relies on coverage evidence —
would rest on trust rather than record. Determinism is essential to the value of the check: a
mapping is a claim someone wrote down and can be held to, whereas a file that merely happens to be
named like a requirement proves nothing. Guessing coverage would convert the strongest gate in the
flow into a false sense of safety.

## Acceptance Scenarios

- An SDD change implements a handoff covering three requirements, but the coverage mapping links
  only two to specification and verification evidence. Coverage validation reports the third with
  the documented error code, and closure is flagged as blocked until the mapping is completed.
- A file whose name matches a requirement ID exists in the SDD change, but no mapping declares it
  as evidence. The requirement is still reported as uncovered: resemblance is not coverage.
- A mapping declares evidence at a path that does not exist. The check fails naming the dangling
  path, because a claim that cannot be resolved is not evidence.
- Every implemented requirement has a declared mapping to its specification and verification
  evidence, and each mapping resolves. Coverage validation passes deterministically, and repeated
  runs over the same content produce the identical report.
