# ProductShape CLI

**ProductShape, the reference implementation of [Product Definition as Code](https://github.com/product-definition-as-code/spec).**

Product Definition as Code keeps the agreed product definition in versioned Markdown that delivery work cites instead of restating. `@prodshape/cli` installs `prodshape`, the Product Definition as Code CLI.

<p align="center">
  <a href="https://pdac.dev/#watch-the-drift"><img src="https://pdac.dev/pdac-demo.gif" alt="Terminal recording: grep shows three specs paraphrasing one refund rule; the rule is defined once as BR-REFUND-001; each spec cites it by ID and content digest; verification reports three current citations; the rule changes, and verification reports three stale citations with PRODUCT061 warnings, naming each file and line." width="720" /></a>
</p>

<p align="center"><em>Three specs restate one rule; a change flags every recorded citation. Real output — the end card names the CLI version recorded. <a href="https://pdac.dev/">Watch on pdac.dev</a>.</em></p>

<p align="center"><strong><a href="https://juangcarmona.github.io/productshape/">See a real product definition, live</a></strong> — this repository's own model, republished on every merge to <code>main</code>.</p>

> **Supported published baseline:** `@prodshape/cli@0.16.0`. The command surface and outputs are still settling; the schema and diagnostic contracts (`product-definition-as-code/…`, `PRODUCT###`) are intended to be stable. Behaviour present only on the repository's `main` branch is unreleased until a newer package version appears on npm.

## Install

```bash
npm install -g @prodshape/cli@0.16.0
# or run without installing:
npx @prodshape/cli@0.16.0 --help
```

The canonical command is `prodshape`; `product-definition` remains an identical v0.x compatibility alias. Requires Node.js >= 22.

## What it does

A product definition is a set of Markdown artifacts with stable IDs — actors, journeys, use cases, business rules, domain terms, bounded contexts and requirements — whose typed frontmatter relationships compile into a product graph. It evolves through Product Changes: complete proposed future-state artifacts are validated as an overlay, approved by a human and explicitly applied on a working branch. A pull request reviews the applied result, and its merge accepts the resulting baseline; apply is not acceptance, and neither apply nor merge attests delivery. Product-definition work and implementation work may share that pull request or proceed at different times, but they remain distinct.

```bash
prodshape init                              # kernel install: config, model home, live-change home
prodshape init --full                       # add the per-kind layout and the template library
prodshape init --ai claude                  # add an AI integration (implies --full)
prodshape template <kind>                   # print an authoring template to stdout
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
prodshape recover next | mark | check       # bounded batches (tier-ordered), per-source or bulk (--glob) classification, drift detection
prodshape recover unmark --source <id>      # retract a wrong finding; session state is never edited by hand
prodshape recover report                    # final recovery report; candidates stay proposed under CHG-INITIAL
prodshape citations verify                  # check citations in consumer documents
prodshape doctor                            # repository health
```

Exit codes: `0` success (warnings allowed), `1` validation errors, `2` invalid invocation or configuration, `3` unexpected failure.

## The governed citation-first walkthrough

The smallest real adoption: one accepted artifact, one consumer that cites it, one stale dependency detected before merge. Every step is a copied command or a copied file; a first verified citation takes well under ten minutes. This is the governed path, where the definition changes only through Product Changes, as opposed to the disposable sandbox demo in the repository README, which edits the model directly to show the mechanics.

`prodshape init` installs the kernel only (four files: the configuration, the model home, the live-change home and a README). Templates and schemas stay on demand: `prodshape template <kind>` prints a starting point, `prodshape schema <kind>` prints the allowed frontmatter. `prodshape init --full` installs the per-kind layout and the template library; `--ai <provider>` adds an AI integration and implies `--full`.

```bash
npm install --save-dev --save-exact @prodshape/cli@0.16.0
npx --no-install prodshape init
npx --no-install prodshape validate   # says a product definition does not exist yet
npx --no-install prodshape change create CHG-INITIAL
```

Author the first artifact as the change's proposed future state (start from `prodshape template actor` if you prefer):

```bash
cat > docs/product/changes/active/chg-initial/proposed/act-user.md <<'EOF'
---
id: ACT-USER
type: actor
title: 'User'
status: active
actor-kind: human
---

## Purpose

The person this product serves.

## Goals

- Get value from the product with minimal setup.

## Responsibilities

- Uses the product and reports what does not work.

## Boundaries

- Does not operate or administer the product.
EOF
```

Declare the operation in `docs/product/changes/active/chg-initial/change.md` (`operations.add: [ACT-USER]`), fill its intent sections, then validate the overlay:

```bash
npx --no-install prodshape change validate CHG-INITIAL
```

Approval is a human product decision: set `status: approved` in `change.md` by hand, then apply and let a pull request accept the result:

```bash
npx --no-install prodshape change apply CHG-INITIAL --dry-run
npx --no-install prodshape change apply CHG-INITIAL
git add -A && git commit -m "accept CHG-INITIAL"   # in real work: open a PR; its merge accepts
```

Cite the accepted artifact from a consumer document and verify:

```bash
DIGEST=$(npx --no-install prodshape inspect ACT-USER --format json | node -p "JSON.parse(require('fs').readFileSync(0)).digest")
mkdir -p docs/decisions
printf '# ADR 001: single-user focus\n\n<!-- %s -->\n' "$(npx --no-install prodshape cite --id ACT-USER --digest "$DIGEST")" > docs/decisions/adr-001.md
npx --no-install prodshape citations verify docs/decisions   # 1 current
```

The definition evolves through the same mechanism, never by editing the accepted baseline. A second Product Change that modifies `ACT-USER` (copy `docs/product/model/actors/act-user.md` into its `proposed/`, edit it, declare `operations.modify: [ACT-USER]`, approve, apply) turns the recorded dependency visible:

```bash
npx --no-install prodshape change apply CHG-USER-SCOPE   # reports: affected citation, stale
npx --no-install prodshape citations verify docs/decisions   # 1 stale (PRODUCT061)
```

Set `validation.warnings-as-errors: true` in `.product/config.yaml` to make a stale citation fail the pipeline; its reported severity stays `warning`. CI exercises this exact loop against the packed release candidate.

## Status

The CLI bundles `@prodshape/core`, `@prodshape/distribution`, `@prodshape/integration-openspec` and the provider integrations at build time, so installing it is all you need. Each is also published separately for programmatic use. `@prodshape/integration-openspec` is the current OpenSpec package; `@prodshape/adapter-openspec` is a legacy package name from older releases. See the [repository](https://github.com/juangcarmona/productshape) for the executable quickstart, the adoption guides and the self-hosted product model, and the [specification repository](https://github.com/product-definition-as-code/spec) for the normative contracts and the manifesto.

## License

Apache-2.0.
