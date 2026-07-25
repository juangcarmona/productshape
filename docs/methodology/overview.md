# Methodology overview

Product Definition as Code keeps a canonical, versioned, machine-validatable definition of your
product in your repository — plain Markdown with YAML frontmatter — and evolves it only through
explicit, reviewed changes. It sits _before_ your backlog and before Spec-Driven Development
(SDD): the definition says what the product is; backlog items and SDD specs describe increments
against it.

Five minutes here gives you the artifact families, the product graph, the three operations, and
the end-to-end change flow. Everything has a normative contract in the
[specification](../specification/index.md); these pages explain, the specification decides.

## The artifact families

A product definition is a set of small, individually addressable Markdown artifacts, each with a
stable immutable ID (like `ACT-PRODUCT-ENGINEER` or `FR-VALIDATE-001`):

- **Actors** — who or what interacts with the product to achieve an outcome.
- **Journeys** — end-to-end outcomes an actor pursues, spanning multiple use cases.
- **Use Cases** — concrete interactions through which an actor obtains an outcome.
- **Business Rules and Domain Knowledge** — rules that govern behaviour, plus **Domain Terms**
  and the **Bounded Contexts** in which each term carries its meaning.
- **Requirements** — **Functional Requirements**, **Quality Requirements** and **Constraints**,
  each traceable to the use cases, rules or constraints it derives from.

The families build on each other conceptually — actors ground journeys, journeys decompose into
use cases, use cases surface rules and terms, requirements derive from all of it — but this is a
dependency of meaning, not a mandatory authoring order. You can start anywhere and iterate.

## The product graph

Each artifact declares its relationships in frontmatter: a use case names its `primary-actor`,
its governing rules, the terms it uses. Those typed references make the definition a directed
graph, compiled by tooling from the Markdown — never authored as a graph, always rebuildable,
never a database. Each relationship is authored in exactly one direction; every reverse view is
derived. The graph is what powers validation, impact analysis and handoff context selection.
Details in [The product graph](product-graph.md).

## Three operations

- **[Define](define.md)** — greenfield. Establish a product definition from intent: actors first,
  then journeys, use cases, rules, terms, requirements, with open questions kept visible.
- **[Recover](recover.md)** — brownfield. Reconstruct candidate product knowledge from an
  existing system, with provenance and confidence, for a human to validate. Automated recovery is
  out of scope in v0.1; the workflow and its extension point are defined.
- **[Change](change.md)** — the center of v0.1, working end to end. Every semantic evolution
  after the initial baseline goes through an explicit, validated, human-approved Product Change.

## From change to promotion

The Change operation carries a modification from request to canonical definition:

```text
Product Definition (baseline)
        │
        ▼
Product Change ──── explicit delta: additions, modifications, removals,
        │           rationale, open questions; human approves
        ▼
Delivery Slice ──── coherent vertical increment of the change,
        │           with requirement coverage; human approves
        ▼
Backlog Item ────── references product artifacts by stable ID
        │           (never copies the definition)
        ▼
Product Handoff ─── generated, framework-independent package of exactly
        │           the product subgraph one increment needs
        ▼
SDD workflow ────── e.g. OpenSpec: proposal, specs, design, tasks
        │           (native SDD ownership, unchanged)
        ▼
Implementation ───▶ Verification
        │
        ▼
Promotion ───────── explicit, human-triggered: the verified change is
                    applied to the baseline; the loop closes
```

Nothing on this path is implicit. Tools validate structure at every step; humans approve the
change, the slices and the promotion; AI assists with drafting and analysis in between. Slicing
is explained in [Delivery slicing](delivery-slicing.md), backlog references in
[Backlog projection](backlog-projection.md), and the SDD boundary in
[SDD handoff](sdd-handoff.md).

## Division of responsibility

- **Deterministic tooling** (the `product-definition` CLI) enforces structure: schemas, IDs,
  relationships, lifecycle, overlay validation, digests. Same input, same result, every platform.
- **AI skills** do semantic reasoning: drafting, impact interpretation, slice proposals. AI
  preserves unanswered questions and never invents product decisions.
- **Humans** make the calls that define the product: change approval, slice approval, promotion.

## Where to go next

- [Manifesto](../manifesto.md) — why this layer exists.
- [The product graph](product-graph.md) · [Define](define.md) · [Recover](recover.md) ·
  [Change](change.md) · [Delivery slicing](delivery-slicing.md) ·
  [Backlog projection](backlog-projection.md) · [SDD handoff](sdd-handoff.md)
- [Specification](../specification/index.md) — the normative contracts behind all of it.
