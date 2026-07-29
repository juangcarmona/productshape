---
id: UC-EXPLORE-001
type: use-case
title: Explore a product idea before committing to a change
status: draft
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-AI-001
uses-terms:
  - TERM-PRODUCT-CHANGE
  - TERM-CURRENT-PRODUCT-MODEL
  - TERM-PRODUCT-ARTIFACT
  - TERM-PRODUCT-GRAPH
---

## Goal

A fuzzy product idea becomes a clear, well-formed change request through a structured
conversation with the AI assistant, using the existing product graph as the scaffold for
questioning, so that the user arrives at `ps:change` with enough clarity to produce a sound
Product Change.

## Trigger

A Product Engineer or product owner has an idea for a product modification — or has been asked
to evaluate one — but cannot yet state it precisely enough to start a Product Change. They
invoke `ps:explore`.

## Preconditions

- The user has an idea, however fuzzy.
- The AI assistant has access to the repository.

## Main Flow

1. The AI assistant reads all artifacts under `docs/product/model` before asking the first
   question.
2. It reasons from a high-altitude view of the product graph, identifying structural gaps
   (actors with no journeys, journeys with no use cases, orphaned requirements), inconsistencies
   (referenced terms absent from the glossary), and artifact clusters plausibly affected by the
   idea.
3. It opens a conversation with the Product Engineer, using the graph observations to ask
   targeted questions rather than generic ones — surfacing what is already modelled, what is
   missing, and where the idea fits.
4. The conversation continues until the idea is sufficiently clear: the user can articulate what
   should be different, why, and which areas of the product are likely affected.
5. The AI assistant offers an explicit handoff: "I'd say we now have a clear enough idea of what
   should change and why — want me to turn this into a Product Change, or is there anything
   you'd like to refine first?"
6. If the user confirms, they proceed to `ps:change` with the clarified request.

## Alternative Flows

- **Greenfield model**: when `docs/product/model` is absent or contains very few artifacts, the
  assistant enters greenfield mode — it explains the ProductShape artifact vocabulary (actors,
  journeys, use cases, business rules, domain terms, requirements) in business language and helps
  the user land their idea within that structure, before offering the handoff to `ps:define` or
  `ps:change`.
- **User declines handoff**: the user wants to continue refining; the session continues without
  pressure and the handoff is offered again when the idea reaches clarity.
- **Idea already well-formed**: the user starts with a clear request; the AI assistant
  acknowledges this and offers the handoff immediately after a brief graph check for context.

## Failure Conditions

- No idea: the user cannot articulate any intent even after prompting; the session surfaces this
  gap and ends without a forced conclusion.

## Postconditions

- The user has a clear, well-formed statement of what should change and why, grounded in the
  product graph.
- No product model artifact has been created or modified during the session.
- The next step (`ps:change`) has been offered explicitly.
