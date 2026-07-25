# fix-v01-conformance

## Why

An external conformance audit of the v0.1 release candidate confirmed eight real defects, three of
them release-blocking: promotion never verifies coverage evidence (violating FR-PROMOTE-001 and
breaking the founding chain Implementation → Verification → Promotion), the published CLI omits
the `product-definition` alias that its own generated hooks and the public-brand spec require, and
the release pipeline's repository prerequisite is undocumented. The stable `@prodshape/cli@0.1.0`
must not ship until the implementation actually honors the product model it claims to enforce.

## What Changes

- `change promote` gains a coverage-evidence gate: every completed delivery slice must have
  verifiable coverage evidence discovered from the SDD workspace (OpenSpec adapter scans
  `openspec/changes/**` for `product-handoff.yaml` sidecars matching the change/slice), enforced
  through a provider port injected into `planPromotion` so core stays adapter-free. New
  diagnostic PRODUCT044; new `--accept-external-evidence` flag as the explicit, loud escape for
  repositories with no SDD adapter configured (no effect when an adapter is configured).
- `applyPromotion` becomes two-phase: a preflight that touches nothing (read write-sources,
  stat delete-targets, verify the archive target is absent) followed by execution ordered so the
  change-dir move — the "promoted" marker — happens last; failures give recovery guidance.
- `packages/cli` restores the `product-definition` bin alias (identical output to `prodshape`),
  guarded permanently by a packed-tarball test that installs the package clean and runs both
  binaries.
- Coverage evidence is hardened: `covered`/`partial` entries require non-empty
  `specification`/`verification` arrays; evidence paths are normalized and must resolve inside
  the repository; entries for requirements outside `handoff.implements` are rejected.
- `init` / `integration add` / `integration update` gain a collision preflight: targets not owned
  by the installation lock (or owned but drifted) block the operation with a full list unless
  `--force`.
- `validation.warnings-as-errors` is enforced uniformly: `change validate`, handoff generation,
  graph generation and promotion honor it, not only baseline `validate`.
- RELEASING.md documents the GitHub Actions "create and approve pull requests" permission
  prerequisite and its failure signature.
- Public docs are made truthful: artifact counts, npm publication state, adoption-guide
  milestone notes, archived-spec `Purpose: TBD` placeholders; the two live PRODUCT106
  unused-term warnings are resolved.

## Capabilities

### New Capabilities

(none — every change conforms the implementation to existing product requirements or tightens
existing capabilities)

### Modified Capabilities

- `promotion`: preconditions gain the coverage-evidence requirement (FR-PROMOTE-001 parity):
  evidence per completed slice, PRODUCT044 for missing/unverifiable evidence, the
  `--accept-external-evidence` escape without an SDD adapter; apply becomes preflight-then-execute
  with nothing mutated on preflight failure.
- `requirement-coverage`: covered/partial entries require non-empty evidence arrays; evidence
  paths must resolve inside the repository; entries unrelated to `handoff.implements` are
  rejected.
- `distribution`: provider installation and integration updates require a collision preflight —
  unowned or drifted targets block without `--force`; `init` forwards `--force` to provider
  installation.
- `structural-validation`: `validation.warnings-as-errors` applies to every validating command
  (baseline validate, change validate, handoff generation, graph generation, promotion), not
  only baseline validate.

## Impact

- Code: `packages/core/src/promote.ts`, `packages/adapter-openspec/src/index.ts`,
  `packages/cli/src/commands/change.ts`, `packages/cli/src/program.ts`,
  `packages/cli/package.json`, `packages/distribution/src/install.ts` + `init.ts`,
  `schemas/product-coverage.schema.json`.
- Tests: `tests/changes/lifecycle.test.ts` (the current promotion test passes without any
  evidence — it codifies the defect and must be corrected), `tests/openspec/coverage.test.ts`,
  `tests/distribution/`, new packed-tarball test.
- Docs: `docs/specification/validation.md` (PRODUCT044), `docs/specification/product-changes.md`,
  `RELEASING.md`, `OPEN-DECISIONS.md` (OD-003 interim position becomes real), README, CHANGELOG,
  `docs/limitations-v0.1.md`, four adoption guides, archived spec Purpose lines.
- Release: the pending `changeset-release/main` version PR must not merge until this change is
  implemented; changesets here regenerate it with the fixes included.
- Breaking: none for well-formed repositories. Repositories that promoted changes without
  evidence, or coverage files with empty/escaping evidence paths, will now fail loudly — that is
  the point of the change.
