# ProductShape CLI

**`@prodshape/cli`** is the reference implementation of the [Product Definition as Code](https://github.com/juangcarmona/productshape) methodology — a canonical, versioned, machine-validatable definition of a product that sits in front of your backlog and your Spec-Driven Development (SDD) workflow.

ProductShape is to Product Definition as Code what OpenSpec is to Spec-Driven Development: the methodology is the long-lived concept; ProductShape is one implementation of it.

> **Supported published baseline:** `@prodshape/cli@0.13.0`. The command surface and outputs are still settling; the schema and diagnostic contracts (`product-definition-as-code/…`, `PRODUCT###`) are intended to be stable. Behaviour present only on the repository's `main` branch is unreleased until a newer package version appears on npm.

## Install

```bash
npm install -g @prodshape/cli@0.13.0
# or run without installing:
npx @prodshape/cli@0.13.0 --help
```

The canonical command is `prodshape`; `product-definition` remains an identical v0.x compatibility alias. Requires Node.js >= 22.

`prodshape change create <CHG-ID>`, `-v`, `PRODUCT002` field naming, the gated OpenSpec tip and `--root` on `validate`/`citations verify` are implemented on `main` for the next release, but they are not behaviour of the published `0.10.0` package.

## What it does

A product definition is a set of Markdown artifacts with stable IDs — actors, journeys, use cases, business rules, domain terms, bounded contexts and requirements — whose typed frontmatter relationships compile into a product graph. It evolves through Product Changes: complete proposed future-state artifacts are validated as an overlay, approved by a human and explicitly applied on a working branch. A pull request reviews the applied result, and its merge accepts the resulting baseline; apply is not acceptance, and neither apply nor merge attests delivery. Product-definition work and implementation work may share that pull request or proceed at different times, but they remain distinct.

```bash
prodshape init --ai claude                  # scaffold a product definition in a repository
prodshape validate                          # deterministic structural validation
prodshape graph --format mermaid            # compile the product graph
prodshape schema <kind>                     # the allowed frontmatter for a document kind
prodshape inspect <ID>                      # metadata + relationships of one artifact
prodshape impact <ID> --direction incoming  # structural impact analysis
prodshape change validate [CHG-ID]          # validate live changes as overlays on the baseline
prodshape change list [--all]               # live changes, or the whole change history
prodshape change apply CHG-ID [--dry-run]   # materialize an approved change; never commits
prodshape change archive CHG-ID             # file a rejected or superseded change
prodshape recover start --brief brief.yaml  # open a brownfield recovery session: evidence inventory, hashes, checkpoints
prodshape recover next | mark | check       # bounded batches, per-source classification, drift detection and overlay validation
prodshape recover report                    # final recovery report; candidates stay proposed under CHG-INITIAL
prodshape citations verify                  # check citations in consumer documents
prodshape doctor                            # repository health
```

Exit codes: `0` success (warnings allowed), `1` validation errors, `2` invalid invocation or configuration, `3` unexpected failure.

## Status

The CLI bundles `@prodshape/core`, `@prodshape/distribution`, `@prodshape/integration-openspec` and the provider integrations at build time, so installing it is all you need. Each is also published separately for programmatic use. `@prodshape/integration-openspec` is the current OpenSpec package; `@prodshape/adapter-openspec` is a legacy package name from older releases. See the [repository](https://github.com/juangcarmona/productshape) for the executable quickstart, methodology, normative specification and self-hosted product model.

## License

Apache-2.0.
