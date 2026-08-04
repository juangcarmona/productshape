---
id: UC-CHANGE-001
type: use-case
title: Draft a product change
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CHANGE-001
  - BR-AI-001
uses-terms:
  - TERM-CURRENT-PRODUCT-MODEL
---

## Goal

Produce a structured change draft and proposed artifacts in the working tree, validated before the pull request is opened.

## Trigger

The Product Engineer or AI Assistant receives a modification request and wants AI-assisted drafting of the affected artifacts.

## Preconditions

- The product model exists and validates.

## Main Flow

1. The actor creates a change draft at `docs/product/changes/<slug>/change.md` with `status: draft`, its intent, and an affected-artifacts list. The directory slug identifies the draft; it carries no ID.
2. The AI Assistant reads the product graph and identifies which artifacts need to be added, modified, or removed.
3. The AI Assistant drafts the proposed artifacts directly into `docs/product/model/`.
4. The actor runs `prodshape change validate` to validate the working tree as a proposed change.
5. The actor resolves open questions and adjusts the drafted artifacts.
6. The actor opens a pull request with the proposed changes.
7. The pull request is reviewed and merged (Git merge is the promotion).
8. The actor sets the change draft to `status: done` and runs `prodshape change archive <slug>` to move it to `changes/archive/`. The command refuses any draft not yet marked done.

## Alternative Flows

- The engineer may draft artifacts manually without AI assistance.

## Failure Conditions

- `prodshape change validate` reports errors (the proposed change is structurally invalid).
- Open questions remain unresolved.

## Postconditions

- The working tree contains a valid proposed change.
- A change draft exists with intent, affected artifacts, and open questions.
