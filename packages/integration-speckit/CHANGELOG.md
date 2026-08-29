# @prodshape/integration-speckit

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
