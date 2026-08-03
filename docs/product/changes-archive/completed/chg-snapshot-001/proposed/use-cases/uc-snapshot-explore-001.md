---
id: UC-SNAPSHOT-EXPLORE-001
type: use-case
title: Explore the product through a snapshot page
status: draft
primary-actor: ACT-PRODUCT-EXPLORER
supporting-actors: []
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CANONICAL-001
uses-terms:
  - TERM-PRODUCT-SNAPSHOT
  - TERM-PRODUCT-GRAPH
  - TERM-PRODUCT-ARTIFACT
---

## Goal

A person with only a browser understands the product deeply from a Product Snapshot: what it
does, for whom, under which rules and in which language — including the connections between
artifacts that make the definition a graph rather than a pile of documents.

## Trigger

The Product Explorer receives or opens a Product Snapshot — a file someone shared, or a page
their team publishes at a stable address.

## Preconditions

- A generated Product Snapshot is available to open in a browser.

## Main Flow

1. The explorer opens the snapshot in a browser; no installation, account or server is involved.
2. They see the product's artifacts organized by kind, with each artifact's status visible.
3. They open an artifact and read its rendered content — the same knowledge the authored file
   carries, presented for reading.
4. They follow the artifact's relationships in both directions: what it declares, and what
   references it through the derived reverse views.
5. They view the graph visualization to grasp the product's overall shape and each artifact's
   neighborhood.
6. They search across artifacts when they know what they are looking for.
7. They note the model revision the snapshot reflects.

## Alternative Flows

- Deep link: the explorer lands directly on one artifact via a link someone shared and starts
  exploring from there.
- Stale snapshot in hand: the explorer notices the revision stamp is older than what the team
  reports current and asks the repository side for a regenerated snapshot.

## Failure Conditions

- None significant within the page: exploration is read-only. Anything the explorer cannot
  learn from the snapshot — history, active changes, open discussion — belongs to the
  repository side and its actors.

## Postconditions

- The explorer has understood the product at the depth the canonical model records, without
  cloning, installing or reading raw Markdown.
- No product knowledge was created, modified or approved: the snapshot offered no such
  capability.
