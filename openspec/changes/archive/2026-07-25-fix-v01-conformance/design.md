# Design — fix-v01-conformance

## Context

The v0.1 release candidate passed CI on three platforms with 134 tests while violating its own
central requirement: `change promote` never verifies coverage evidence, although FR-PROMOTE-001's
first acceptance scenario demands refusal without it. The gap has a structural root: delivery
slices (canonical product artifacts) carry no pointer to the SDD workspace where evidence lives,
so promotion had no deterministic discovery path. Secondary defects cluster around the same
theme — the implementation is more permissive than its contracts (empty evidence accepted, user
files overwritten, warnings escalation applied only to one command, published binary set smaller
than the public-brand spec requires).

Constraints: `@prodshape/core` must not depend on `@prodshape/adapter-openspec` (layering is a
documented architecture decision); the delivery-slice schema is v1alpha1 and the repository's own
completed changes must remain valid; promotion must stay deterministic and reproducible.

## Goals / Non-Goals

**Goals:**

- Promotion refuses without verifiable coverage evidence, deterministically discovered.
- The published package installs every binary its generated integrations invoke.
- Evidence cannot be empty, escape the repository, or reference unrelated requirements.
- Managed-file installation never destroys user content without explicit `--force`.
- One consistent `warnings-as-errors` semantic across all validating commands.
- Public docs state only what is true.

**Non-Goals:**

- No coverage-evidence format for SDD frameworks other than OpenSpec (OD-003 stays open; the
  escape hatch documents the gap explicitly rather than closing it).
- No transactional/journaled filesystem machinery for promotion — preflight plus ordered
  execution with git as the recovery net is proportional to v0.1.
- No schema version bump; all schema changes are backward-compatible tightenings within
  v1alpha1 (empty evidence arrays were never meaningful).

## Decisions

### D1 — Evidence discovery scans handoffs; slices stay pointer-free

Promotion discovers evidence by scanning `openspec/changes/<name>/` and
`openspec/changes/archive/<name>/` (lexicographically sorted) for `product-handoff.yaml`
documents whose `source.product-change` / `source.delivery-slice` match. A slice is evidenced
when at least one matching directory passes the existing `checkCoverage` with zero errors; the
first passing directory in sort order supplies the covered-requirement list.

_Alternatives:_ (a) adding a work-item field to the delivery-slice schema — rejected: slices are
canonical product artifacts and should not reference SDD workspace internals, and the repo's own
completed changes lack the field, so a fallback scan would be needed anyway; (b) explicit CLI
input — rejected: not deterministic or auditable across runs.

### D2 — Core defines a port; the CLI composes adapter into core

`planPromotion` accepts `coverageProvider?: (change, slice) => Promise<SliceEvidence>` and
`acceptExternalEvidence?: boolean`. Core owns the policy: completed slices need evidence
(cancelled slices are exempt), missing discovery is PRODUCT044, provider diagnostics are
forwarded into the plan, and the union of covered requirements must contain the union of
completed slices' implemented requirements (drift guard against slices edited after handoff
generation). The CLI builds the provider from `@prodshape/adapter-openspec` when
`integrations.sdd.provider === 'openspec'` — the same composition pattern `coverage check`
already uses. Core never imports the adapter.

### D3 — OD-003 interim: explicit, loud, human-owned escape

With no SDD provider configured and at least one completed slice, promotion refuses with
PRODUCT044 naming both remedies. `--accept-external-evidence` downgrades that refusal to a
warning printed in the plan output — the human asserts evidence exists outside any adapter. The
flag is inert when a provider _is_ configured: real evidence always wins, and failing evidence
can never be flag-bypassed. OD-003's interim position is updated to describe this actual
behavior instead of the current aspirational text.

### D4 — PRODUCT044

`PRODUCT043` stays "coverage content is wrong" (adapter-owned). `PRODUCT044` is new:
"coverage evidence for a completed delivery slice is missing or unverifiable at promotion"
(core-owned, emitted by the promotion policy). Codes 044–049 are unused today.

### D5 — Two-phase applyPromotion

Phase A (preflight, mutates nothing): read every write-source into memory, stat every
delete-target, verify the move-change source exists and its target does not. Any failure aborts
with the tree untouched. Phase B (execute): writes, then deletes, then the change-directory move
last — the move is the observable "promoted" marker, so it flips only when everything else
succeeded. A Phase B failure throws with recovery guidance: promotion never commits, so
`git status` shows exactly what was applied and `git checkout -- <paths>` restores.

### D6 — Collision preflight in installProvider

Before writing anything, classify every rendered target: absent → writable; present and owned by
the lock with matching digest → writable; present and unowned, or owned but drifted → conflict.
Any conflict blocks the entire install (all conflicts listed) unless `--force`. `initRepository`
forwards its existing `--force`; `integration update` refuses over PRODUCT051 drift without
`--force`. The lock is written only after a successful install, so a refused operation leaves it
untouched.

### D7 — Warnings escalation as a single core helper

One helper (`escalateWarnings(diagnostics, config)`) applied at every gate that currently
filters `severity === 'error'`: change validate, handoff generation, graph generation, promotion.
Baseline `validate` switches to the same helper so there is exactly one semantic.

### D8 — Evidence hardening lives in schema + adapter

Schema: `minItems: 1` on `specification` and `verification` under the existing covered/partial
conditional. Adapter: evidence paths are rejected if absolute, if they contain `..` segments, or
if their resolved form escapes the repository root (or the SDD change directory for
dir-relative paths); coverage entries whose requirement is not in `handoff.implements` fail with
PRODUCT043. This is validation-tightening only — no format change.

### D9 — Alias restored as a second bin entry, guarded by a tarball test

`"product-definition": "dist/bin.js"` — same entry point, hence identical output by
construction, satisfying the public-brand scenario. A new integration test packs the CLI
(`pnpm pack`), installs the tarball into a scratch directory, and runs both binaries, asserting
identical stdout. This is the only test in the suite that exercises the published artifact
rather than the repo tree, and it would have caught the defect.

## Risks / Trade-offs

- [Scan-based discovery reads every SDD change dir] → trivial at v0.1 scale; directories are
  enumerated once per promotion and sorted for determinism.
- [`--accept-external-evidence` can be abused as a routine bypass] → it only exists when no SDD
  provider is configured, prints a warning into the recorded plan output, and OD-003 documents
  it as an interim; a future second adapter removes the need.
- [Stricter coverage validation breaks existing consumer coverage files with empty arrays] →
  intended; empty evidence was never meaningful evidence. Called out as behavior change in the
  changeset.
- [Preflight-then-execute is not truly atomic under concurrent modification] → accepted; the
  CLI is single-user and promotion never commits, so git recovery instructions cover the
  residual window.
- [Existing lifecycle tests promote without evidence] → they are corrected, not deleted: the
  fixture gains real handoff + coverage sidecars, and a new refusal test pins FR-PROMOTE-001
  scenario 1.

## Migration Plan

1. Land adapter discovery + core port + CLI wiring + atomicity together (one slice — they share
   the lifecycle test rewrite).
2. Alias + tarball test, distribution preflight, warnings helper, schema hardening are
   independent and can land in any order after (or alongside) 1.
3. Changesets: patch for every published package touched; the pending `changeset-release/main`
   PR regenerates to include them and is merged only after this change is complete.
4. Rollback: every piece is additive validation or packaging metadata; reverting the change
   restores prior behavior without data migration.

## Open Questions

- None blocking. OD-003 (evidence policy without an SDD adapter) deliberately stays open with a
  better interim; OD-002 (Copilot hook enforcement) is untouched by this change.
