# Add fix --filenames

## Why

`PRODUCT101` warns when an artifact's file name does not match its ID's lowercase form. On a
case-insensitive filesystem — Windows, and macOS by default — the fix is impossible by hand: renaming
`ACT-ADMIN.md` to `act-admin.md` is a no-op, because the two names refer to the same file. The first
adoption outside this repository tried it, the rename silently did nothing, and the warnings persisted.
They would have persisted on Windows CI runners too.

`PRODUCT101` is also the one diagnostic with no gate. It is a warning, and repositories default to
`warnings-as-errors: false`, so filename drift can accumulate indefinitely without any check failing.

## What Changes

- Add `prodshape fix --filenames`, renaming each artifact file to its ID's lowercase form.
- Rename through a temporary name, unconditionally. Branching on "is this rename case-only?" means
  guessing filesystem semantics; doing both steps always is correct everywhere.
- Derive the temporary name from the _target_, not the source, so a crash between the two steps leaves
  a file that encodes where it was going. The next run completes it.
- Refuse the whole plan when any entry is blocked — a target held by another artifact, two IDs
  resolving to one name, or a stale temporary file — rather than partially renaming canonical files.
- Exit non-zero from `--dry-run` when anything would change, so filename drift finally has a CI gate.
  This diverges from `change promote --dry-run`, deliberately.

### Testing the behaviour that matters

The two-step rename cannot be observed on a case-sensitive filesystem, and CI runs Linux. The planner
is therefore pure, and the rename primitive is injectable: a fake asserts the exact call sequence on
every platform, and the same fake failing after the first call simulates the crash. That injection is
the substitute for a case-insensitive runner, not a convenience.

## Capabilities

### Modified Capabilities

- `cli`: a new mutating command, named explicitly rather than implied.
- `structural-validation`: the filename rule gains one source of truth shared with its fix.

## Impact

- `packages/core`: new `fix-filenames` module beside `promote.ts`; `expectedFileName` extracted so the
  check and the fix cannot disagree.
- `packages/cli`: new `fix` command with flags rather than subcommands, so a future `--all` can
  compose fixers.
- `docs/specification/validation.md` and the brownfield guide.
