---
id: TERM-PRODUCT-ARTIFACT
type: domain-term
title: Product Artifact
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms: []
---

## Definition

An independently addressable unit of product knowledge carrying a stable immutable ID: an Actor, Journey, Use Case, Business Rule, Domain Term, Bounded Context, Functional Requirement, Quality Requirement or Constraint. Each product artifact is an authored Markdown file with typed YAML frontmatter and required body sections, lives in the current product model, and participates in the product graph through canonical relationships declared in its frontmatter.

## Distinguish From

- **Product Change and Delivery Slice.** Both carry stable IDs and are validated by the same toolchain, but neither is a product artifact: they describe evolution and delivery of the model rather than the model itself, and they follow their own lifecycles, not the artifact lifecycle.
- **Generated outputs.** Compiled graphs, reverse indexes, diagrams, handoffs and context documents may render artifact content, but they are derived and reproducible; only the authored file is the artifact.
- **A file.** The artifact is the identified unit of knowledge; the file is merely its current storage location. Moving or renaming the file does not create or destroy an artifact.

## Usage

Product artifacts are what `prodshape validate` checks, what the graph compiler turns into nodes, what Product Changes add, modify or remove, and what Product Handoffs reference by ID and digest. When the methodology says "artifact" without qualification, it means a product artifact in the current product model.
