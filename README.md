<p align="center">
  <img src="assets/branding.png" alt="ProductShape — Product Definition as Code" width="360" />
</p>

<p align="center">
  <a href="https://github.com/juangcarmona/productshape/actions/workflows/ci.yml"><img src="https://github.com/juangcarmona/productshape/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/juangcarmona/productshape/actions/workflows/pdac-conformance.yml"><img src="https://github.com/juangcarmona/productshape/actions/workflows/pdac-conformance.yml/badge.svg" alt="PDaC conformance (pinned)" /></a>
  <a href="https://www.npmjs.com/package/@prodshape/cli"><img src="https://img.shields.io/npm/v/@prodshape/cli?logo=npm&label=%40prodshape%2Fcli" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/@prodshape/cli" alt="License" /></a>
</p>

# ProductShape

**ProductShape — Product Definition as Code.** ProductShape is the reference implementation of the Product Definition as Code methodology: it is to Product Definition as Code what OpenSpec is to Spec-Driven Development.

A TypeScript toolkit that puts a canonical, versioned, machine-validatable product definition in front of your backlog and your Spec-Driven Development workflow.

## The problem

AI-assisted engineering has made implementation fast, which moves the limiting factor left: teams now stall on understanding the product — its actors, behaviour, rules, language and requirements. That knowledge usually lives scattered across tickets, wikis, chat threads and people's heads. It is not versioned, not validated, not traceable, and every backlog item and every SDD change is written by re-deriving it from scratch. SDD frameworks like OpenSpec specify one implementation increment well, but nothing upstream defines the product those increments belong to.

Product Definition as Code makes that upstream layer explicit: product knowledge lives as reviewable files in your repository, changes to it are validated deltas, and every implementation increment traces back to the product knowledge it serves. The founding position is in [the manifesto](docs/manifesto.md).

## The core idea

Two assertions carry the whole design:

- **The relationships are the methodology.** Artifacts alone are documentation; what makes the model useful is the typed edges between them — which actor a use case serves, which rules govern it, which requirements derive from it — because those edges carry traceability from intent to implementation.
- **Markdown is the source of truth; the graph is compiled from Markdown.** Humans author plain Markdown files with YAML frontmatter. Tooling compiles them into a product graph, derives every reverse relationship, and validates the whole deterministically. Generated files are always reproducible and never authoritative.

Evolution is explicit end to end:

```text
Accepted baseline
  → proposed Product Change
  → overlay validation
  → human product approval
  → explicit apply on a working branch
  → pull-request review
  → merge accepts the resulting baseline
  → consumer docs cite artifacts by ID + digest → citations verify detects drift
  → native SDD workflow → implementation → verification
```

Nothing modifies the product model silently. A Product Change records semantic intent before the baseline moves; `prodshape change validate` checks its overlay without writing; a human grants product approval; and `prodshape change apply` materializes the approved result on a working branch. Apply is not acceptance. A human merge accepts the resulting baseline, and `prodshape validate` is the CI gate. Consumer documents cite product artifacts rather than re-stating them, so drift is machine-detectable. The five-minute explanation is [the methodology overview](docs/methodology/overview.md).

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

A modification request becomes a Product Change under `docs/product/changes/active/<chg-id>/`, with complete proposed future-state artifacts under `proposed/`. Validate the overlay, obtain human product approval, and apply it explicitly. The pull request reviews the applied result; it is not the Product Change. Merging accepts the resulting baseline. Tools MUST NOT approve, merge, auto-approve or self-merge model changes.

Product-definition work and implementation work have independent cadence. They may share a pull request, or implementation may follow later, but they remain different things. Product Change status never attests implementation, verification, release or deployment.

Consumer documents (SDD specs, tasks, agent prompts, design docs) cite product artifacts by ID + content digest + optional scenario anchor, so drift between a consumer document and the canonical model is machine-detectable rather than silent. `prodshape citations verify` recomputes digests and reports one status per citation: `current`, `stale`, `tampered` or `unresolved`. Details: [the Product Change lifecycle and citation contract](docs/methodology/overview.md).

## Packages

All packages are published on npm under the [`@prodshape`](https://www.npmjs.com/org/prodshape) scope, versioned independently with [Changesets](https://github.com/changesets/changesets) and published from GitHub Actions with provenance (see [RELEASING.md](RELEASING.md)).

| Package | Version | Description |
| --- | --- | --- |
| [`@prodshape/cli`](https://www.npmjs.com/package/@prodshape/cli) | [![npm](https://img.shields.io/npm/v/@prodshape/cli)](https://www.npmjs.com/package/@prodshape/cli) | The `prodshape` command-line tool (bundles the rest) |
| [`@prodshape/core`](https://www.npmjs.com/package/@prodshape/core) | [![npm](https://img.shields.io/npm/v/@prodshape/core)](https://www.npmjs.com/package/@prodshape/core) | Deterministic parsing, validation and graph |
| [`@prodshape/distribution`](https://www.npmjs.com/package/@prodshape/distribution) | [![npm](https://img.shields.io/npm/v/@prodshape/distribution)](https://www.npmjs.com/package/@prodshape/distribution) | Init, provider-asset generation and doctor |
| [`@prodshape/integration-claude`](https://www.npmjs.com/package/@prodshape/integration-claude) | [![npm](https://img.shields.io/npm/v/@prodshape/integration-claude)](https://www.npmjs.com/package/@prodshape/integration-claude) | Claude Code renderer for canonical assets |
| [`@prodshape/integration-codex`](https://www.npmjs.com/package/@prodshape/integration-codex) | [![npm](https://img.shields.io/npm/v/@prodshape/integration-codex)](https://www.npmjs.com/package/@prodshape/integration-codex) | Codex renderer for canonical assets |
| [`@prodshape/integration-copilot`](https://www.npmjs.com/package/@prodshape/integration-copilot) | [![npm](https://img.shields.io/npm/v/@prodshape/integration-copilot)](https://www.npmjs.com/package/@prodshape/integration-copilot) | GitHub Copilot renderer for canonical assets |
| [`@prodshape/integration-openspec`](https://www.npmjs.com/package/@prodshape/integration-openspec) | [![npm](https://img.shields.io/npm/v/@prodshape/integration-openspec)](https://www.npmjs.com/package/@prodshape/integration-openspec) | OpenSpec configuration and citation-rule integration |

`@prodshape/integration-openspec` is the current OpenSpec package. The previously published `@prodshape/adapter-openspec` name belongs to older releases and is not part of the current package set.

```bash
npm install -g @prodshape/cli@0.13.0
# or run it once, without installing
pnpm dlx @prodshape/cli@0.13.0 --help
```

## Quickstart

The supported published baseline is **`@prodshape/cli@0.13.0`**. The following block is the primary quickstart and release-contract test source: CI runs this exact block against the packed release candidate, substituting only `PRODSHAPE_PACKAGE` with the tarball path.

<!-- release-contract-quickstart:start -->

```bash
set -eu
PRODSHAPE_PACKAGE="${PRODSHAPE_PACKAGE:-@prodshape/cli@0.13.0}"

mkdir productshape-quickstart
cd productshape-quickstart
npm init -y >/dev/null
npm install --save-dev --save-exact "$PRODSHAPE_PACKAGE"

npx --no-install prodshape init
npx --no-install prodshape validate

mkdir -p docs/product/model/business-rules openspec
cat > docs/product/model/business-rules/br-refund-001.md <<'EOF'
---
id: BR-REFUND-001
type: business-rule
title: Refund window
status: active
---

## Rule

Refunds are accepted within 30 days of delivery.

## Rationale

Customers need a predictable window; finance needs a bounded liability.

## Examples

A delivery on March 1 may be refunded through March 31.

## Exceptions

None.
EOF

npx --no-install prodshape cite \
  --id BR-REFUND-001 \
  --file docs/product/model/business-rules/br-refund-001.md \
  --form sidecar-ledger > openspec/refund.citations.yaml
npx --no-install prodshape citations verify

node --input-type=module -e "
  import { readFileSync, writeFileSync } from 'node:fs';
  const path = '.product/config.yaml';
  writeFileSync(path, readFileSync(path, 'utf8').replace('warnings-as-errors: false', 'warnings-as-errors: true'));
"
node --input-type=module -e "
  import { readFileSync, writeFileSync } from 'node:fs';
  const path = 'docs/product/model/business-rules/br-refund-001.md';
  writeFileSync(path, readFileSync(path, 'utf8').replace('30 days', '14 days'));
"

set +e
stale_output="$(npx --no-install prodshape citations verify 2>&1)"
stale_exit=$?
set -e
printf '%s\n' "$stale_output"
test "$stale_exit" -eq 1
printf '%s\n' "$stale_output" | grep -q 'PRODUCT061'
```

<!-- release-contract-quickstart:end -->

The first verification reports `current`. The second is expected to fail with `PRODUCT061` because the cited rule changed and this quickstart enables `warnings-as-errors` before the stale check.

Features on `main` newer than the pinned baseline are **unreleased** until a newer CLI version is published; the Current status section below lists them.

The authoring contract is queryable without a repository:

```bash
prodshape schema
prodshape schema use-case
prodshape schema use-case --format json
```

`--ai` takes a comma-separated list (`--ai claude,copilot`). `--dry-run` reports what would be created, preserved, regenerated or overwritten and exits non-zero on a conflict, so it is worth running first in a repository that already has content — and it works as a CI precheck.

`prodshape` is the canonical binary. The package also installs `product-definition` as a v0.x compatibility alias with identical output; it is scheduled for removal before v1. The `/product:*` commands stay canonical and `/ps:*` is an opt-in shorthand enabled with `init --shorthand` or `integrations.shorthand-commands: true`.

What you can read alongside:

- [The manifesto](docs/manifesto.md) and [the methodology overview](docs/methodology/overview.md) — the overview is a five-minute read.
- The self-hosted model under `docs/product/model`: this repository defines itself with its own methodology, so every artifact kind has a real example.
- [The specification](https://github.com/product-definition-as-code/spec) — normative. Start with [Artifacts](https://github.com/product-definition-as-code/spec/blob/main/spec/artifacts.md) for what each kind means and the [frontmatter reference](docs/specification/frontmatter-reference.md) for what you may write in one.
- `schemas/` and `templates/` — the machine contracts the CLI validates against, and a conformant starting point for each artifact kind.

Adoption guides for the four entry paths: [greenfield](docs/adoption/greenfield.md), [brownfield](docs/adoption/brownfield.md), [existing repository](docs/adoption/existing-repository.md) and [existing OpenSpec repository](docs/adoption/existing-openspec-repository.md).

## PDaC conformance

The pinned conformance workflow builds and packs ProductShape, installs that tarball outside the workspace, and runs the external `pdac-lint` suite. It targets [PDaC spec commit `89b43b78a6547c9dea709b6d261212c2fe4f3c4b`](https://github.com/product-definition-as-code/spec/commit/89b43b78a6547c9dea709b6d261212c2fe4f3c4b) with `pdac-lint` `0.1.2`. The profile is the full published v0.1-draft suite: kernel, reference profile and reference workflow; the specification defines no smaller conformance subset.

The gate retains JSON and human-readable reports, verifies every pinned digest, and runs a citation-omission negative control. The published tests are not yet a complete normative set, so the badge claims only this pinned executable profile. ProductShape's own fixtures, self-model and traceability checks run separately as **Internal contracts**.

## Current status

`@prodshape/cli@0.13.0` is the supported published baseline. It includes deterministic brownfield recovery sessions, Product Change overlay validation and apply with the affected-citation report, citation emission and verification (including provider-aware OpenSpec population verification), snapshot generation, schema discovery, filename repair, SDD-aware initialization, `prodshape --version`, and generated AI/OpenSpec integrations. The [root changelog](CHANGELOG.md) records every stable CLI release from `0.1.0` through `0.10.0`.

The next release candidate adds the issue #106 paper cuts: `prodshape change create <CHG-ID>` scaffolds a valid draft Product Change, `-v` joins `--version`, `PRODUCT002` names the offending field, the OpenSpec upsell tip prints only where it applies, and `validate`/`citations verify` accept `--root <dir>` (so `prodshape validate --root examples/minimal` runs the example directly). None is claimed as published until the package version advances on npm.

The loop is not a diagram here; the repository runs on it. This repository defines itself with its own methodology — the model the CLI validates above is the product definition of ProductShape itself, evolved through Product Changes, accepted through pull-request merges and verified by citations.

Remaining open decisions are in [OPEN-DECISIONS.md](OPEN-DECISIONS.md), and what is deliberately not built is below.

## Outside the current scope

Deliberately out of scope, among others: graph databases, web UIs, MCP servers, Jira integration, multi-repository graphs, automatic brownfield recovery, roadmaps and OKRs, hosted services and telemetry. The full list, plus known design limitations, is in [Limitations](docs/limitations.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The specification is normative, `docs/product` is canonical, and changes to the product definition itself go through its own Change operation.
