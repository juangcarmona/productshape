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

A complete local picture of one artifact, obtained by its stable ID: what it is, where it lives, its content digest, what it references and what references it.

## Trigger

The Product Engineer runs `prodshape inspect <ID>`, typically before proposing a modification or while reviewing someone else's.

## Preconditions

- The repository contains a product model.

## Main Flow

1. The engineer runs `prodshape inspect <ID>`.
2. The artifact's metadata is shown: type, title, status, canonical path and content digest.
3. Its outgoing relationships are listed — everything the artifact declares in its frontmatter.
4. Its incoming relationships are listed as derived views: everything in the model that references this artifact, computed rather than authored.

## Alternative Flows

- None significant: inspection is a single read-only lookup.

## Failure Conditions

- Unknown ID: the command reports clearly that no artifact carries that ID, so a typo is distinguishable from a missing artifact.

## Postconditions

- The engineer sees the artifact's full structural context in one place.
- The repository state is unmodified.
