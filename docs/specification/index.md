# Product Definition as Code — Specification

This is the normative specification for Product Definition as Code v0.1. It defines the artifact
contracts, identity rules, relationship vocabulary, Product Change semantics, delivery slices, the
Product Handoff contract, deterministic validation and conformance criteria.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT** and **MAY** in these documents are
to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

Human-facing explanations live in [`docs/methodology/`](../methodology/overview.md). Where the
methodology and this specification appear to disagree, this specification wins.

## Contents

1. [Terminology](terminology.md) — definitions of the terms used normatively.
2. [Artifacts](artifacts.md) — artifact types, frontmatter contracts, required body sections,
   lifecycle states.
3. [Frontmatter reference](frontmatter-reference.md) — the exhaustive per-kind field tables
   (generated from the schemas): required and optional fields, allowed values, provenance.
4. [Identifiers](identifiers.md) — stable immutable IDs, prefixes, grammar, file naming.
5. [Relationships](relationships.md) — canonical relationship vocabulary and derivation rules.
6. [Product Changes](product-changes.md) — change structure, operations, overlay validation,
   lifecycle, promotion, the initial-baseline bootstrap exception.
7. [Delivery Slices](delivery-slices.md) — slice structure, coverage declarations, lifecycle.
8. [Handoff Contract](handoff-contract.md) — the Product Handoff and Product Context contracts,
   subgraph selection, staleness.
9. [Validation](validation.md) — deterministic diagnostics, stable codes, exit codes.
10. [Conformance](conformance.md) — what it means for a repository and an implementation to
    conform.

## Canonical authority

Within a repository that adopts Product Definition as Code:

| Path                                                                                                                | Authority                                                         |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `docs/product/model/**/*.md`                                                                                        | Canonical current product semantics                               |
| `docs/product/changes/active/**/change.md`                                                                          | Canonical definition of a proposed Product Change                 |
| `docs/product/changes/active/**/proposed/**/*.md`                                                                   | Canonical proposed future-state product semantics for that change |
| `docs/product/changes/active/**/slices/*.yaml`                                                                      | Authoritative delivery decomposition for that Product Change      |
| Product Handoffs, Product Context documents, graph files, generated indexes, Mermaid diagrams, traceability reports | Generated and non-canonical                                       |

`docs/product/model/index.md` is a human navigation and orientation document only. It MUST NOT
duplicate relationships and MUST NOT act as a generated product index.

Generated files MUST be reproducible from canonical sources at any time. Tools MUST NOT require a
generated file to exist in order to rebuild it.
