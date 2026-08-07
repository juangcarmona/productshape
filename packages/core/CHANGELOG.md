# @prodshape/core

## 0.10.0

### Minor Changes

- 5c00292: Acceptance criteria live in `verification[]`: stop requiring a body section that restates them

  The specification accepted [RFC 0022](https://github.com/product-definition-as-code/spec/blob/main/rfcs/0022-criteria-in-verification-list.md) (spec PR #24). A requirement's acceptance criteria are carried by `verification[]`, and the body SHOULD NOT restate them, so `## Acceptance Scenarios` left the required body sections of a Functional Requirement and `## Verification` left those of a Quality Requirement.

  `requiredBodySections` drops both. This only widens what validates: an artifact that carries the section is still valid, because additional sections have always been permitted, and an artifact that omits it no longer reports `PRODUCT009`. No repository that validated before this change stops validating.

  The `functional-requirement` and `quality-requirement` templates stop scaffolding the section, so a newly authored artifact no longer starts life restating its own criteria.

  Before this change every case in the spec's conformance corpus failed against `prodshape validate`, because the corpus fixtures had already dropped the sections the specification no longer requires.

- 527c213: Citation status precedence: tampered wins over stale, and the JSON envelope carries diagnostics

  The specification determined the citation status precedence (spec PR #19, closing spec issue #17): invalid digest, unresolved target, unresolved anchor, tampered, stale, current, first match wins, and a citation carries the diagnostic of its status and no other.

  `verifyCitation` previously gated the tamper check on the target's digest still matching the recorded one, so a hand-edited embedded projection whose cited target had also changed fell through to staleness. A citation that used to report `stale` (`PRODUCT061`, a warning, exit `0`) for that combination now reports `tampered` (`PRODUCT062`, an error, exit `1`). A consumer pipeline that was green on this combination can turn red; that is the point of the fix, since the defect it now surfaces was there all along.

  `prodshape citations verify --format json` now carries a `diagnostics` array alongside `citations` and `summary`, escalated the same way `validate` and `change validate` already report theirs. The array was already computed and spent only on summary counts, so `PRODUCT042` and `PRODUCT060` through `PRODUCT063` were unreachable to any machine reader of the citations command. They are reachable now.

## 0.9.0

### Minor Changes

- 5c1b1ac: Product Changes: `PRODUCT028`, a `superseded/` archive, and a product diff that names its impact

  The specification's second refinement of RFC 4 determined the five points that previously did not fix an implementation's behaviour. Two of them override the defaults this toolkit chose, and three are confirmed with the behaviour made explicit.

  - **`PRODUCT028`** — applying a Product Change whose status is not `approved` now reports the diagnostic `PRODUCT028` instead of a codeless error. It exits `1` (the invocation is well formed; the finding is about the model), is evaluated before anything is written, and leaves the working tree untouched. `ApplyPlan.blockers` is gone: both apply preconditions are diagnostics now, so there is no second, codeless channel for a refusal.
  - **`changes/superseded/`** — `prodshape change archive` files a `superseded` change under `docs/product/changes/superseded/` rather than alongside refusals in `rejected/`. `superseded` is reachable from `approved`, so filing it as a refusal recorded a decision nobody made. One directory per terminal status; `change list --all` reports the new state, and `prodshape init` scaffolds the directory.
  - **The product diff names its impact** — every entry carries `kind` (`added`, `modified` or `removed`) alongside the artifact and, for an addition or a modification, the resulting digest. A removal leaves no content and so carries no digest. Both the text and the JSON report carry all three facts per entry. The diff is still computed from the applied result rather than read off the declared operations, is still reported rather than written into the archived change, and its determinism is semantic rather than byte-level.
  - **`PRODUCT108`** — the warning is state-based and syntactic, as it already was in substance: it is reported on every validation of a change in status `approved`, not only at the transition. An unresolved question is any Markdown list item under `## Open Questions` at any nesting depth, bullet or ordered, counted regardless of content — task-list checkboxes included, since nothing in the syntax says who checked one. Ordered and `+` markers were previously missed. Prose is not a question, so `None.` and an empty section stay silent.
  - **Baseline drift** — confirmed unchanged: it covers `operations.modify` and `operations.remove` only, and an artifact counts as changed when its normalized content digest differs from its digest at `base-revision`, so a formatting-only commit is not drift and an addition is never drift-checked.

## 0.8.0

### Minor Changes

- 705f623: Retire the delivery pipeline and implement the citation contract (RFC #4). The Product Definition evolves through Product Changes: validated as overlays, approved by a human, materialized by an explicit apply, and accepted when a human merges the pull request carrying the result.

  **Breaking changes:**

  - Removed `prodshape handoff` and `prodshape coverage` commands, and `prodshape change promote` in favour of `prodshape change apply`.
  - Removed `--change` and `--sdd` options from `prodshape validate` and `prodshape init`.
  - Removed core modules: `slices.ts`, `promote.ts`, `handoff.ts`, `references.ts`, `closure.ts`.
  - Removed schemas: `delivery-slice`, `product-handoff`, `product-coverage`.
  - Removed templates: `delivery-slice.yaml`, `product-context.md`, `product-handoff.yaml`.
  - Removed skills: `slice-product-change`, `prepare-sdd-handoff`.
  - Removed hooks: `validate-product-change`, `validate-before-handoff`, `verify-traceability`, `check-handoff-staleness`.
  - Removed config key `integrations.sdd`.
  - `adapter-openspec` reduced to `locateOpenSpecChange` only (removed `checkCoverage`, `checkSliceEvidence`, `findChangeHandoffDirs`).
  - Retired diagnostics PRODUCT030-032, 040, 041, 043, 044, 109 and 110 (codes reserved, never reused).
  - The `product-change` status enum is `draft`, `proposed`, `approved`, `applied`, `rejected`, `superseded`. `in-progress` and `implemented` are gone: whether accepted intent has been built is a fact about delivery, not about the product.
  - Change directories are `changes/active/<chg-id>/` with `proposed/`, archived to `changes/completed/` or `changes/rejected/`.

  **New features:**

  - `prodshape cite` emits a citation record (inline, marker-block, or sidecar-ledger form).
  - `prodshape citations verify` scans consumer documents and reports citation statuses.
  - `prodshape change validate [id]` compiles each live change into an overlay on the baseline and validates the result end to end, touching no baseline file.
  - `prodshape change apply <id> [--dry-run]` materializes an approved change, reports the product diff with each impacted artifact's resulting digest, and archives the change. It creates no commit and merges nothing: applying is not accepting.
  - `prodshape change list [--all]` lists live changes, or the whole change history.
  - `prodshape change archive <id>` files a rejected or superseded change.
  - `verification[].id`: optional stable scenario id on FR and QR artifacts, citable via anchor.
  - New diagnostics: PRODUCT020-027 for Product Changes and their overlays, PRODUCT060 (unresolved citation), PRODUCT061 (stale citation, warning), PRODUCT062 (tampered projection), PRODUCT063 (anchor not found), PRODUCT108 (approved with unresolved open questions, warning). PRODUCT042 generalized to citation digests.
  - Schema vendoring: `pnpm schemas:sync` copies the normative schemas, including `product-change`, from the spec repository.
  - `init` scaffolds `docs/product/changes/{active,completed,rejected}/`.

  See [RFC #4](https://github.com/product-definition-as-code/spec/blob/main/rfcs/0004-delivery-model-reset.md) and [issue #52](https://github.com/juangcarmona/productshape/issues/52) for details.

## 0.7.0

### Minor Changes

- 267df9b: Product Snapshot: the Product Explorer

  The snapshot's exploration experience is now the Product Explorer: four coordinated surfaces over one selection and one addressable state. Completeness means every artifact and canonical relationship is reachable — not that every node is simultaneously rendered.

  - **Overview** — identity, revision, aggregate counts by kind with an entry point into each artifact family, the kind-level relationship aggregate, a neutral report of artifacts holding no relationships, and global search on the first screen.
  - **Catalog** — discovery as a workspace: search by identifier, title and content; filters over canonical fields only (kind, status, and bounded context where the model declares one); the query-and-filter state lives in the address, so a result set is deterministic and shareable, and opening a result and returning resumes the discovery.
  - **Artifact Reader** — the selected artifact dominates: authored content with its heading hierarchy, relationships grouped by meaning in both directions with complete counts on every group, titles and identifiers on every entry, one-step refocus, and a named, retraceable navigation context. The model is navigable as a graph through reading alone.
  - **Focused Topology** — a visual projection beside the Reader that is local, bounded and progressive: the selected artifact anchors its immediate relationship groups, typed and counted; small neighbourhoods open whole while large groups start collapsed with their complete counts; disclosure is addressable (`?x=`) and replaces history; refocusing draws a new neighbourhood rather than accumulating; sets too dense to draw legibly fall back to a structured list; the arrangement re-allocates on expand so nothing collides or leaves the canvas; and pan, zoom and fit work by pointer and keyboard.

  There is no whole-product drawing of any kind. The earlier whole-model circle, the layered map and the standalone projection routes are gone; old `#/graph` addresses resolve in place into the integrated view, and bare-identifier fragments keep their permanent guarantee. The page remains one static, self-contained, offline, deterministic file with no global scroll — each region scrolls on its own.

## 0.6.0

### Minor Changes

- ab8adff: Product Snapshot: orient first, read one artifact at a time

  `prodshape graph --format html` now generates a progressive-disclosure explorer instead of a fully expanded report. The file still contains the whole model — every artifact body and every relationship — but it carries them as inert embedded data and renders on demand, so the document the browser parses at open time holds the orientation view only.

  - **Opens on an overview**: identity, revision, artifact and relationship totals, counts by kind with entry points, a kind-level relationship aggregate, and a neutral report of the artifacts holding no relationships. No artifact body and no artifact-level graph at open.
  - **Master–detail reading**: exactly one artifact detail at a time, with its metadata, authored Markdown, and its declared and derived references kept apart.
  - **One selected artifact, addressable**: a single fragment router owns every state transition, so direct links work from `file://` and static hosting and Back/Forward retrace exploration. Fragments produced by earlier snapshots (`#FR-SNAPSHOT-002`) keep resolving permanently and are normalized in place without adding a history entry.
  - **Presentation**: light-only, system sans-serif with monospaced identifiers and revisions, thin borders, one accent plus a stable per-kind palette, and no meaning carried by colour alone.
  - **Accessibility**: landmarks and heading outline, keyboard operation, visible focus, `aria-current` on the selected artifact, WCAG 2.1 AA text contrast, reduced-motion respected.
  - **Smaller and flat at scale**: the generated file drops ~47% (459,704 → 246,167 bytes for this repository's own model) and the opening document grows 1.12× across a tenfold larger model, where it previously grew 10.55×.
  - Markdown link targets are restricted to `http`, `https` and `mailto`, so an authored `javascript:` or `data:` URL renders as inert text rather than an executable link.

  The whole-model graph is no longer part of the opening view and is opened on request. Generation remains deterministic and byte-identical for identical model content, offline, self-contained and read-only, and the CLI is unchanged.

- d313e9e: Product Snapshot: ranked offline search

  Search matched substrings without ranking, walked the artifact list in document order and stopped at a cap. Querying `product` against this repository's own model matched 73 artifacts, showed 25, hid 48 without saying so, and returned **none** of the eight artifacts whose titles begin with "Product" — including the term "Product Snapshot" itself.

  - Results are **ranked**: exact identifier, then identifier prefix, then exact or prefix title, then title substring, then body content. Ties break on identifier, so ordering is total and deterministic.
  - Artifact **kinds** are searchable alongside identifiers, titles and bodies.
  - Every result shows identifier, title and kind; a body match also shows a **snippet** of the matching content, inserted as text.
  - **Truncation is never silent** — the page states the total match count whenever it limits what it displays, and never shows a lower-ranked match in place of a higher-ranked one.
  - **Keyboard**: arrows move an active result reported with `aria-activedescendant`, Enter follows it, Escape clears. Clearing never discards the selected artifact.
  - A query matching nothing says so and repeats the query.

  Also fixes a latency defect the ranking work exposed: the body-text index was built by parsing every rendered artifact through the DOM on the first keystroke, costing **849 ms** on a 730-artifact model. It now strips the generator's known tag vocabulary textually and warms during idle time — **15.5 ms** for the same first query, a 98% reduction.

- 8163f95: Product Snapshot: relationships grouped by type and kind, with exact counts

  An artifact's relationships were a flat list per direction — `BC-PRODUCT-DEFINITION` in this repository's own model spilled 27 undifferentiated rows, and a ten-times-larger model reaches 171. They are now grouped and counted.

  - Each direction is grouped by **relationship type** and then by the **artifact kind** at the other end, and every group states its **exact count**.
  - A group of more than eight members **starts collapsed**, showing its count instead of its members, and expands only when asked. Smaller groups stay open so nothing is hidden without reason. A lone large group collapses too — being the only group does not make it small.
  - Collapsed groups render no members until first opened, so selecting a high-degree artifact got **faster**: p95 selection latency on a 730-artifact model improved from 29.2 ms to 24.0 ms.
  - Disclosure uses the platform's own `<details>`/`<summary>`, so expansion is keyboard-operable and announces its state without ARIA to maintain.
  - Declared and derived directions stay separately labelled, every entry keeps its relationship type and direction, and every related artifact stays one step away.

  The complete list of typed, directed relationships remains readable without any visualization — the substance the focused neighbourhood projection will accelerate rather than replace.

## 0.5.0

### Minor Changes

- 100b7bc: The Product Snapshot becomes a navigable graph. Every artifact reference on the generated page is now a link in both directions — the declared frontmatter references and the derived reverse views ("referenced by") no authored file states. An inline SVG visualization presents the model's shape: selecting a node highlights its relationships and jumps to the artifact. Client-side search over artifact IDs, titles and content works fully offline. Still one self-contained, read-only, byte-identical file with no external resources and no dependencies.

  This completes `CHG-SNAPSHOT-001` (second and final delivery slice): the full snapshot scope — browse, read, follow, visualize, search — is delivered.

## 0.4.0

### Minor Changes

- e58311c: Add the Product Snapshot: `prodshape graph --format html` generates one static, self-contained, read-only HTML page projecting the whole product model — every artifact rendered and organized by kind with visible status badges, frontmatter metadata, anchor navigation, and the source revision stamped on the page. The file opens from local disk with no server, no network and no scripts, and regenerating from identical model content yields a byte-identical file.

  This is the first delivery slice of `CHG-SNAPSHOT-001`: it introduces the Product Explorer — the person who wants to understand the product deeply without cloning a repository or running a CLI. Relationship links, the graph visualization and client-side search arrive with the second slice.

  `@prodshape/core` gains `buildSnapshotHtml` and a minimal deterministic Markdown renderer (`renderMarkdown`, `escapeHtml`) with no new dependencies.

## 0.3.0

### Minor Changes

- d8841a0: Improvements from the first adoption outside this repository.

  **Discoverable authoring contract.** Artifacts accept an optional `provenance` object recording the evidence behind recovered knowledge (`source` and `confidence` required, `recovered-from` optional), and a `draft` artifact resting on `confidence: low` reports the new warning `PRODUCT111`. `docs/specification/frontmatter-reference.md` documents every field of all 13 document kinds, generated from the schemas, and `prodshape schema <kind>` prints the same contract without needing a repository. A conformance test fails the build if the document and the schemas drift.

  **`prodshape fix --filenames`** resolves `PRODUCT101` by renaming artifact files to match their ID casing, including on Windows and macOS where a case-only rename is otherwise a silent no-op. `--dry-run` exits non-zero when anything would change, so filename drift finally has a CI gate.

  **`prodshape init --dry-run`** reports what initialization would create, preserve, regenerate or overwrite without writing anything, and exits non-zero on conflicts. Scaffolded directories now carry `.gitkeep` so the recommended layout survives a commit, and `--flat` opts out of it. `doctor` gains model validation and an authoring-templates check.

  **The `ps:*` command shorthand is now opt-in** via `integrations.shorthand-commands` (default `false`); `init --shorthand` sets it. Provider installation now deletes managed files it no longer generates, guarded by digest, so opting out does not strand them.

  Breaking for library consumers: `installProvider` and `updateIntegrations` take an options object instead of positional arguments, and `InstallResult` gains `removed`. The CLI's behaviour is unchanged apart from the new commands and flags.

### Patch Changes

- c48d95f: Fix `prodshape fix --filenames --dry-run` writing to disk.

  Recovery of a rename interrupted between its two steps ran before the dry-run check, so asking what the command _would_ do renamed the leftover file and then reported `Dry run: nothing was changed.` That contradicted the command's own contract (`FR-FIX-001`) and the guarantee the sibling `init --dry-run` is built on.

  Recovery is now split into `planFilenameRecovery` (read-only classification) and `applyFilenameRecovery`, matching the plan/apply pairs used elsewhere in the toolkit. A dry run reports `would recover <path>` and performs no rename; a pending recovery still counts toward the non-zero exit code, so the CI gate is unaffected. `--format json` gains a `wouldRecover` field so a planned recovery is distinguishable from a performed one.

## 0.2.0

### Minor Changes

- 84f6dbf: Conformance fixes for the v0.1 release candidate (fix-v01-conformance):

  - Promotion now requires coverage evidence per completed delivery slice (FR-PROMOTE-001). `planPromotion` accepts a `coverageProvider` port; the OpenSpec adapter discovers handoff sidecars deterministically (`findChangeHandoffDirs`, `checkSliceEvidence`); missing or unverifiable evidence is the new `PRODUCT044`; repositories without an SDD adapter must pass the new `--accept-external-evidence` flag explicitly.
  - `applyPromotion` is two-phase: a preflight that touches nothing on failure, then execution with the change-directory move last, so a failed promotion cannot leave a partially promoted baseline.
  - The CLI package installs the `product-definition` binary alias again (identical to `prodshape`), which generated skills and hooks invoke.
  - Coverage evidence is hardened: covered/partial entries need non-empty `specification` and `verification` arrays, evidence paths cannot be absolute or escape the repository, and entries for requirements outside `handoff.implements` are rejected.
  - `installProvider` preflights every target: files not owned by the installation lock, or owned but hand-edited, block `init --ai`, `integration add` and `integration update` (with the full conflict list) unless `--force`; refusals leave files and lock untouched.
  - `validation.warnings-as-errors` is enforced uniformly via `escalateWarnings` across baseline validate, change validate, handoff generation, graph generation and promotion.
