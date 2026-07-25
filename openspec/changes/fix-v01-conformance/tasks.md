## 1. Promotion coverage gate (P0)

- [x] 1.1 Add `findChangeHandoffDirs(root, changeId)` and `checkSliceEvidence(root, changeId, sliceId, registry)` to `packages/adapter-openspec/src/index.ts` (sorted scan of `openspec/changes/*` and `openspec/changes/archive/*`, match `source.product-change`/`source.delivery-slice`, evidenced when ≥1 dir passes `checkCoverage` with zero errors)
- [x] 1.2 Extend `planPromotion` in `packages/core/src/promote.ts`: `SliceEvidence` type, `coverageProvider` port, `acceptExternalEvidence` option; PRODUCT044 for missing/unverifiable evidence per completed slice (cancelled exempt); forward provider diagnostics; covered-requirements ⊇ completed slices' implements drift guard; no-provider refusal/downgrade policy; export new types from `packages/core/src/index.ts`
- [x] 1.3 Wire the CLI: `runChangePromote` builds the provider when `integrations.sdd.provider === 'openspec'`; add `--accept-external-evidence` to `packages/cli/src/program.ts`; promote output prints warnings as well as errors
- [x] 1.4 Unit tests for `findChangeHandoffDirs`/`checkSliceEvidence`: no match, match under archive/, multiple dirs with one passing
- [x] 1.5 Rework `tests/changes/lifecycle.test.ts` promotion block: fixture helpers (`configDoc`, `coverageDoc`, real `handoff create` into `openspec/changes/impl-annotate/`); new tests — no-adapter refusal (PRODUCT044), `--accept-external-evidence` succeeds loudly, provider-configured-no-evidence refused, uncovered requirement refused and flag does not bypass, cancelled-slice exemption; existing dry-run/promote tests pass with legitimate evidence
- [x] 1.6 Docs: PRODUCT044 row in `docs/specification/validation.md`; coverage precondition + escape semantics in `docs/specification/product-changes.md`; update OD-003 interim position in `OPEN-DECISIONS.md`

## 2. Atomic promotion apply (P1)

- [x] 2.1 Rewrite `applyPromotion` two-phase: preflight (read write-sources into memory, stat delete-targets, verify move source exists and target absent) that mutates nothing on failure; execution ordered writes → deletes → change-dir move last; execution failure throws with git-based recovery guidance
- [x] 2.2 Atomicity test: pre-created `changes/completed/<change>` dir blocks promote before any mutation (assert no writes, baseline byte-identical)

## 3. Published binary alias (P0)

- [x] 3.1 Add `"product-definition": "dist/bin.js"` to `packages/cli/package.json` bin
- [x] 3.2 Packed-tarball integration test: `pnpm pack` the CLI, install into a scratch dir, run `prodshape` and `product-definition` (`--version` + a validate run), assert identical output

## 4. Coverage evidence hardening (P1)

- [x] 4.1 `schemas/product-coverage.schema.json`: `minItems: 1` on `specification` and `verification` under the covered/partial conditional
- [x] 4.2 `checkCoverage`: reject absolute paths, `..` segments, and resolved paths escaping the repository root (or SDD change dir for dir-relative evidence); reject coverage entries for requirements outside `handoff.implements` (PRODUCT043)
- [x] 4.3 Tests in `tests/openspec/coverage.test.ts`: empty arrays fail schema, traversal rejected, unrelated entry rejected

## 5. Collision-safe distribution (P1)

- [x] 5.1 `installProvider` preflight in `packages/distribution/src/install.ts`: classify every rendered target (absent / owned-clean / conflict); any conflict blocks the whole install listing all conflicting paths unless `force`; lock written only on success
- [x] 5.2 `initRepository` forwards `--force` to provider installation; CLI `integration add`/`update` gain `--force` and refuse over PRODUCT051 drift without it
- [x] 5.3 Tests in `tests/distribution/`: unmanaged file blocks add; drifted managed file blocks update; `--force` overrides; lock untouched on refusal

## 6. Uniform warnings-as-errors (P2)

- [x] 6.1 Core helper (`escalateWarnings(diagnostics, config)`); apply in baseline validate, `change validate`, handoff generation, graph generation and the promotion gate
- [x] 6.2 Conformance test: warnings-as-errors repo fails `change validate` and refuses promotion of a warning-carrying change

## 7. Release pipeline documentation (P0-ops)

- [x] 7.1 RELEASING.md: document the required GitHub setting (Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"), the failure signature (`GitHub Actions is not permitted to create or approve pull requests`), and the rule that the version PR merges only after this change is complete

## 8. Truthful docs (P2)

- [x] 8.1 README: artifact count from live diagnostics, npm/alias status, drop stale "unpublished" phrasing; CHANGELOG counts
- [x] 8.2 `docs/limitations-v0.1.md` + four adoption guides: remove obsolete milestone/unpublished notes
- [x] 8.3 Fill `Purpose` in archived specs currently reading `Purpose: TBD` (promotion, requirement-coverage, structural-validation, distribution, public-brand, and any others found by sweep)
- [x] 8.4 Resolve the two live PRODUCT106 warnings (TERM-METHODOLOGY, TERM-REFERENCE-IMPLEMENTATION): link them from artifacts or retire them; self-model validates with zero diagnostics

## 9. Changesets and verification

- [x] 9.1 Changesets for every published package touched (cli, core, adapter-openspec, distribution)
- [x] 9.2 Full `pnpm build && pnpm test` green; self-model `validate` clean; `doctor` passes
