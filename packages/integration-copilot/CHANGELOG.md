# @prodshape/integration-copilot

## 0.4.0-alpha.0

### Minor Changes

- f1a1612: Publish the core additions the adapters already import: `validateHostedProductChange` and `planHostedProductChange` (the shared hosted Product Change rail), the optional `recoveryRoot` a host can set on the repository, and the optional `changeDir` for a hosted `CHG-INITIAL` recovery container. The published `@prodshape/integration-speckit` and `@prodshape/integration-openspec` resolve against this core. `@prodshape/integration-copilot` ships the skill layout it already renders through the CLI: `.github/skills/<name>/SKILL.md` with the references inside the skill directory.

## 0.3.0

### Minor Changes

- 01303f8: Add `ps:explore` — a product-graph-aware thinking partner before `ps:change`.

  **New skill: `explore-product`.** Before committing to a Product Change, engineers can invoke `/ps:explore` (or `/product:explore`) to clarify a fuzzy idea against the existing product model. The skill reads the full product graph upfront, reasons from a high-altitude structural view to surface gaps, inconsistencies, and affected artifacts, and ends with an explicit offer to hand off to `ps:change`. When the model is absent or minimal it explains ProductShape's artifact vocabulary instead (greenfield mode). If `ps:change` detects that a request is ambiguous, it warns the user and recommends `ps:explore` before proceeding.

  This fills the missing entry point in the ProductShape workflow: product engineers previously had no guided way to explore a fuzzy idea before `ps:change` required a well-formed request.

## 0.2.0

### Minor Changes

- d8841a0: Improvements from the first adoption outside this repository.

  **Discoverable authoring contract.** Artifacts accept an optional `provenance` object recording the evidence behind recovered knowledge (`source` and `confidence` required, `recovered-from` optional), and a `draft` artifact resting on `confidence: low` reports the new warning `PRODUCT111`. `docs/specification/frontmatter-reference.md` documents every field of all 13 document kinds, generated from the schemas, and `prodshape schema <kind>` prints the same contract without needing a repository. A conformance test fails the build if the document and the schemas drift.

  **`prodshape fix --filenames`** resolves `PRODUCT101` by renaming artifact files to match their ID casing, including on Windows and macOS where a case-only rename is otherwise a silent no-op. `--dry-run` exits non-zero when anything would change, so filename drift finally has a CI gate.

  **`prodshape init --dry-run`** reports what initialization would create, preserve, regenerate or overwrite without writing anything, and exits non-zero on conflicts. Scaffolded directories now carry `.gitkeep` so the recommended layout survives a commit, and `--flat` opts out of it. `doctor` gains model validation and an authoring-templates check.

  **The `ps:*` command shorthand is now opt-in** via `integrations.shorthand-commands` (default `false`); `init --shorthand` sets it. Provider installation now deletes managed files it no longer generates, guarded by digest, so opting out does not strand them.

  Breaking for library consumers: `installProvider` and `updateIntegrations` take an options object instead of positional arguments, and `InstallResult` gains `removed`. The CLI's behaviour is unchanged apart from the new commands and flags.
