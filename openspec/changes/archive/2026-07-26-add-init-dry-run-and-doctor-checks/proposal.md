# Add init --dry-run and Two Doctor Checks

## Why

Phase 0 of the first adoption outside this repository was blocked on a question the tool could not
answer: does `prodshape init` refuse outright, or overwrite something, when `docs/product/` already
exists? The docs said `init` "preserves existing files (use --force to overwrite)" and also that it
"fails rather than overwriting" — the second claim was wrong, and neither statement covered the
generated integration files, which behave differently.

Answering it required creating a throwaway `git worktree`, running `init` against it, inspecting the
result, and discarding the worktree. A `--dry-run` flag would have answered it in a second.

`prodshape doctor` already existed and was more complete than the retro assumed, but it was missing
the two checks an adopter most wants: does validation actually pass, and are the authoring templates
intact.

## What Changes

- Split `initRepository` into `planInit` and `applyInitPlan`. The plan carries the content it would
  write, so applying it is a straight write of what was reported and the two cannot diverge. This
  mirrors the existing `planPromotion`/`applyPromotion` pair.
- Reuse the provider preflight rather than duplicating it: `installProvider` becomes
  `planProvider` + `applyProviderPlan`, and the init plan absorbs the provider classification.
- Add `init --dry-run`, reporting every path grouped by what would happen to it, exiting non-zero on
  conflicts so it works as a CI precheck. Real-run output is unchanged.
- Add a `regenerate` action kind alongside create/preserve/overwrite/conflict. Re-running `init` on an
  installed repository rewrites its lock-owned files byte-identically; reporting 27 of those under
  "would overwrite" reads as a data-loss warning for a no-op.
- Add a `model validation` check to `doctor`, injected by the CLI so the distribution package stays
  free of a dependency on core, and computed with `validateBaseline` rather than the validate command
  so `doctor` stays read-only.
- Add an `authoring templates` check with three states. Absent is informational, not a failure: a
  repository that authors by hand legitimately has no `.product/templates` — this one does not. A
  _partial_ set is the real defect.

## Capabilities

### Modified Capabilities

- `distribution`: initialization becomes a plan that can be reported instead of applied; health
  checks cover validation and templates.
- `cli`: `init` gains `--dry-run`.

## Impact

- `packages/distribution`: `init.ts` and `install.ts` restructured; behaviour unchanged when applied.
- `packages/cli`: `init` reports plans; `doctor` supplies the validation verdict.
- `InstallResult` gains `removed`, and `installProvider`/`updateIntegrations` take an options object
  rather than positional tails — breaking for library consumers, noted in the changeset.
