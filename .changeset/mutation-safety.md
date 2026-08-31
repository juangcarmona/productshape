---
'@prodshape/core': minor
'@prodshape/cli': minor
'@prodshape/distribution': minor
'@prodshape/integration-openspec': patch
'@prodshape/integration-speckit': patch
---

Repository mutation is now contained, planned before it acts, drift-safe and fails closed (the safety phase of #208).

Six defects are fixed. A path recorded in `.product/installation.lock.json` could name a target outside the repository and have it deleted: the lock is now validated in full before any entry is used, every recorded path is held to the normalized repository-relative contract, and every read, write, rename and deletion resolves through one containment-checked resolver. `integration add --dry-run` wrote every managed file and then reported that nothing had been written: installation is planned first, a dry run is the plan without the apply, and a dry run predicts a refusal instead of reporting a success the real run would not deliver. `integration remove` deleted managed files a human had edited: removal now compares each file against the digest recorded for it, preserves and reports what has diverged, keeps that file's lock entry so it stays covered by drift detection, and deletes it only under the new `--force`. `extensions.prodshape.generated.root` could resolve outside the repository: it is now held to the same contract as `product-root` and an escaping value is rejected as `PRODUCT050` before command-specific work begins. A malformed, unreadable or off-contract lock was read as "nothing installed": only the not-found condition means absence now, `integration check` and `doctor` fail when a lock exists but cannot be trusted, and configuration that exists but cannot be read is reported instead of silently replaced with defaults. Integration operations are byte-idempotent: a no-op add or update rewrites no managed file, no template, no installation lock and no integration metadata, `installedAt` is preserved as the first-installation moment, and a new optional `updatedAt` records when managed content last actually changed.

`CHG-MUTATION-SAFETY-001` adds `BR-MUTATION-001` and amends `FR-DISTRIBUTION-001`, `FR-OPENSPEC-001` and `FR-SPECKIT-001` with the report, preservation, fail-closed and idempotence obligations. `@prodshape/core` gains the repository-relative path contract and its resolver; `@prodshape/distribution` gains `src/mutation.ts`, the one module that owns managed-file mutation, and depends on `@prodshape/core` for the resolver so there is exactly one.

Consumer document roots are deliberately unaffected: they are read-only scan targets, may point outside the repository, and are now documented and tested as such.

Normative diagnostics, deterministic ordering and the documented exit codes are unchanged.
