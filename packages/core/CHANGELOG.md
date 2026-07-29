# @prodshape/core

## 0.5.0

### Minor Changes

- 100b7bc: The Product Snapshot becomes a navigable graph. Every artifact reference on the generated page is
  now a link in both directions — the declared frontmatter references and the derived reverse views
  ("referenced by") no authored file states. An inline SVG visualization presents the model's
  shape: selecting a node highlights its relationships and jumps to the artifact. Client-side
  search over artifact IDs, titles and content works fully offline. Still one self-contained,
  read-only, byte-identical file with no external resources and no dependencies.

  This completes `CHG-SNAPSHOT-001` (second and final delivery slice): the full snapshot scope —
  browse, read, follow, visualize, search — is delivered.

## 0.4.0

### Minor Changes

- e58311c: Add the Product Snapshot: `prodshape graph --format html` generates one static, self-contained,
  read-only HTML page projecting the whole product model — every artifact rendered and organized by
  kind with visible status badges, frontmatter metadata, anchor navigation, and the source revision
  stamped on the page. The file opens from local disk with no server, no network and no scripts,
  and regenerating from identical model content yields a byte-identical file.

  This is the first delivery slice of `CHG-SNAPSHOT-001`: it introduces the Product Explorer — the
  person who wants to understand the product deeply without cloning a repository or running a CLI.
  Relationship links, the graph visualization and client-side search arrive with the second slice.

  `@prodshape/core` gains `buildSnapshotHtml` and a minimal deterministic Markdown renderer
  (`renderMarkdown`, `escapeHtml`) with no new dependencies.

## 0.3.0

### Minor Changes

- d8841a0: Improvements from the first adoption outside this repository.

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

### Patch Changes

- c48d95f: Fix `prodshape fix --filenames --dry-run` writing to disk.

  Recovery of a rename interrupted between its two steps ran before the dry-run check, so asking what
  the command _would_ do renamed the leftover file and then reported `Dry run: nothing was changed.`
  That contradicted the command's own contract (`FR-FIX-001`) and the guarantee the sibling
  `init --dry-run` is built on.

  Recovery is now split into `planFilenameRecovery` (read-only classification) and
  `applyFilenameRecovery`, matching the plan/apply pairs used elsewhere in the toolkit. A dry run
  reports `would recover <path>` and performs no rename; a pending recovery still counts toward the
  non-zero exit code, so the CI gate is unaffected. `--format json` gains a `wouldRecover` field so a
  planned recovery is distinguishable from a performed one.

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
