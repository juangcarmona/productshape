---
id: UC-IMPACT-001
type: use-case
title: Analyze structural impact of a product artifact
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-IDENTITY-001
  - BR-RELATIONSHIPS-001
uses-terms:
  - TERM-PRODUCT-GRAPH
---

## Goal

Before changing an artifact, know every product artifact structurally connected to it, distinguished by distance and direction.

## Trigger

The Product Engineer runs `prodshape impact <ID>`, optionally bounding the traversal by depth or restricting it to one direction.

## Preconditions

- The repository contains a product model in which the artifact exists.

## Main Flow

1. The engineer runs `prodshape impact <ID>` with any depth or direction options.
2. The product graph is traversed deterministically from the artifact.
3. Connected artifacts are reported, distinguishing direct from transitive connections and incoming from outgoing relationships.
4. The same input always yields the same result: the analysis is repeatable anywhere.

## Alternative Flows

- Semantic interpretation: the AI Assistant takes the structural result as input and reasons about what the connections mean for the intended modification — a separate, explicitly AI-assisted activity layered on top of the deterministic traversal.

## Failure Conditions

- Unknown ID: the command reports that no artifact carries that ID and performs no traversal.

## Postconditions

- The engineer holds a deterministic map of everything structurally connected to the artifact.
- No semantic claim has been made: structural impact says what is connected, never whether or how the connected artifacts must change. That judgment belongs to the semantic analysis and, ultimately, to humans.
- The repository state is unmodified.
