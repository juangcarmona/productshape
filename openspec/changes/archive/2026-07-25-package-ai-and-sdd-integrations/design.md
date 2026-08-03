# Design — package-ai-and-sdd-integrations

## Context

ADRs 0005 (SDD-agnostic), 0006 (handoff contract), 0007 (deterministic/AI separation) and 0008 (vendor assets generated) fix the behaviour. This note records implementation shape.

## Key decisions

1. **Acyclic renderer contract.** `integration-claude` and `integration-copilot` export a plain structurally-typed `ProviderRenderer` object (name + render(assets, meta) → files). The distribution package declares the same structural type locally and consumes the renderers via TypeScript structural typing; the integration packages import nothing from distribution and have no internal dependencies (Gate 0 correction 1).
2. **Assets bundled like schemas.** The canonical `skills/`, `commands/`, `hooks/` and `templates/` are copied into `packages/distribution/assets/` and pinned byte-identical to the repository root by a conformance test — the same pattern core uses for schemas.
3. **Managed-file lifecycle.** Every generated file carries a header comment (marker, framework version, source asset); `.product/installation.lock.json` records path → sha256 (LF-normalized) per provider. `integration update` rewrites files and lock; `--check` and `doctor` compare hashes only (PRODUCT051 modified, PRODUCT052 missing). JSON outputs carry the marker in a `managed` field since JSON has no comments.
4. **Claude hook rendering is a fragment.** Claude Code hooks live in user settings; writing user settings directly is invasive. v0.1 renders `.claude/hooks/product-definition.json` — a ready-to-merge hooks fragment plus instructions — and Copilot hook rendering is documentation (`.github/hooks/*.md`, OD-002). Both are managed files.
5. **Adapter stays thin.** `adapter-openspec` only locates `openspec/changes/<name>/`, reads the sidecar handoff, validates `product-coverage.yaml` (schema, handoff linkage, PRODUCT043 for uncovered implemented requirements, existence of evidence paths). Handoff generation itself stays in core; the CLI passes the adapter-resolved target directory.
6. **Closure warnings reuse computeClosure.** PRODUCT109 compares a slice's `affects` against the closure of its `implements`; PRODUCT110 recomputes the closure at status time when the change and slice are still active. Both are warnings: closure quality is advisory, never blocking.
7. **Dogfooding sequence is commit-aware.** The Product Change and slice are committed before handoff generation so the recorded source revision contains them; promotion happens only after coverage passes, and the traceability chain is pinned by a conformance test that walks it.

## Alternatives considered

- A shared `integration-types` package — rejected at Gate 0 (correction 1): structural typing needs no package.
- Writing Claude hooks into `.claude/settings.json` — rejected for v0.1: merging user-owned settings is riskier than shipping a reviewable fragment.
