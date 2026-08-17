# Methodology overview

Product Definition as Code keeps a canonical, versioned, machine-validatable definition of your product in your repository — plain Markdown with YAML frontmatter — and evolves it through Product Changes whose applied result is accepted by pull-request merge. It sits _before_ your backlog and before Spec-Driven Development (SDD): the definition says what the product is; backlog items and SDD specs cite it rather than re-stating it.

Five minutes here gives you the artifact families, the product graph, the operations, and the citation contract. The normative contracts live in the [specification repository](https://github.com/product-definition-as-code/spec); these pages explain, the specification decides.

## The artifact families

A product definition is a set of small, individually addressable Markdown artifacts, each with a stable immutable ID (like `ACT-PRODUCT-ENGINEER` or `FR-VALIDATE-001`):

- **Actors** — who or what interacts with the product to achieve an outcome.
- **Journeys** — end-to-end outcomes an actor pursues, spanning multiple use cases.
- **Use Cases** — concrete interactions through which an actor obtains an outcome.
- **Business Rules and Domain Knowledge** — rules that govern behaviour, plus **Domain Terms** and the **Bounded Contexts** in which each term carries its meaning.
- **Requirements** — **Functional Requirements**, **Quality Requirements** and **Constraints**, each traceable to the use cases, rules or constraints it derives from.

The families build on each other conceptually — actors ground journeys, journeys decompose into use cases, use cases surface rules and terms, requirements derive from all of it — but this is a dependency of meaning, not a mandatory authoring order. You can start anywhere and iterate.

## The product graph

Each artifact declares its relationships in frontmatter: a use case names its `primary-actor`, its governing rules, the terms it uses. Those typed references make the definition a directed graph, compiled by tooling from the Markdown — never authored as a graph, always rebuildable, never a database. Each relationship is authored in exactly one direction; every reverse view is derived. The graph is what powers validation, impact analysis and citation resolution. Details in [The product graph](product-graph.md).

## Operations

- **[Define](define.md)** — greenfield. Establish a product definition from intent: actors first, then journeys, use cases, rules, terms, requirements, with open questions kept visible.
- **[Recover](recover.md)** — brownfield. Reconstruct candidate product knowledge from an existing system, with provenance and confidence, for a human to validate.
- **Explore** — pre-change. A product-graph-aware thinking partner (`ps:explore`) that helps clarify a fuzzy idea against the existing model before committing to a change.
- **[Change](change.md)** — the mechanism. A Product Change is the semantic delta that carries the definition from one accepted state to the next: elaborate it, validate it as an overlay, approve it, apply it.
- **Validate** — the structural gate. `prodshape validate` checks the Product Definition and `prodshape change validate` checks a live change as an overlay on it; a proposal that fails validation MUST NOT be merged (CI gate).
- **Cite** — emit a citation record from a consumer document to a product artifact, carrying the artifact ID, a content digest, and an optional scenario anchor.
- **Verify citations** — `prodshape citations verify` recomputes digests and reports one status per citation: `current`, `stale`, `tampered` or `unresolved`.

## How the definition changes

The Product Definition is the accepted product intent on the repository's canonical branch. It evolves through Product Changes: explicit semantic deltas of add, modify and remove, each carrying the reason it exists. A pull request reviews the applied result, and its merge accepts the resulting baseline; the pull request is not the Product Change.

```text
Fuzzy idea
        │
        ▼ (optional)
ps:explore ──────── reads the product graph; surfaces gaps and affected
        │           areas; sharpens the idea through conversation
        │
        ▼
Product Change ──── changes/active/<chg-id>/: the delta, its rationale and
        │           its complete proposed future-state artifacts
        ▼
change validate ─── compiles the overlay on the baseline and validates the
        │           result end to end, touching no baseline file
        ▼
Approval ────────── a human decides the product should say this. No tool
        │           may take this step.
        ▼
change apply ────── writes the result, reports the product diff, archives
        │           the change. Materialized, not accepted.
        ▼
Pull request ────── CI runs prodshape validate; a human reviews and merges.
        │           The merge is the acceptance.
        ▼
Consumer docs ───── cite product artifacts by ID + digest + anchor;
        │           prodshape citations verify detects drift
        ▼
SDD workflow ────── e.g. OpenSpec: proposal, specs, design, tasks
                    (native SDD ownership, unchanged)
```

Approval and acceptance are both human decisions. Tools MUST NOT approve a change, apply one implicitly, or merge, auto-approve or self-merge. Consumers of the model MUST NOT write to it; they cite it.

Product-definition work and implementation work have independent cadence. They may share a pull request, or implementation may follow later, but they remain separate. Product approval says the proposed intent is wanted, apply materializes it on a working branch, merge accepts the resulting definition, and none of those facts proves implementation, verification, release or deployment.

## The citation contract

A citation is a machine-verifiable reference from a consumer document (an SDD spec, a task, an agent prompt file, a design doc) to canonical product text. It records the target artifact `id`, a content `digest`, and an optional `anchor` (a verification scenario id). When the canonical content changes, the citation reports `stale` — drift is machine-detectable rather than silent.

See the [citation contract](https://github.com/product-definition-as-code/spec/blob/main/spec/citation-contract.md) in the specification repository for the normative details.

## Division of responsibility

- **Deterministic tooling** (the `prodshape` CLI) enforces structure: schemas, IDs, relationships, digests, citation verification. Same input, same result, every platform.
- **AI skills** do semantic reasoning: drafting, impact interpretation, exploration. AI preserves unanswered questions and never invents product decisions.
- **Humans** make the calls that define the product: approving a Product Change and accepting the resulting baseline by merging. Delivery evidence remains separate.

## Where to go next

- [Manifesto](../manifesto.md) — why this layer exists.
- [The product graph](product-graph.md) · [Define](define.md) · [Recover](recover.md) · [Change](change.md)
- [Validation](../specification/validation.md) — diagnostic codes and exit codes.
- [Specification](https://github.com/product-definition-as-code/spec) — the normative contracts.
