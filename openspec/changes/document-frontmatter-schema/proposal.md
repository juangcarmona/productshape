# Document the Frontmatter Schema

## Why

The first adoption outside this repository invented a `provenance` frontmatter field, produced 28
`PRODUCT002` errors, and had to delete it. The field was a reasonable guess: the methodology demands
provenance, the templates showed frontmatter without saying what else was allowed, and the diagnostic
said the document "must NOT have additional properties" without saying which properties it _may_
have.

The only complete statement of the frontmatter contract was the JSON Schemas under `schemas/`, which
no template and no adoption guide pointed at. An adopter had no way to answer "what fields may I use
on a business rule?" except trial and error against the validator.

## What Changes

- Add `docs/specification/frontmatter-reference.md`: per-kind field tables for all 13 document kinds
  — required and optional properties, allowed values, ID patterns, array vs scalar — generated from
  the canonical schemas by `pnpm docs:frontmatter`.
- Derive the tables from the schemas rather than restating them: `describeKind` in
  `@prodshape/core` resolves `$ref`s into `common.schema.json` and renders both the Markdown tables
  and the terminal output, so the document and the tool cannot disagree.
- Add `prodshape schema [kind]`, printing the same contract for one kind or listing every kind.
  It resolves no repository, because the moment it is needed is before `init`.
- Point every template at its section, and link the reference from the greenfield and brownfield
  adoption guides.
- Add a conformance test that fails the build when the document and the schemas drift, comparing
  normalized table cells so prettier's formatting is not mistaken for drift.

## Capabilities

### Modified Capabilities

- `normative-specification`: the frontmatter contract becomes a documented chapter, generated from
  the schemas.
- `cli`: a new read-only reference command that works outside a product repository.

## Impact

- `packages/core`: new `frontmatter-reference` module and `SchemaRegistry` accessors for the raw
  schema documents; both additive.
- `packages/cli`: new `schema` command.
- `docs/specification/`: new chapter, renumbered contents.
- `scripts/generate-frontmatter-reference.mts` and the `docs:frontmatter` script.
