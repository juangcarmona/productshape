# Adopting in a greenfield product

This guide covers adopting Product Definition as Code for a new product: a fresh repository, or a
repository that has code scaffolding but no accumulated product behaviour to recover. You will
initialize the layout, author the initial product baseline with the Define operation, validate it,
and then run your first Product Change.

> The CLI ships as [`@prodshape/cli`](https://www.npmjs.com/package/@prodshape/cli) with two
> equivalent binaries: `prodshape` (canonical) and `product-definition` (v0.x alias, used in the
> commands below). Every step marked "by hand" also works without the CLI: the layout, schemas and
> templates are all plain files. See [Limitations of v0.1](../limitations-v0.1.md).

## 1. Initialize the repository

```bash
product-definition init --ai claude --sdd openspec
```

`--ai` accepts `claude` or `copilot` (repeatable); `--sdd` accepts `openspec`. Both are optional —
you can add integrations later with `product-definition integration add`.

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
    └── rejected/
.product/
├── config.yaml             # repository configuration (canonical)
├── installation.lock.json  # digests of the generated managed files; commit it
└── templates/              # authoring templates, one per artifact kind
```

The model subdirectories are a **recommendation, not a rule**: artifact discovery walks the model
directory recursively and keys on the frontmatter `type`, so any layout validates. Taking the
recommended one means not having to invent a taxonomy; `--flat` opts out. Each directory gets a
`.gitkeep` so the structure survives a commit — Git does not track empty directories.

`.product/generated/` and `.product/cache/` appear later, when a command writes them. They are
regenerable and non-canonical, so add them to your `.gitignore`; `init` does not modify that file
for you.

Preview all of this against your repository before running it for real:

```bash
product-definition init --ai claude --sdd openspec --dry-run
```

If you requested AI integrations, `init` also generates managed files under `.claude/` or
`.github/` (skills, `/product:*` commands, hooks). Those are generated from canonical assets and
must never be edited by hand — see
[Installing into an existing repository](existing-repository.md) for the authority rules.

Until the CLI exists, create the directories above manually and copy the configuration shape from
[Installing into an existing repository](existing-repository.md#configuration).

## 2. Author the initial baseline with Define

The Define operation produces the first version of your product model: actors, journeys, use
cases, business rules, domain terms, bounded contexts, functional requirements, quality
requirements and constraints. The artifact contracts are specified in
[Artifacts](../specification/artifacts.md); the human-facing walkthrough is
[Define](../methodology/define.md).

Before authoring, read the
[Frontmatter reference](../specification/frontmatter-reference.md): it lists every allowed property
per artifact kind with its permitted values. Frontmatter is a closed contract — an unrecognised
property is a `PRODUCT002` error — so it is worth knowing what is accepted rather than discovering it
by trial and error. The same information is available per kind from the command line, and needs no
repository:

```bash
product-definition schema use-case
```

Two ways to run Define:

- **With the `define-product` skill.** In a repository with the Claude Code or GitHub Copilot
  integration installed, the skill interviews you about the product and drafts schema-conformant
  artifacts for review. AI drafts; you decide what becomes part of the model.
- **By hand from `templates/`.** Every artifact type has a template that conforms to its JSON
  Schema in `schemas/`. Copy the template, assign a stable ID
  (see [Identifiers](../specification/identifiers.md)), fill in the frontmatter relationships and
  the required body sections.

A workable authoring order, because relationships point upstream:

1. Actors (`ACT-`) — who obtains outcomes from the product.
2. Bounded contexts (`BC-`) and domain terms (`TERM-`) — the product language.
3. Use cases (`UC-`) and journeys (`JRN-`) — the behaviour.
4. Business rules (`BR-`) — the durable knowledge that governs behaviour.
5. Functional requirements (`FR-`), quality requirements (`QR-`) and constraints (`CON-`) — the
   obligations, each traceable to the artifacts it derives from.

Author only canonical relationships (for example `Domain Term.defined-in`); reverse views such as
`owns-terms` are derived by the graph compiler and are rejected by the schemas if authored. See
[Relationships](../specification/relationships.md).

## 3. The initial-baseline bootstrap exception

The first baseline may be authored directly into `docs/product/model` — no Product Change is
required to create it. This is the only time direct authoring into the model is allowed. Once the
initial baseline is accepted, every subsequent semantic evolution of the product must go through a
Product Change, and the baseline is modified only by explicit promotion. The exception is
normative: see
[Product Changes](../specification/product-changes.md#the-initial-baseline-bootstrap-exception).

## 4. Validate the baseline

```bash
product-definition validate
product-definition validate --format json   # machine-readable diagnostics
```

Validation is deterministic: schema conformance, ID and prefix rules, reference resolution,
relationship target types, lifecycle interactions and required body sections, with stable
diagnostic codes (`PRODUCT001`–`PRODUCT111`). Errors block; warnings inform (a repository may
escalate them with `validation.warnings-as-errors`). See
[Validation](../specification/validation.md).

Once the model compiles cleanly, explore it:

```bash
product-definition graph --format mermaid   # render the product graph
product-definition inspect UC-EXAMPLE-001   # one artifact with its derived relationships
product-definition impact BR-EXAMPLE-001    # structural impact of a change to this rule
```

## 5. Run your first Product Change

From now on, evolution is explicit. To change the product:

1. Create `docs/product/changes/active/<chg-id>/` with a `change.md` (problem, intended outcome,
   rationale, operations) and complete proposed future-state artifacts under `proposed/`. The
   `analyze-product-change` skill helps draft this; the contract is
   [Product Changes](../specification/product-changes.md).
2. Validate the change as an overlay on the baseline:
   `product-definition change validate CHG-EXAMPLE-001`.
3. After approval, decompose it into delivery slices under `slices/`
   (the `slice-product-change` skill, contract in
   [Delivery Slices](../specification/delivery-slices.md)), project slices to backlog items, and
   generate Product Handoffs for your SDD framework with `product-definition handoff create`.
4. When every slice is completed or explicitly cancelled and coverage evidence exists, promote:
   `product-definition change promote CHG-EXAMPLE-001 --dry-run`, then without `--dry-run`.
   Promotion applies the operations to the baseline and moves the change to `changes/completed/`.
   It is never triggered implicitly.

The end-to-end walkthrough is [Change](../methodology/change.md); the delivery flow is
[Delivery slicing](../methodology/delivery-slicing.md) and [SDD handoff](../methodology/sdd-handoff.md).
