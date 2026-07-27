---
id: UC-INSPECT-001
type: use-case
title: Inspect a product artifact
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors: []
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-IDENTITY-001
  - BR-RELATIONSHIPS-001
uses-terms:
  - TERM-PRODUCT-ARTIFACT
  - TERM-PRODUCT-GRAPH
---

## Goal

A complete picture of one artifact, obtained by its stable ID: what it is, where it lives, what
it references, what references it, and what work currently touches it.

## Trigger

The Product Engineer runs `prodshape inspect <ID>`, typically before proposing a
modification or while reviewing someone else's.

## Preconditions

- The repository contains a product model.

## Main Flow

1. The engineer runs `prodshape inspect <ID>`.
2. The artifact's metadata is shown: type, title, status and its canonical path in the
   repository.
3. Its outgoing relationships are listed — everything the artifact declares in its frontmatter.
4. Its incoming relationships are listed as derived views: everything in the model that
   references this artifact, computed rather than authored.
5. Active Product Changes that add, modify or remove the artifact are listed.
6. Delivery Slices whose scope includes the artifact are listed.
7. Product Handoffs that packaged the artifact are listed.

## Alternative Flows

- None significant: inspection is a single read-only lookup.

## Failure Conditions

- Unknown ID: the command reports clearly that no artifact carries that ID, so a typo is
  distinguishable from a missing artifact.

## Postconditions

- The engineer sees the artifact's full structural context in one place.
- The repository state is unmodified.
