---
id: UC-SNAPSHOT-001
type: use-case
title: Generate a Product Snapshot page
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-REPOSITORY-MAINTAINER
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CANONICAL-001
uses-terms:
  - TERM-PRODUCT-SNAPSHOT
  - TERM-PRODUCT-GRAPH
  - TERM-CURRENT-PRODUCT-MODEL
---

## Goal

The current product model becomes one static, self-contained HTML file — a Product Snapshot —
that anyone can explore in a browser without the repository, the CLI or any server, stamped with
the model revision it was generated from and reproducible byte-for-byte from the same content.

## Trigger

The Product Engineer runs `prodshape graph --format html`, typically when someone outside the
repository workflow needs to understand the product, or after a promotion so a shared snapshot
reflects the new baseline.

## Preconditions

- The repository contains a product model.

## Main Flow

1. The engineer runs `prodshape graph --format html`.
2. The product graph is compiled from the authored artifacts, including all derived reverse
   relationships.
3. Every artifact is rendered — frontmatter and body — into the page, organized by kind.
4. A graph visualization and a client-side search index are embedded into the same file.
5. The source revision of the model is recorded visibly in the page.
6. The snapshot is written as a single self-contained HTML file under the generated-output area,
   and the command reports where.
7. The engineer shares the file however the team shares files; no serving or hosting is involved.

## Alternative Flows

- Regeneration: the model has evolved since the last snapshot; running the command again
  produces a fresh snapshot with the new revision stamp, replacing nothing canonical — the
  previous file was only ever a projection.
- Chosen destination: the engineer directs the output to a specific path, for example a
  directory their team publishes as static content.

## Failure Conditions

- No product model: the command reports that there is nothing to project rather than producing
  an empty page.
- Malformed artifacts: files that cannot be parsed are reported with diagnostics; the command
  does not emit a snapshot that silently omits part of the model.

## Postconditions

- One self-contained HTML file exists, opening correctly from local disk with no network access
  and no server.
- The page records the model revision it was generated from.
- The canonical model is untouched; the snapshot is a derived, regenerable projection and never
  authoritative.
