# @prodshape/core

## 0.6.0

### Minor Changes

- ab8adff: Product Snapshot: orient first, read one artifact at a time

  `prodshape graph --format html` now generates a progressive-disclosure explorer instead of a fully
  expanded report. The file still contains the whole model — every artifact body and every relationship
  — but it carries them as inert embedded data and renders on demand, so the document the browser
  parses at open time holds the orientation view only.

  - **Opens on an overview**: identity, revision, artifact and relationship totals, counts by kind with
    entry points, a kind-level relationship aggregate, and a neutral report of the artifacts holding no
    relationships. No artifact body and no artifact-level graph at open.
  - **Master–detail reading**: exactly one artifact detail at a time, with its metadata, authored
    Markdown, and its declared and derived references kept apart.
  - **One selected artifact, addressable**: a single fragment router owns every state transition, so
    direct links work from `file://` and static hosting and Back/Forward retrace exploration. Fragments
    produced by earlier snapshots (`#FR-SNAPSHOT-002`) keep resolving permanently and are normalized in
    place without adding a history entry.
  - **Presentation**: light-only, system sans-serif with monospaced identifiers and revisions, thin
    borders, one accent plus a stable per-kind palette, and no meaning carried by colour alone.
  - **Accessibility**: landmarks and heading outline, keyboard operation, visible focus, `aria-current`
    on the selected artifact, WCAG 2.1 AA text contrast, reduced-motion respected.
  - **Smaller and flat at scale**: the generated file drops ~47% (459,704 → 246,167 bytes for this
    repository's own model) and the opening document grows 1.12× across a tenfold larger model, where it
    previously grew 10.55×.
  - Markdown link targets are restricted to `http`, `https` and `mailto`, so an authored
    `javascript:` or `data:` URL renders as inert text rather than an executable link.

  The whole-model graph is no longer part of the opening view and is opened on request. Generation
  remains deterministic and byte-identical for identical model content, offline, self-contained and
  read-only, and the CLI is unchanged.

- d313e9e: Product Snapshot: ranked offline search

  Search matched substrings without ranking, walked the artifact list in document order and stopped at
  a cap. Querying `product` against this repository's own model matched 73 artifacts, showed 25, hid 48
  without saying so, and returned **none** of the eight artifacts whose titles begin with "Product" —
  including the term "Product Snapshot" itself.

  - Results are **ranked**: exact identifier, then identifier prefix, then exact or prefix title, then
    title substring, then body content. Ties break on identifier, so ordering is total and deterministic.
  - Artifact **kinds** are searchable alongside identifiers, titles and bodies.
  - Every result shows identifier, title and kind; a body match also shows a **snippet** of the matching
    content, inserted as text.
  - **Truncation is never silent** — the page states the total match count whenever it limits what it
    displays, and never shows a lower-ranked match in place of a higher-ranked one.
  - **Keyboard**: arrows move an active result reported with `aria-activedescendant`, Enter follows it,
    Escape clears. Clearing never discards the selected artifact.
  - A query matching nothing says so and repeats the query.

  Also fixes a latency defect the ranking work exposed: the body-text index was built by parsing every
  rendered artifact through the DOM on the first keystroke, costing **849 ms** on a 730-artifact model.
  It now strips the generator's known tag vocabulary textually and warms during idle time — **15.5 ms**
  for the same first query, a 98% reduction.

- 8163f95: Product Snapshot: relationships grouped by type and kind, with exact counts

  An artifact's relationships were a flat list per direction — `BC-PRODUCT-DEFINITION` in this
  repository's own model spilled 27 undifferentiated rows, and a ten-times-larger model reaches 171.
  They are now grouped and counted.

  - Each direction is grouped by **relationship type** and then by the **artifact kind** at the other
    end, and every group states its **exact count**.
  - A group of more than eight members **starts collapsed**, showing its count instead of its members,
    and expands only when asked. Smaller groups stay open so nothing is hidden without reason. A lone
    large group collapses too — being the only group does not make it small.
  - Collapsed groups render no members until first opened, so selecting a high-degree artifact got
    **faster**: p95 selection latency on a 730-artifact model improved from 29.2 ms to 24.0 ms.
  - Disclosure uses the platform's own `<details>`/`<summary>`, so expansion is keyboard-operable and
    announces its state without ARIA to maintain.
  - Declared and derived directions stay separately labelled, every entry keeps its relationship type
    and direction, and every related artifact stays one step away.

  The complete list of typed, directed relationships remains readable without any visualization — the
  substance the focused neighbourhood projection will accelerate rather than replace.

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
