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

- **A Product Change.** A change carries its own stable ID and lifecycle, but it is not a product artifact: it records why and how the artifact set is proposed to evolve.
- **A citation.** A citation identifies canonical artifact content from a consumer document, but it is a reference to an artifact, not an artifact itself.
- **Generated outputs.** Compiled graphs, reverse indexes, diagrams, snapshots and reports may render artifact content, but they are derived and reproducible; only the authored file is the artifact.
- **A file.** The artifact is the identified unit of knowledge; the file is merely its current storage location. Moving or renaming the file does not create or destroy an artifact.

## Usage

Product artifacts are what `prodshape validate` checks, what the graph compiler turns into nodes, what Product Changes add, modify or remove, and what consumer documents cite by ID and digest. When the methodology says "artifact" without qualification, it means a product artifact in the current product model.
