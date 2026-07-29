# @prodshape/adapter-openspec

## 0.2.3

### Patch Changes

- Updated dependencies [100b7bc]
  - @prodshape/core@0.5.0

## 0.2.2

### Patch Changes

- Updated dependencies [e58311c]
  - @prodshape/core@0.4.0

## 0.2.1

### Patch Changes

- Updated dependencies [c48d95f]
- Updated dependencies [d8841a0]
  - @prodshape/core@0.3.0

## 0.2.0

### Minor Changes

- 84f6dbf: Conformance fixes for the v0.1 release candidate (fix-v01-conformance):

  - Promotion now requires coverage evidence per completed delivery slice (FR-PROMOTE-001).
    `planPromotion` accepts a `coverageProvider` port; the OpenSpec adapter discovers handoff
    sidecars deterministically (`findChangeHandoffDirs`, `checkSliceEvidence`); missing or
    unverifiable evidence is the new `PRODUCT044`; repositories without an SDD adapter must pass
    the new `--accept-external-evidence` flag explicitly.
  - `applyPromotion` is two-phase: a preflight that touches nothing on failure, then execution
    with the change-directory move last, so a failed promotion cannot leave a partially promoted
    baseline.
  - The CLI package installs the `product-definition` binary alias again (identical to
    `prodshape`), which generated skills and hooks invoke.
  - Coverage evidence is hardened: covered/partial entries need non-empty `specification` and
    `verification` arrays, evidence paths cannot be absolute or escape the repository, and entries
    for requirements outside `handoff.implements` are rejected.
  - `installProvider` preflights every target: files not owned by the installation lock, or owned
    but hand-edited, block `init --ai`, `integration add` and `integration update` (with the full
    conflict list) unless `--force`; refusals leave files and lock untouched.
  - `validation.warnings-as-errors` is enforced uniformly via `escalateWarnings` across baseline
    validate, change validate, handoff generation, graph generation and promotion.

### Patch Changes

- Updated dependencies [84f6dbf]
  - @prodshape/core@0.2.0
