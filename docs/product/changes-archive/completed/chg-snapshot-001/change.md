---
id: CHG-SNAPSHOT-001
type: product-change
title: Static product snapshot page for exploring the product graph without the repository
status: implemented
base-revision: 'e29c7a984e43289ab092a26f453141d4779d5103'
operations:
  add:
    - ACT-PRODUCT-EXPLORER
    - JRN-SNAPSHOT-001
    - UC-SNAPSHOT-001
    - UC-SNAPSHOT-EXPLORE-001
    - TERM-PRODUCT-SNAPSHOT
    - FR-SNAPSHOT-001
    - FR-SNAPSHOT-002
  modify:
    - CON-NO-WEB-UI
    - QR-DETERMINISM-001
  remove: []
---

## Problem

Every way of understanding the product definition today requires the repository: cloning it, running the CLI, or reading raw Markdown. The people who most need to understand the product deeply — stakeholders, product owners, teammates outside the engineering loop — are exactly the people who will never do any of those things. CON-NO-WEB-UI recorded this cost explicitly when it deferred all web surfaces from v0.1: "Harder: reaching stakeholders who will not read Markdown or run a command-line tool." The product model has no actor for this reader, no journey that serves them, and no capability that reaches them.

## Intended Product Outcome

A Product Engineer or Repository Maintainer generates a static, self-contained HTML page — a Product Snapshot — from the product model with one CLI command, and shares it as a single file. Anyone with a browser explores the product deeply from that page: browsing artifacts by kind, reading rendered artifacts, following relationships in both directions (including derived reverse views), seeing the product graph visually, and searching — without cloning the repository, running any tool, or reading raw Markdown. The snapshot records the model revision it was generated from, is byte-identical for identical model content, and is never authoritative: the authored files remain the only source of truth.

## Rationale

The exploration session that produced this change started from the observation that CON-NO-WEB-UI pre-negotiated its own evolution: "any future web interface must arrive as a projection over the same files and commands, never as a new home for product truth." A static snapshot satisfies that condition exactly. It is read-only by nature — there is nothing to edit — so it threatens neither BR-CANONICAL-001 (authored artifacts stay canonical) nor BR-CHANGE-001 (evolution goes through Product Changes). It requires no server, satisfying CON-NO-GRAPH-DATABASE. And it borrows a pattern the product already trusts: like a Product Handoff, the snapshot records its source revision so "is this page current?" has a deterministic answer.

The new actor is defined by their relationship to the repository, not by their role: a Product Explorer never clones, never runs a CLI, never reads raw Markdown — whether they are a developer, a product owner, or anyone else who wants to understand the product. The name "Product Explorer" was chosen during change drafting and is open to review.

Three questions raised during drafting were resolved by the product owner at approval. CLI surface: the snapshot is an output format of the existing graph command — `prodshape graph --format html` — not a new command; the graph command already owns "project the compiled graph into a consumable form", and HTML joins its existing formats. Artifact statuses: all statuses are included and visibly badged — the snapshot is an honest projection of the model's maturity, not a curated subset. Visualization shape: overview plus per-artifact neighborhood, meaning concretely that selecting a node in the visualization shows or highlights its relationships, and on an artifact's rendered view every reference to another artifact is a navigable link.

## Affected Product Areas

- **Actors**: adds ACT-PRODUCT-EXPLORER, the first actor who consumes the product definition without touching the repository or tooling.
- **Journeys**: adds JRN-SNAPSHOT-001 ("Understand the product without the repository"), the first journey about consuming the definition rather than producing or delivering it.
- **Use cases**: adds UC-SNAPSHOT-001 (generate, actor: Product Engineer) and UC-SNAPSHOT-EXPLORE-001 (explore, actor: Product Explorer).
- **Domain terms**: adds TERM-PRODUCT-SNAPSHOT in BC-PRODUCT-DEFINITION.
- **Constraints**: modifies CON-NO-WEB-UI — the rule against interactive web applications remains; generated static snapshot projections become explicitly permitted.
- **Quality requirements**: modifies QR-DETERMINISM-001 — snapshot generation joins the operations that must be byte-identical for identical content.
- **Functional requirements**: adds FR-SNAPSHOT-001 (generation contract) and FR-SNAPSHOT-002 (navigation capabilities of the generated page).

## Open Questions

None. Three questions raised during drafting were resolved by the product owner at approval; the resolutions are recorded at the end of the Rationale section and reflected in the proposed artifacts.

## Product Acceptance

- A single CLI command run in this repository produces one self-contained HTML file with no external network dependencies.
- Opening that file from local disk in a browser (no server) allows: browsing all artifacts by kind, reading any artifact's rendered content, following its relationships in both directions including derived reverse views, viewing a graph visualization, and searching artifacts.
- The page displays the source revision it was generated from.
- Regenerating from identical model content yields a byte-identical file.
- The baseline model files are untouched by generation, and nothing on the page allows editing.

## Out of Scope

- Structural impact view inside the page (a later change may add it).
- Active Product Changes, Delivery Slices and Product Handoffs on the page — v1 shows the current product model only.
- Any hosting, serving or publishing mechanism: the product generates the file; where it lives is the adopter's business.
- Any editing, annotation or approval capability on the page — the snapshot is a projection, never a surface for product decisions.
- Interactive web applications of any kind; the modified CON-NO-WEB-UI continues to forbid them.
