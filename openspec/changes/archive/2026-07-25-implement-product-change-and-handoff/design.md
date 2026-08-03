# Design — implement-product-change-and-handoff

## Context

ADRs 0004 (separated model and changes) and 0006 (handoff contract) fix the behaviour; the normative details live in the specification. This note records implementation shape.

## Key decisions

1. **Change loading mirrors model loading**: `loadChange(dir)` parses `change.md` (product-change schema + body sections), every artifact under `proposed/` (same per-document pipeline as the baseline) and every slice under `slices/` (delivery-slice schema). All diagnostics flow through the same Diagnostic type.
2. **Overlay is a pure function**: `applyOverlay(baselineArtifacts, change)` returns a new artifact list (add appended, modify replaced, remove filtered) that feeds the existing `compileGraph` + `validateModel` unchanged. Overlay-specific errors (PRODUCT020-026) are computed against the baseline before application; PRODUCT024 falls out of running the standard reference validation on the overlay and attributing dangling references caused by removals.
3. **Git access is a thin helper**: `git.ts` shells out to `git` (`rev-parse HEAD`, `show <rev>:<path>`, `diff --name-only`) via execFile with the repository root as cwd. Core stays SDD-agnostic; Git is part of the methodology's substrate (ADR 0001: Git is the history).
4. **Handoff closure reuses the relationship table**: the closure rule is implemented once over the overlay graph; handoff YAML is emitted with the `yaml` package in a fixed key order; context markdown is assembled from canonical artifact content only.
5. **Staleness never guesses**: recompute digests overlay-first from the working tree; if the file is gone, try `git show source.revision:path`; if that fails, report source-revision-unavailable. Any digest mismatch lists the artifact; unrelated files are never consulted.
6. **Promotion = plan then apply**: `planPromotion` computes {writes, deletes, moves} plus precondition diagnostics (including PRODUCT027 via digest comparison between base-revision and HEAD for touched artifacts); `applyPromotion` executes the plan with node:fs only. `--dry-run` prints the plan. No Git commands mutate anything.

## Alternatives considered

- A Git library dependency (isomorphic-git, simple-git) — rejected: outside the approved set; `git` subprocess is sufficient and matches the environment (a Git repository is a stated precondition of the methodology).
- Storing overlay state in `.product/cache` — rejected: overlays are cheap to recompute and a cache would create a second source of truth.
