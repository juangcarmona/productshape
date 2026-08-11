<p align="center">
  <img src="assets/branding.png" alt="ProductShape — Product Definition as Code" width="360" />
</p>

<p align="center">
  <a href="https://github.com/juangcarmona/productshape/actions/workflows/ci.yml"><img src="https://github.com/juangcarmona/productshape/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/juangcarmona/productshape/actions/workflows/conformance.yml"><img src="https://github.com/juangcarmona/productshape/actions/workflows/conformance.yml/badge.svg" alt="Conformance" /></a>
  <a href="https://www.npmjs.com/package/@prodshape/cli"><img src="https://img.shields.io/npm/v/@prodshape/cli?logo=npm&label=%40prodshape%2Fcli" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/@prodshape/cli" alt="License" /></a>
</p>

# ProductShape

ProductShape, the reference implementation of Product Definition as Code. It is to Product Definition as Code what OpenSpec is to Spec-Driven Development.

A TypeScript toolkit that puts a canonical, versioned, machine-validatable product definition in front of your backlog and your Spec-Driven Development workflow.

> **Already using OpenSpec?** The [walkthrough: add PDaC to an existing OpenSpec repo in about 15 minutes](docs/adoption/existing-openspec-repository.md#the-walkthrough-first-rule-first-citation-first-drift-about-15-minutes) is the fastest way in: first rule, first citation, first caught drift, every step with its real output. This repository itself is the worked example ([#71](https://github.com/juangcarmona/productshape/issues/71), [PR #76](https://github.com/juangcarmona/productshape/pull/76)).

## The problem

AI-assisted engineering has made implementation fast, which moves the limiting factor left: teams now stall on understanding the product — its actors, behaviour, rules, language and requirements. That knowledge usually lives scattered across tickets, wikis, chat threads and people's heads. It is not versioned, not validated, not traceable, and every backlog item and every SDD change is written by re-deriving it from scratch. SDD frameworks like OpenSpec specify one implementation increment well, but nothing upstream defines the product those increments belong to.

Product Definition as Code makes that upstream layer explicit: product knowledge lives as reviewable files in your repository, changes to it are validated deltas, and every implementation increment traces back to the product knowledge it serves. The founding position is in [the manifesto](docs/manifesto.md).

## The core idea

Two assertions carry the whole design:

- **The relationships are the methodology.** Artifacts alone are documentation; what makes the model useful is the typed edges between them — which actor a use case serves, which rules govern it, which requirements derive from it — because those edges carry traceability from intent to implementation.
- **Markdown is the source of truth; the graph is compiled from Markdown.** Humans author plain Markdown files with YAML frontmatter. Tooling compiles them into a product graph, derives every reverse relationship, and validates the whole deterministically. Generated files are always reproducible and never authoritative.

Evolution is explicit end to end:

```text
Product Definition → Pull Request (validated, human-merged) → Baseline
  → Consumer docs cite artifacts by ID + digest → citations verify detects drift
  → native SDD workflow → Implementation → Verification
```

Nothing modifies the product model silently: changes are pull requests that must pass `prodshape validate` before merge (CI gate). Consumer documents cite product artifacts rather than re-stating them, so drift is machine-detectable. The five-minute explanation is [the methodology overview](docs/methodology/overview.md).

## The artifacts

The current product model is a set of Markdown artifacts, each with a stable immutable ID:

| Artifact               | Prefix  | Captures                                             |
| ---------------------- | ------- | ---------------------------------------------------- |
| Actor                  | `ACT-`  | Who or what interacts with the product               |
| Journey                | `JRN-`  | An end-to-end outcome across use cases               |
| Use Case               | `UC-`   | One concrete interaction and its flows               |
| Business Rule          | `BR-`   | Durable knowledge that governs behaviour             |
| Domain Term            | `TERM-` | Shared language, defined in a bounded context        |
| Bounded Context        | `BC-`   | A product-language boundary                          |
| Functional Requirement | `FR-`   | A derived obligation: what the product must do       |
| Quality Requirement    | `QR-`   | A measurable quality obligation                      |
| Constraint             | `CON-`  | An externally imposed or deliberately fixed boundary |

Contracts, required sections and lifecycles are normative in [the specification](https://github.com/product-definition-as-code/spec); `templates/` has a conformant starting point for each kind.

Frontmatter is a **closed** contract — an unrecognised property is an error, never silently ignored — so the allowed fields of every kind are enumerated in the [frontmatter reference](docs/specification/frontmatter-reference.md), generated from the schemas and drift-tested against them. Artifacts recovered from an existing system may carry an optional `provenance` object recording the evidence behind them (its source, how strongly it supports the claim, and how it was recovered), so a reviewer can tell a rule read from a test apart from one inferred from a variable name.

## The product graph

Each relationship is authored exactly once, in one direction, on one artifact (`derived-from`, `governed-by`, `defined-in`, ...). The graph compiler builds the full product graph from those declarations and derives all reverse views — a bounded context's owned terms, a rule's consumers, a use case's derived requirements — so nobody maintains reciprocal references. Validation over the graph is deterministic: unresolved references, disallowed target types, duplicate IDs and lifecycle violations are errors with stable codes; unused rules, unreachable requirements and draft artifacts resting on low-confidence evidence are warnings. Structural impact analysis (`impact <ID>`) answers "what is connected to this, how far, in which direction" — deterministically, with no semantic claims. See [the product graph](docs/methodology/product-graph.md) and [relationships](https://github.com/product-definition-as-code/spec/blob/main/spec/relationships.md).

## From idea to SDD increment

When the idea is fuzzy, `/ps:explore` is the entry point: it reads the product graph, reasons from a structural high-altitude view (surfacing gaps, inconsistencies and affected artifacts), and helps clarify the request before committing to a change. When the model is new or minimal it explains the artifact vocabulary instead.

A modification request is a pull request: direct edits to `docs/product/model/`, validated by `prodshape validate` as a full tree (CI gate). Merging is a human decision; tools MUST NOT merge, auto-approve or self-merge model changes. The merged model is the new canonical baseline.

Consumer documents (SDD specs, tasks, agent prompts, design docs) cite product artifacts by ID + content digest + optional scenario anchor, so drift between a consumer document and the canonical model is machine-detectable rather than silent. `prodshape citations verify` recomputes digests and reports one status per citation: `current`, `stale`, `tampered` or `unresolved`. Details: [change-as-PR and the citation contract](docs/methodology/overview.md).

## Packages

All packages are published on npm under the [`@prodshape`](https://www.npmjs.com/org/prodshape) scope, versioned independently with [Changesets](https://github.com/changesets/changesets) and published from GitHub Actions with provenance (see [RELEASING.md](RELEASING.md)).

| Package | Version | Description |
| --- | --- | --- |
| [`@prodshape/cli`](https://www.npmjs.com/package/@prodshape/cli) | [![npm](https://img.shields.io/npm/v/@prodshape/cli)](https://www.npmjs.com/package/@prodshape/cli) | The `prodshape` command-line tool (bundles the rest) |
| [`@prodshape/core`](https://www.npmjs.com/package/@prodshape/core) | [![npm](https://img.shields.io/npm/v/@prodshape/core)](https://www.npmjs.com/package/@prodshape/core) | Deterministic parsing, validation and graph |
| [`@prodshape/distribution`](https://www.npmjs.com/package/@prodshape/distribution) | [![npm](https://img.shields.io/npm/v/@prodshape/distribution)](https://www.npmjs.com/package/@prodshape/distribution) | Init, provider-asset generation and doctor |
| [`@prodshape/adapter-openspec`](https://www.npmjs.com/package/@prodshape/adapter-openspec) | [![npm](https://img.shields.io/npm/v/@prodshape/adapter-openspec)](https://www.npmjs.com/package/@prodshape/adapter-openspec) | OpenSpec adapter and coverage validation |
| [`@prodshape/integration-claude`](https://www.npmjs.com/package/@prodshape/integration-claude) | [![npm](https://img.shields.io/npm/v/@prodshape/integration-claude)](https://www.npmjs.com/package/@prodshape/integration-claude) | Claude Code renderer for canonical assets |
| [`@prodshape/integration-copilot`](https://www.npmjs.com/package/@prodshape/integration-copilot) | [![npm](https://img.shields.io/npm/v/@prodshape/integration-copilot)](https://www.npmjs.com/package/@prodshape/integration-copilot) | GitHub Copilot renderer for canonical assets |

```bash
npm install -g @prodshape/cli
# or run it once, without installing
pnpm dlx @prodshape/cli --help
```

## Try it in five minutes

The `prodshape` CLI is published on npm (see [Packages](#packages)). To try it against this repository's own product model, build from source:

```bash
git clone git@github.com:juangcarmona/productshape.git
cd productshape
pnpm install && pnpm build
```

This repository defines itself with its own methodology, so the built CLI has a real product model to run against, with 80+ artifacts and zero diagnostics:

```bash
node packages/cli/dist/bin.js validate
node packages/cli/dist/bin.js graph --format mermaid
node packages/cli/dist/bin.js inspect FR-CITE-001
node packages/cli/dist/bin.js impact BR-SDD-001 --direction incoming
```

The authoring contract is queryable, and needs no repository — useful before you have one:

```bash
prodshape schema                              # every document kind, with its ID prefix
prodshape schema use-case                     # the allowed frontmatter, straight from the schemas
prodshape schema use-case --format json       # the same contract, machine-readable
prodshape fix --filenames --dry-run           # what would be renamed to match its ID; exits 1 if any
prodshape fix --filenames                     # rename them (resolves PRODUCT101)
```

For a new repository, scaffold the model plus the AI integrations with:

```bash
prodshape init --ai claude --dry-run           # report every path, write nothing
prodshape init --ai claude                     # then apply it
prodshape doctor                               # check the result is healthy
```

`--ai` takes a comma-separated list (`--ai claude,copilot`). `--dry-run` reports what would be created, preserved, regenerated or overwritten and exits non-zero on a conflict, so it is worth running first in a repository that already has content — and it works as a CI precheck.

`prodshape` is the installed CLI (`npm install -g @prodshape/cli`); from a source checkout, run it as `node packages/cli/dist/bin.js`. The package installs `product-definition` alongside it — a v0.x compatibility alias with identical output, removed before v1. The `/product:*` commands stay canonical and are always generated; `/ps:*` is an opt-in shorthand (`/ps:explore`, `/ps:impact`), enabled with `init --shorthand` or by setting `integrations.shorthand-commands: true`. This repository has it enabled.

What you can read alongside:

- [The manifesto](docs/manifesto.md) and [the methodology overview](docs/methodology/overview.md) — the overview is a five-minute read.
- The self-hosted model under `docs/product/model`: this repository defines itself with its own methodology, so every artifact kind has a real example.
- [The specification](https://github.com/product-definition-as-code/spec) — normative. Start with [Artifacts](https://github.com/product-definition-as-code/spec/blob/main/spec/artifacts.md) for what each kind means and the [frontmatter reference](docs/specification/frontmatter-reference.md) for what you may write in one.
- `schemas/` and `templates/` — the machine contracts the CLI validates against, and a conformant starting point for each artifact kind.

Adoption guides for the four entry paths: [greenfield](docs/adoption/greenfield.md), [brownfield](docs/adoption/brownfield.md), [existing repository](docs/adoption/existing-repository.md) and [existing OpenSpec repository](docs/adoption/existing-openspec-repository.md).

## Current status

v0.1 established the whole loop: the methodology and normative specification, the graph core with deterministic validation, the citation contract with `cite` and `citations verify`, the AI skills with generated Claude Code and GitHub Copilot integrations, and the OpenSpec adapter. It is published to npm under the `@prodshape/*` scope, and the public brand is settled — ProductShape, the reference implementation of the Product Definition as Code methodology.

v0.2 is the first round of improvements driven by adoption outside this repository. That adoption tried to record provenance on recovered artifacts, discovered the schema had nowhere to put it, and could not find out from anywhere what the schema _did_ accept. So v0.2 makes the authoring contract discoverable — an optional `provenance` object on every artifact kind, a [frontmatter reference](docs/specification/frontmatter-reference.md) generated from the schemas, and `prodshape schema <kind>` — and makes two reported problems fixable: `prodshape fix --filenames` for filename drift that was unfixable by hand on Windows, and `prodshape init --dry-run` for the "what will this do to my repository?" question that has to be answered before running anything.

The loop is not a diagram here; the repository runs on it. This repository defines itself with its own methodology — the model the CLI validates above is the product definition of ProductShape itself, evolved through pull requests and verified by citations.

Remaining open decisions are in [OPEN-DECISIONS.md](OPEN-DECISIONS.md), and what is deliberately not built is below.

## Outside the current scope

Deliberately out of scope, among others: graph databases, web UIs, MCP servers, Jira integration, multi-repository graphs, automatic brownfield recovery, roadmaps and OKRs, hosted services and telemetry. The full list, plus known design limitations, is in [Limitations](docs/limitations.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The specification is normative, `docs/product` is canonical, and changes to the product definition itself go through its own Change operation.
