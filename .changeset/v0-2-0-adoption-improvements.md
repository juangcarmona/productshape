---
'@prodshape/core': minor
'@prodshape/distribution': minor
'@prodshape/integration-claude': minor
'@prodshape/integration-copilot': minor
'@prodshape/cli': minor
---

Improvements from the first adoption outside this repository.

**Discoverable authoring contract.** Artifacts accept an optional `provenance` object recording the
evidence behind recovered knowledge (`source` and `confidence` required, `recovered-from` optional),
and a `draft` artifact resting on `confidence: low` reports the new warning `PRODUCT111`.
`docs/specification/frontmatter-reference.md` documents every field of all 13 document kinds,
generated from the schemas, and `prodshape schema <kind>` prints the same contract without needing a
repository. A conformance test fails the build if the document and the schemas drift.

**`prodshape fix --filenames`** resolves `PRODUCT101` by renaming artifact files to match their ID
casing, including on Windows and macOS where a case-only rename is otherwise a silent no-op.
`--dry-run` exits non-zero when anything would change, so filename drift finally has a CI gate.

**`prodshape init --dry-run`** reports what initialization would create, preserve, regenerate or
overwrite without writing anything, and exits non-zero on conflicts. Scaffolded directories now carry
`.gitkeep` so the recommended layout survives a commit, and `--flat` opts out of it. `doctor` gains
model validation and an authoring-templates check.

**The `ps:*` command shorthand is now opt-in** via `integrations.shorthand-commands` (default
`false`); `init --shorthand` sets it. Provider installation now deletes managed files it no longer
generates, guarded by digest, so opting out does not strand them.

Breaking for library consumers: `installProvider` and `updateIntegrations` take an options object
instead of positional arguments, and `InstallResult` gains `removed`. The CLI's behaviour is
unchanged apart from the new commands and flags.
