# @prodshape/integration-speckit

## 0.3.4

### Patch Changes

- f0d4a86: The recover UX wave, from the first external recovery run (#196-#206, one change per lesson the run taught).

  Recovery sessions grow the operations the run had to improvise: `recover unmark` retracts a wrong finding instead of leaving hand-editing session state as the only repair (#197); `recover mark --glob` / `--sources` applies one identical finding to a whole pending selection in a single state write, all or nothing (#198); the brief's ordered `tiers` drive inventory order so SDD specs and product documentation are served before source code instead of relying on path order (#199); and the brief's `git.branch` opts into checkpoint discipline, where the CLI creates the dedicated recovery branch, refuses a dirty tracked tree, and records one `recover(CHG-INITIAL): <step>` commit per state-mutating command (#205, with FR-RECOVER-001 amended by CHG-RECOVER-GIT-001 to permit exactly that and nothing more).

  Artifact id lists are now validated when they are recorded: `mark --artifacts` splits on commas and whitespace and rejects anything that is not a plausible artifact id, with a hint to quote the list, because the npm PowerShell shim turns an unquoted comma list into one space-joined argument that used to be stored silently and only explode later in `recover check` (#196). `prodshape cite` accepts `SB-` ids: `emitCitation` still carried a pre-RFC-0084 pattern, and the id grammar is now derived from the canonical kind-prefix map so a future kind cannot be forgotten again (#206).

  Two new canonical skills ship with their `/product:bind` and `/product:refine` commands: `bind-consumers` backfills scope declarations and citations into existing SDD consumer documents after an initial baseline, recording drift instead of fixing it, and `refine-product` runs the question-driven refinement interview whose answers become an ordinary Product Change (#202, #203). The recover-product skill is hardened where the external run stumbled (author candidates by copying templates, check after the first candidate, quote artifact lists, `SB-` in the prefix list, map evidence in the same step as creating a candidate) and its handover now offers the next moves: checkpoint commit, snapshot preview, the exact lifecycle commands, and the consumer-binding follow-up (#200, #204).

  Both SDD context blocks now enumerate the whole model, bounded contexts and structured behaviours included; already-integrated repositories pick the wording up through `prodshape integration update` (#201).

  The canonical skills also went through a refinement pass: each SKILL.md is the compressed view and its references own the depth (the authoring chain, the finding classifications, the exploration heuristics, the change template contract, the provenance contract each live in exactly one place), the two H1s that hardcoded shorthand aliases stop doing so (the `/ps:` shorthand itself stays opt-in and configured), the role noun is uniformly "the engineer", and every skill's "When to use" names its neighbouring skills so requests route without a router. `pnpm sync:assets` replaces the manual mirror step between the canonical `skills/`, `commands/` and `templates/` directories and the bundled distribution assets; the byte-identity test remains the gate.

- Updated dependencies [f0d4a86]
  - @prodshape/core@0.19.0

## 0.3.3

### Patch Changes

- 12ada16: Spec Kit population enumeration now reads the feature directory recorded in `.specify/feature.json`, closing a case where verification passed while real documents went ungated. Spec Kit's specify command resolves a feature directory under `specs/` by default, but uses an explicitly provided `SPECIFY_FEATURE_DIRECTORY` "as-is", so a feature can live anywhere in the repository; whatever it resolved is persisted to `.specify/feature.json` for the downstream plan and tasks commands. Enumeration looked only under `specs/`, so such a workspace reported `0 document(s)` and exited 0 while its `spec.md`, `plan.md` and `tasks.md` carried no scope declaration and no citations. The recorded directory is now enumerated when it falls outside `specs/`, and skipped when it is already in-tree so its documents are never counted twice. That file records one feature, the latest, so this narrows the hole rather than closing it: features placed outside `specs/` by earlier runs leave no record to enumerate. An absent, malformed or repository-escaping record falls back to `specs/` alone, which is what Spec Kit's own commands already fail loudly on. The reported `root` stays `specs`, the conventional document root, and every out-of-tree document is listed by its real repository-relative path.

## 0.3.2

### Patch Changes

- d2dd524: The Spec Kit guidance now names the carrier a scope declaration is actually read from, so an agent following it produces a bound document instead of an unclassified one. `extractScopeDeclaration` recognizes a declaration in exactly two places: an HTML comment carrying a `pdac-scope` key, or a `pdac-scope` key in YAML frontmatter. The guidance in `.specify/memory/pdac.md` said only to declare `pdac-scope: cited` "on a line of its own", naming neither carrier for the bound case, and the three managed Product Grounding template blocks mentioned the exemption alone and never said a bound document needs a declaration at all. Spec Kit's generated `spec.md`, `plan.md` and `tasks.md` carry no frontmatter, so the comment is the only available carrier there; an agent that dutifully added citations still landed on `PRODUCT064` with the message "carries 1 citation(s) but no scope declaration", and the cheapest way out of that message is to declare an exemption or delete the section, which is the outcome the gate exists to prevent. The blocks still contain no parseable declaration of their own, so an unfilled template stays unclassified.

## 0.3.1

### Patch Changes

- Updated dependencies [1e6d965]
- Updated dependencies [6ef7709]
- Updated dependencies [043725f]
- Updated dependencies [0e563ce]
  - @prodshape/core@0.18.0

## 0.3.0

### Minor Changes

- 060b5e1: Complete population-aware scope declarations per the frozen citation contract. Every current consumer document needs exactly one explicit declaration: `pdac-scope: cited` with at least one citation (bound), or `pdac-scope: none` with a non-empty human-authored reason (exempt), written as `pdac-scope-reason:` in frontmatter or `reason="..."` in the comment form. Citations alone no longer bind; an undeclared or unrecognized declaration is unclassified (`PRODUCT064`), and an exemption without a reason or contradicted by citations is one `PRODUCT066` per document. Provider verification now excludes archived history by default (`--include-archived` verifies its citations as warnings, scope gate current-only) and reports the provider identity and integration version; `SddIntegrationProvider` gains a required `version`.

### Patch Changes

- c8bd0b0: Align apply and citation writing with the frozen PDaC kernel contracts. The exact `CHG-INITIAL`/`0000000` pair now skips Git resolution, every ordinary revision must resolve even for add-only changes, and an unresolved revision produces one `PRODUCT027`. `prodshape cite` now writes the canonical ordered payload by default or the canonical mapping-form sidecar, rewrites the legacy inline request to a payload, and refuses to emit an unverifiable empty marker block. Generated context and integration instructions wrap payloads in native Markdown comments.
- Updated dependencies [4c2675a]
- Updated dependencies [b5f54df]
- Updated dependencies [02f4fef]
- Updated dependencies [c8bd0b0]
- Updated dependencies [060b5e1]
- Updated dependencies [cbd0602]
  - @prodshape/core@0.17.0

## 0.2.1

### Patch Changes

- Updated dependencies [f1bba4c]
  - @prodshape/core@0.16.1

## 0.2.0

### Minor Changes

- 0dd6320: Spec Kit bridge: a new `@prodshape/integration-speckit` package configures existing Spec Kit workspaces (managed guidance at `.specify/memory/pdac.md`, CI example, metadata; the constitution, templates, scripts and feature directories are never written) and enumerates the `spec.md`, `plan.md` and `tasks.md` of every feature directory for `citations verify --provider speckit` and `drift --provider speckit`. New `prodshape context` command renders a deterministic, cited context projection of requested product artifacts and their structural neighborhood for delivery intake. `init`, `integration add/update/check/remove` and `doctor` route Spec Kit workspaces into the integration.
