# Product definition of Product Definition as Code

This directory is the canonical product definition of Product Definition as Code itself: the repository defines itself with its own methodology. Every artifact kind therefore has a real, maintained example here.

## Layout

```text
docs/product/
├── model/       The accepted Product Definition (the baseline): canonical
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
│   └── index.md  Human navigation only, never a generated index
└── changes/
    ├── active/     Live Product Changes, each with its proposed future state
    ├── completed/   Applied changes: change history, inert
    ├── rejected/    Refused changes: change history, inert
    └── superseded/  Overtaken changes: change history, inert
```

The archives are history, not model. They are never compiled into the graph and take no part in duplicate detection, reference resolution or operation checks. There is one directory per terminal status, because a change that was approved and then overtaken is not a change that was refused, and the change history is the record of which happened.

The authority rules for these paths are normative in [the specification](https://github.com/product-definition-as-code/spec).

Validate the model with `prodshape validate`. The allowed frontmatter of any artifact kind is printed by `prodshape schema <kind>` and enumerated in the [frontmatter reference](../specification/frontmatter-reference.md); in an adopting repository, `init` also installs an authoring template per kind under `.product/templates/`. This repository authors from the specification directly, so it has none.

## How this Product Definition evolves

Through Product Changes, and nothing else. A change is elaborated under `changes/active/`, validated as an overlay on the baseline with `prodshape change validate`, approved by a human, and materialized by `prodshape change apply`, which writes the result, reports the product diff and archives the change. The pull request that carries the result is where a human accepts it: applying is not accepting, and `prodshape validate` runs as a CI gate so a proposal that fails structural validation is never merged.

This model entered through [`CHG-INITIAL`](changes/completed/chg-initial/change.md), the same mechanism as every change since. Consumer documents cite product artifacts by ID, digest and optional anchor; `prodshape citations verify` detects drift.

## Scope of this model

The model describes the first complete adoption and change workflow of the product: who uses it, the journeys of adopting it, evolving a definition and delivering an increment through an SDD framework, the rules and language that govern it, and the requirements the toolkit is obliged to meet. It deliberately does not model every future feature.
