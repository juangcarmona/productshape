# Product definition of Product Definition as Code

This directory is the canonical product definition of Product Definition as Code itself: the repository defines itself with its own methodology. Every artifact kind therefore has a real, maintained example here.

## Layout

```text
docs/product/
├── model/       Current product model (the baseline) — canonical
│   ├── actors/
│   ├── journeys/
│   ├── use-cases/
│   ├── business-rules/
│   ├── domain/
│   │   ├── terms/
│   │   └── bounded-contexts/
│   ├── requirements/
│   │   ├── functional/
│   │   ├── quality/
│   │   └── constraints/
│   └── index.md  Human navigation only — never a generated index
└── changes-archive/  Historical Product Changes (retired, inert)
```

The authority rules for these paths are normative in [the specification](https://github.com/product-definition-as-code/spec).

Validate the model with `prodshape validate`. The allowed frontmatter of any artifact kind is printed by `prodshape schema <kind>` and enumerated in the [frontmatter reference](../specification/frontmatter-reference.md); in an adopting repository, `init` also installs an authoring template per kind under `.product/templates/`. This repository authors from the specification directly, so it has none.

## How this baseline evolves

The baseline changes through exactly one operation: a human merging a validated proposed revision (a pull request). Everything else is a proposal. `prodshape validate` runs as a CI gate; a proposal that fails structural validation MUST NOT be merged. Consumer documents cite product artifacts by ID + digest + anchor; `prodshape citations verify` detects drift.

## Scope of this model

The model describes the first complete adoption and change workflow of the product: who uses it, the journeys of adopting it, evolving a definition and delivering an increment through an SDD framework, the rules and language that govern it, and the requirements the toolkit is obliged to meet. It deliberately does not model every future feature.
