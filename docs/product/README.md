# Product definition of Product Definition as Code

This directory is the canonical product definition of Product Definition as Code itself: the
repository defines itself with its own methodology. Every artifact kind therefore has a real,
maintained example here.

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
└── changes/     Product Changes
    ├── active/
    ├── completed/
    └── rejected/
```

The authority rules for these paths are normative in
[the specification](../specification/index.md#canonical-authority).

## How this baseline came to exist

This initial model was authored directly under the **initial-baseline bootstrap exception**:

> An initial product baseline MAY be established directly during product initialization or the
> first Define operation. Once that baseline has been accepted, every subsequent semantic
> evolution of the product MUST be represented through a Product Change.

That exception has been used — once. From here on, every semantic change to `model/` goes through
a Product Change under `changes/` and reaches the baseline only by explicit promotion
(`prodshape change promote`). See [Product Changes](../specification/product-changes.md).

## Scope of this model

The model describes the first complete adoption and change workflow of the product: who uses it,
the journeys of adopting it, evolving a definition and delivering an increment through an SDD
framework, the rules and language that govern it, and the requirements the toolkit is obliged to
meet. It deliberately does not model every future feature.
