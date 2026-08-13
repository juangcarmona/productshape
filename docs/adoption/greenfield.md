# Adopting in a greenfield product

This guide covers adopting Product Definition as Code for a new product: a fresh repository, or a repository that has code scaffolding but no accumulated product behaviour to recover. You will initialize the layout, author the initial product baseline with the Define operation, validate it, and then run your first Product Change.

> The CLI ships as [`@prodshape/cli`](https://www.npmjs.com/package/@prodshape/cli) with two equivalent binaries: `prodshape` (canonical, used below) and `product-definition` (a v0.x compatibility alias with identical output, removed before v1). Every step marked "by hand" also works without the CLI: the layout, schemas and templates are all plain files. See [Limitations](../limitations.md).

## 1. Initialize the repository

```bash
prodshape init --ai claude
```

`--ai` accepts a comma-separated list of `claude`, `copilot` and `codex` (`--ai claude,copilot`). It is optional: you can add integrations later with `prodshape integration add`.

`init` also detects SDD frameworks in the repository and can pair one with the product definition from the same command: `--sdd openspec` sets up an OpenSpec workspace (when none exists) and wires the citation integration end to end, while Kiro and Spec Kit install through their own tooling, so `--sdd kiro` and `--sdd speckit` print setup guidance instead. In an interactive terminal a bare `init` offers the choice; in scripts and CI it never prompts. `--sdd none` opts out.

`init` creates:

```text
docs/product/
├── model/                  # the current product model (canonical, empty at first)
│   ├── actors/
│   ├── journeys/
│   ├── use-cases/
│   ├── business-rules/
│   ├── domain/{terms,bounded-contexts}/
│   └── requirements/{functional,quality,constraints}/
└── changes/
    ├── active/
    ├── completed/
    ├── rejected/
    └── superseded/
.product/
├── config.yaml             # repository configuration (canonical)
├── installation.lock.json  # digests of the generated managed files; commit it
└── templates/              # authoring templates, one per artifact kind
```

The model subdirectories are a **recommendation, not a rule**: artifact discovery walks the model directory recursively and keys on the frontmatter `type`, so any layout validates. Taking the recommended one means not having to invent a taxonomy; `--flat` opts out. Each directory gets a `.gitkeep` so the structure survives a commit — Git does not track empty directories.

`.product/generated/` and `.product/cache/` appear later, when a command writes them. They are regenerable and non-canonical, so add them to your `.gitignore`; `init` does not modify that file for you.

Preview all of this against your repository before running it for real:

```bash
prodshape init --ai claude --dry-run
```

If you requested AI integrations, `init` also generates managed files under `.claude/` or `.github/` (skills, `/product:*` commands, hooks). Those are generated from canonical assets and must never be edited by hand — see [Installing into an existing repository](existing-repository.md) for the authority rules.

Everything above can also be created by hand: the layout is plain directories and the configuration shape is in [Installing into an existing repository](existing-repository.md#configuration).

## 2. Author the initial baseline with Define

The Define operation produces the first version of your product model: actors, journeys, use cases, business rules, domain terms, bounded contexts, functional requirements, quality requirements and constraints. The artifact contracts are specified in [Artifacts](https://github.com/product-definition-as-code/spec/blob/main/spec/artifacts.md); the human-facing walkthrough is [Define](../methodology/define.md).

Before authoring, read the [Frontmatter reference](../specification/frontmatter-reference.md): it lists every allowed property per artifact kind with its permitted values. Frontmatter is a closed contract — an unrecognised property is a `PRODUCT002` error — so it is worth knowing what is accepted rather than discovering it by trial and error. The same information is available per kind from the command line, and needs no repository:

```bash
prodshape schema use-case
```

Two ways to run Define:

- **With the `define-product` skill.** In a repository with the Claude Code or GitHub Copilot integration installed, the skill interviews you about the product and drafts schema-conformant artifacts for review. AI drafts; you decide what becomes part of the model.
- **By hand from `.product/templates/`.** `init` installs a template per artifact kind, each conformant to its schema. Copy the template, assign a stable ID (see [Identifiers](https://github.com/product-definition-as-code/spec/blob/main/spec/identifiers.md)), fill in the frontmatter relationships and the required body sections. `prodshape schema <kind>` prints the field contract if the template's comments leave anything unclear.

A workable authoring order, because relationships point upstream:

1. Actors (`ACT-`) — who obtains outcomes from the product.
2. Bounded contexts (`BC-`) and domain terms (`TERM-`) — the product language.
3. Use cases (`UC-`) and journeys (`JRN-`) — the behaviour.
4. Business rules (`BR-`) — the durable knowledge that governs behaviour.
5. Functional requirements (`FR-`), quality requirements (`QR-`) and constraints (`CON-`) — the obligations, each traceable to the artifacts it derives from.

Author only canonical relationships (for example `Domain Term.defined-in`); reverse views such as `owns-terms` are derived by the graph compiler and are rejected by the schemas if authored. See [Relationships](https://github.com/product-definition-as-code/spec/blob/main/spec/relationships.md).

## 3. Establish the first definition through CHG-INITIAL

There is no bootstrap exception: the first Product Definition enters the same way every later change does. Author the artifacts you drafted above as the proposed future state of a change with the reserved identifier `CHG-INITIAL`, listing every one of them under `operations.add`:

```text
docs/product/changes/active/chg-initial/
├── change.md      # id: CHG-INITIAL, operations.add lists every artifact
└── proposed/      # the artifacts, laid out as they will live in the model
```

Validate it, approve it, and apply it. Apply writes the model and archives the change under `changes/completed/chg-initial/`, which is where the record of how this definition came to exist stays. A product MUST NOT have more than one `CHG-INITIAL`, and every semantic evolution after it is another Product Change. The rule is normative: see [Product Changes](https://github.com/product-definition-as-code/spec/blob/main/spec/product-changes.md).

## 4. Validate the baseline

```bash
prodshape validate
prodshape validate --format json   # machine-readable diagnostics
```

Validation is deterministic: schema conformance, ID and prefix rules, reference resolution, relationship target types, lifecycle interactions and required body sections, with stable diagnostic codes (`PRODUCT001`–`PRODUCT111`). Errors block; warnings inform (a repository may escalate them with `validation.warnings-as-errors`). See [Validation](../specification/validation.md).

Once the model compiles cleanly, explore it:

```bash
prodshape graph --format mermaid   # render the product graph
prodshape inspect UC-EXAMPLE-001   # one artifact with its derived relationships
prodshape impact BR-EXAMPLE-001    # structural impact of a change to this rule
```

## 5. Run your first Product Change

From now on, evolution is explicit. To change the product:

1. Create `docs/product/changes/active/<chg-id>/` with a `change.md` (problem, intended outcome, rationale, operations, `base-revision`) and complete proposed future-state artifacts under `proposed/`. The `analyze-product-change` skill helps draft this; the contract is [Product Changes](https://github.com/product-definition-as-code/spec/blob/main/spec/product-changes.md).
2. Validate the change as an overlay on the baseline: `prodshape change validate CHG-EXAMPLE-001`. Nothing in the baseline is touched, so elaborate until the overlay is clean and the open questions are answered.
3. A human sets `status: approved`. No tool takes this step.
4. Apply it: `prodshape change apply CHG-EXAMPLE-001 --dry-run`, then without `--dry-run`. Apply writes the operations into the model, reports the product diff and archives the change under `changes/completed/`. It creates no commit and is never triggered implicitly.
5. Open a pull request with the result. The merge is what accepts the change.

The end-to-end walkthrough is [Change](../methodology/change.md).
