<p align="center">
  <img src="assets/branding.png" alt="ProductShape: Product Definition as Code" width="360" />
</p>

<p align="center">
  <a href="https://github.com/juangcarmona/productshape/actions/workflows/ci.yml"><img src="https://github.com/juangcarmona/productshape/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/juangcarmona/productshape/actions/workflows/pdac-conformance.yml"><img src="https://github.com/juangcarmona/productshape/actions/workflows/pdac-conformance.yml/badge.svg" alt="PDaC conformance (pinned)" /></a>
  <a href="https://www.npmjs.com/package/@prodshape/cli"><img src="https://img.shields.io/npm/v/@prodshape/cli?logo=npm&label=%40prodshape%2Fcli" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/@prodshape/cli" alt="License" /></a>
</p>

# ProductShape

**ProductShape, the reference implementation of [Product Definition as Code](https://github.com/product-definition-as-code/spec).**

Product Definition as Code keeps the agreed product definition in versioned Markdown that delivery work cites instead of restating.

<p align="center">
  <a href="https://pdac.dev/#watch-the-drift"><img src="https://pdac.dev/pdac-demo.gif" alt="Terminal recording: grep shows three specs paraphrasing one refund rule; the rule is defined once as BR-REFUND-001; each spec cites it by ID and content digest; verification reports three current citations; the rule changes, and verification reports three stale citations with PRODUCT061 warnings, naming each file and line." width="720" /></a>
</p>

<p align="center"><em>Three specs restate one rule; a change flags every recorded citation. Real output. The end card names the recorded CLI version. <a href="https://pdac.dev/">Watch on pdac.dev</a>.</em></p>

<p align="center"><strong><a href="https://juangcarmona.github.io/productshape/">See a real product definition, live</a></strong>. This repository's own model is republished on every merge to <code>main</code>.</p>

The methodology belongs to the [specification repository](https://github.com/product-definition-as-code/spec): the normative contracts, the conformance tests and [the manifesto](https://github.com/product-definition-as-code/spec/blob/main/MANIFESTO.md), which states the founding position. ProductShape is the Product Definition as Code CLI: `prodshape` lets you author actors, journeys, use cases, business rules, domain terms, product requirements and structured behaviours in Markdown, then keeps that definition validated, evolvable and citable:

- `prodshape init`: scaffold a product definition (and optional AI, OpenSpec and Spec Kit integrations) in any repository.
- `prodshape validate`: validate the product definition deterministically: schemas, IDs, relationships and lifecycles, with stable diagnostic codes.
- `prodshape graph` and `prodshape impact <ID>`: compile the product graph from the Markdown and answer "what is connected to this?" structurally.
- `prodshape change validate` and `prodshape change apply`: evolve the definition through a Product Change. It is validated as an overlay, approved by a human and applied explicitly on a working branch. A human merge accepts the resulting baseline; apply is not acceptance.
- `prodshape cite` and `prodshape citations verify`: cite product artifacts from SDD specs and agent prompts by ID and content digest, then verify citations: `current`, `stale`, `tampered` or `unresolved`. Provider-aware verification enumerates the expected population of an OpenSpec or Spec Kit workspace, so zero discovered citations is a failure, never a vacuous pass.
- `prodshape context <ID> [<ID>...]`: render a cited context projection of the artifacts a piece of delivery work implements, ready to feed into a Spec Kit specify run or an OpenSpec proposal, so delivery starts from cited canonical text instead of paraphrase.

Deterministic tools check structure and references, never truth; people decide what is true and what should change.

## Install

Requires Node.js >= 22. The supported published baseline is **`@prodshape/cli@0.18.0`**.

```bash
npm install -g @prodshape/cli@0.18.0
# or run it once, without installing
pnpm dlx @prodshape/cli@0.18.0 --help
```

`prodshape` is the canonical binary; `product-definition` is an identical v0.x compatibility alias scheduled for removal before v1.

## Packages

The CLI bundles every package below, so installing `@prodshape/cli` is all you need. Each is also published separately for programmatic use, under the [`@prodshape`](https://www.npmjs.com/org/prodshape) scope, versioned independently with [Changesets](https://github.com/changesets/changesets) and published from GitHub Actions with provenance (see [RELEASING.md](RELEASING.md)).

| Package | Version | Description |
| --- | --- | --- |
| [`@prodshape/cli`](https://www.npmjs.com/package/@prodshape/cli) | [![npm](https://img.shields.io/npm/v/@prodshape/cli)](https://www.npmjs.com/package/@prodshape/cli) | The `prodshape` command-line tool (bundles the rest) |
| [`@prodshape/core`](https://www.npmjs.com/package/@prodshape/core) | [![npm](https://img.shields.io/npm/v/@prodshape/core)](https://www.npmjs.com/package/@prodshape/core) | Deterministic parsing, validation and graph |
| [`@prodshape/distribution`](https://www.npmjs.com/package/@prodshape/distribution) | [![npm](https://img.shields.io/npm/v/@prodshape/distribution)](https://www.npmjs.com/package/@prodshape/distribution) | Init, provider-asset generation and doctor |
| [`@prodshape/integration-claude`](https://www.npmjs.com/package/@prodshape/integration-claude) | [![npm](https://img.shields.io/npm/v/@prodshape/integration-claude)](https://www.npmjs.com/package/@prodshape/integration-claude) | Claude Code renderer for canonical assets |
| [`@prodshape/integration-codex`](https://www.npmjs.com/package/@prodshape/integration-codex) | [![npm](https://img.shields.io/npm/v/@prodshape/integration-codex)](https://www.npmjs.com/package/@prodshape/integration-codex) | Codex renderer for canonical assets |
| [`@prodshape/integration-copilot`](https://www.npmjs.com/package/@prodshape/integration-copilot) | [![npm](https://img.shields.io/npm/v/@prodshape/integration-copilot)](https://www.npmjs.com/package/@prodshape/integration-copilot) | GitHub Copilot renderer for canonical assets |
| [`@prodshape/integration-openspec`](https://www.npmjs.com/package/@prodshape/integration-openspec) | [![npm](https://img.shields.io/npm/v/@prodshape/integration-openspec)](https://www.npmjs.com/package/@prodshape/integration-openspec) | OpenSpec configuration and citation-rule integration |
| [`@prodshape/integration-speckit`](https://www.npmjs.com/package/@prodshape/integration-speckit) | [![npm](https://img.shields.io/npm/v/@prodshape/integration-speckit)](https://www.npmjs.com/package/@prodshape/integration-speckit) | Spec Kit guidance and feature-spec citation verification |

`@prodshape/integration-openspec` is the current OpenSpec package. The previously published `@prodshape/adapter-openspec` name belongs to older releases and is not part of the current package set.

## Quickstart

> **This is a disposable sandbox, not the adoption path.** It writes into the accepted model directly to show the mechanics in two minutes and is deliberately non-governed. Real adoption changes the definition only through Product Changes: follow the governed citation-first walkthrough in the [`@prodshape/cli` README](packages/cli/README.md#the-governed-citation-first-walkthrough).

Your model, rendered, in a couple of minutes:

```bash
mkdir my-product && cd my-product
npm init -y && npm install --save-dev --save-exact @prodshape/cli@0.18.0
npx --no-install prodshape init

mkdir -p docs/product/model/business-rules
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

npx --no-install prodshape validate
npx --no-install prodshape graph --format html
open .product/generated/snapshot.html   # xdg-open on Linux
```

`validate` reports one warning because the rule has no consumers yet. The model is telling you what to connect next. The snapshot is your product definition rendered as a browsable graph; print a starting point for any kind with `prodshape template <kind>` and re-run.

### Release contract (what CI executes)

One business rule, one citation, one detected drift. CI runs this exact block against the packed release candidate in the release-contract workflow. It substitutes only `PRODSHAPE_PACKAGE` with the tarball path. What you read here is what is tested.

<!-- release-contract-quickstart:start -->

```bash
set -eu
PRODSHAPE_PACKAGE="${PRODSHAPE_PACKAGE:-@prodshape/cli@0.18.0}"

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

printf '# Refund delivery specification\n' > openspec/refund.md
npx --no-install prodshape cite \
  --id BR-REFUND-001 \
  --file docs/product/model/business-rules/br-refund-001.md \
  --form sidecar-ledger > openspec/refund.citations.yml
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

The first `prodshape citations verify` reports `current`. The second is expected to fail with `PRODUCT061` because the cited rule changed and this quickstart enables `warnings-as-errors` before the stale check: drift is detected instead of silent. Features on `main` newer than the pinned baseline are **unreleased** until a newer CLI version is published.

What to read next:

- [The methodology overview](docs/methodology/overview.md): a five-minute read covering the artifact families, the product graph, the operations and the citation contract.
- [The specification](https://github.com/product-definition-as-code/spec) is normative. Read [its manifesto](https://github.com/product-definition-as-code/spec/blob/main/MANIFESTO.md) for the authoritative founding position. The [frontmatter reference](docs/specification/frontmatter-reference.md) enumerates what you may write in every artifact kind; `prodshape schema <kind>` prints the same contract without a repository.
- The self-hosted model under [`docs/product/model`](docs/product/model): this repository defines itself with its own methodology, so every artifact kind has a real example. `schemas/` and `templates/` hold the machine contracts the CLI validates against and a conformant starting point for each kind.
- Adoption guides for the entry paths: [greenfield](docs/adoption/greenfield.md), [brownfield](docs/adoption/brownfield.md), [existing repository](docs/adoption/existing-repository.md), [existing OpenSpec repository](docs/adoption/existing-openspec-repository.md) and [existing Spec Kit repository](docs/adoption/existing-speckit-repository.md).

## Agent skills

`prodshape init --ai claude,codex,copilot` installs generated commands and skills for the chosen providers, so an AI agent works the model through the same operations you do: explore, define, change, audit, impact, recover, bind (backfill citations into existing SDD documents) and refine (interview-driven model improvement). The assets are canonical to the CLI. Run `prodshape integration update` to refresh them after an upgrade. [The methodology overview](docs/methodology/overview.md) explains what each operation does.

## PDaC conformance

The pinned conformance workflow builds and packs ProductShape, installs that tarball outside the workspace, and runs the spec's conformance tests via the external runner [`pdac-conformance`](https://www.npmjs.com/package/pdac-conformance) (`1.0.1`) against [PDaC spec commit `7feb4ec9081443740caa597fa3a695ea4e9d049f`](https://github.com/product-definition-as-code/spec/commit/7feb4ec9081443740caa597fa3a695ea4e9d049f), the v0.2.0 specification content: all 44 cases pass and all 12 pinned digests verify, claimed as specification `0.2.0` on serialization `v1alpha1`. The published tests are not a complete normative set, so the badge claims only this pinned executable profile; ProductShape's own fixtures, self-model and traceability checks run separately as **Internal contracts**.

## Current status

`@prodshape/cli@0.18.0` is the supported published baseline. It includes deterministic brownfield recovery sessions, Product Change overlay validation and apply with the affected-citation report, citation emission and verification (including provider-aware OpenSpec population verification), snapshot generation, schema discovery, filename repair, SDD-aware initialization, `prodshape change create`, `prodshape drift`, `prodshape --version`, and generated AI/OpenSpec integrations. The [root changelog](CHANGELOG.md) records every stable CLI release; version `0.10.0` was prepared but never published, and its changes shipped in `0.11.0`.

Remaining open decisions are in [OPEN-DECISIONS.md](OPEN-DECISIONS.md). Deliberately out of scope, among others, are graph databases, web UIs, MCP servers, Jira integration, multi-repository graphs, automatic brownfield recovery, roadmaps and OKRs, hosted services and telemetry. The full list, plus known design limitations, is in [Limitations](docs/limitations.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The specification is normative, `docs/product` is canonical, and changes to the product definition itself go through its own Change operation.
