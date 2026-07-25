# ProductShape

**ProductShape — Product Definition as Code.** ProductShape is the reference implementation of the
Product Definition as Code methodology: it is to Product Definition as Code what OpenSpec is to
Spec-Driven Development.

A TypeScript toolkit that puts a canonical, versioned, machine-validatable product definition in
front of your backlog and your Spec-Driven Development workflow.

## The problem

AI-assisted engineering has made implementation fast, which moves the limiting factor left: teams
now stall on understanding the product — its actors, behaviour, rules, language and requirements.
That knowledge usually lives scattered across tickets, wikis, chat threads and people's heads. It
is not versioned, not validated, not traceable, and every backlog item and every SDD change is
written by re-deriving it from scratch. SDD frameworks like OpenSpec specify one implementation
increment well, but nothing upstream defines the product those increments belong to.

Product Definition as Code makes that upstream layer explicit: product knowledge lives as
reviewable files in your repository, changes to it are validated deltas, and every implementation
increment traces back to the product knowledge it serves. The founding position is in
[the manifesto](docs/manifesto.md).

## The core idea

Two assertions carry the whole design:

- **The relationships are the methodology.** Artifacts alone are documentation; what makes the
  model useful is the typed edges between them — which actor a use case serves, which rules govern
  it, which requirements derive from it — because those edges carry traceability from intent to
  implementation.
- **Markdown is the source of truth; the graph is compiled from Markdown.** Humans author plain
  Markdown files with YAML frontmatter. Tooling compiles them into a product graph, derives every
  reverse relationship, and validates the whole deterministically. Generated files are always
  reproducible and never authoritative.

Evolution is explicit end to end:

```text
Product Definition → Product Change → Delivery Slice → Backlog Item → Product Handoff
  → native SDD workflow → Implementation → Verification → explicit Promotion
```

Nothing modifies the product model silently: changes are proposed as validated deltas, delivered
through your SDD framework, and applied to the baseline only by explicit promotion. The five-minute
explanation is [the methodology overview](docs/methodology/overview.md).

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

Three further kinds carry the change flow: Product Changes (`CHG-`), Delivery Slices (`SLI-`) and
Product Handoffs (`HOF-`). Contracts, required sections and lifecycles are normative in
[the specification](docs/specification/artifacts.md); `templates/` has a conformant starting point
for each kind.

## The product graph

Each relationship is authored exactly once, in one direction, on one artifact
(`derived-from`, `governed-by`, `defined-in`, ...). The graph compiler builds the full product
graph from those declarations and derives all reverse views — a bounded context's owned terms, a
rule's consumers, a use case's derived requirements — so nobody maintains reciprocal references.
Validation over the graph is deterministic: unresolved references, disallowed target types,
duplicate IDs and lifecycle violations are errors with stable codes; unused rules or unreachable
requirements are warnings. Structural impact analysis (`impact <ID>`) answers "what is connected to
this, how far, in which direction" — deterministically, with no semantic claims. See
[the product graph](docs/methodology/product-graph.md) and
[relationships](docs/specification/relationships.md).

## From Product Change to SDD increment

A modification request never edits the model directly. It becomes a Product Change: a delta with
rationale, operations (`add`/`modify`/`remove`) and complete proposed future-state artifacts,
validated as an overlay on the baseline without touching it. Once approved, the change is
decomposed into delivery slices — implementable, verifiable product increments with explicit
requirement coverage. Each slice projects to a backlog item and generates a Product Handoff: a
framework-independent package of exactly the product subgraph that increment needs, with content
digests so staleness is detectable per artifact.

Your SDD framework consumes the handoff and runs its native workflow unchanged. With the OpenSpec
adapter, the handoff lands as sidecar files inside a normal OpenSpec change; OpenSpec's lifecycle
is untouched and archiving never promotes. When all slices are done and coverage evidence exists, a
human explicitly promotes the Product Change, which applies it to the baseline. Details:
[change](docs/methodology/change.md), [delivery slicing](docs/methodology/delivery-slicing.md),
[SDD handoff](docs/methodology/sdd-handoff.md) and the
[handoff contract](docs/specification/handoff-contract.md).

## Try it in five minutes

The `prodshape` CLI is built from this repository — npm publication is deliberately pending, see
[OD-005](OPEN-DECISIONS.md#od-005-npm-publication):

```bash
git clone git@github.com:juangcarmona/productshape.git
cd productshape
pnpm install && pnpm build
```

This repository defines itself with its own methodology, so the built CLI has a real product model
to run against — 56 artifacts, zero diagnostics:

```bash
node packages/cli/dist/cli.js validate
node packages/cli/dist/cli.js graph --format mermaid
node packages/cli/dist/cli.js inspect FR-COVERAGE-001
node packages/cli/dist/cli.js impact BR-SDD-001 --direction incoming
```

For a new repository, scaffold the model plus the AI and SDD integrations with:

```bash
prodshape init --ai claude --sdd openspec
```

`prodshape` here means the built CLI binary: run it as `node packages/cli/dist/cli.js`, or make it
a global command with `pnpm link --global` from `packages/cli`. `product-definition` remains a
temporary v0.x alias for `prodshape` — identical output — and is removed before v1. The
`/product:*` commands stay canonical; `/ps:*` is an optional shorthand (`/ps:change`, `/ps:impact`,
`/ps:handoff`).

What you can read alongside:

- [The manifesto](docs/manifesto.md) and
  [the methodology overview](docs/methodology/overview.md) — the overview is a five-minute read.
- The self-hosted model under `docs/product/model`: this repository defines itself with its own
  methodology, so every artifact kind has a real example.
- `schemas/` and `templates/` — the machine contracts the CLI validates against, and a conformant
  starting point for each artifact kind.

Adoption guides for the four entry paths: [greenfield](docs/adoption/greenfield.md),
[brownfield](docs/adoption/brownfield.md),
[existing repository](docs/adoption/existing-repository.md) and
[existing OpenSpec repository](docs/adoption/existing-openspec-repository.md).

## Current status

v0.1 was built in the open through four OpenSpec changes, all complete:

1. `establish-product-definition-foundation` — **done**: methodology and manifesto, the normative
   specification, JSON Schemas and templates, the self-hosted product model, conformance fixtures
   and a minimal parsing core.
2. `implement-product-graph-core` — **done**: the `product-definition` CLI with graph compilation,
   derived reverse relationships, deterministic validation, `inspect` and structural `impact`.
3. `implement-product-change-and-handoff` — **done**: Product Change overlay validation, delivery
   slices, handoff generation with content digests, staleness detection, coverage checking and
   explicit promotion.
4. `package-ai-and-sdd-integrations` — **done**: the six canonical AI skills, seven `/product:*`
   commands, four hook descriptors, generated Claude Code and GitHub Copilot integrations with
   drift detection, the OpenSpec adapter, `init`, `integration add`/`update` and `doctor`.

The repository has delivered one real Product Change through the complete loop —
`CHG-TRACEABILITY-001`, handed off as `HOF-GITHUB-1` into a native OpenSpec change, implemented,
covered with evidence and explicitly promoted into the baseline — and v0.1.0 is a release
candidate, unpublished.

The reference implementation adopted the ProductShape brand via `CHG-BRAND-001` (delivery slice
`SLI-BRAND-001`); the methodology name Product Definition as Code is retained.

Nothing is published to npm yet. Deliberately unresolved decisions — including the final public
name, which is why there is no acronym anywhere — are in [OPEN-DECISIONS.md](OPEN-DECISIONS.md).

## Outside v0.1

Deliberately out of scope, among others: graph databases, web UIs, MCP servers, Jira integration,
multi-repository graphs, automatic brownfield recovery, roadmaps and OKRs, hosted services and
telemetry. The full list, plus known design limitations, is in
[Limitations of v0.1](docs/limitations-v0.1.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The specification is normative, `docs/product` is
canonical, and changes to the product definition itself go through its own Change operation.
