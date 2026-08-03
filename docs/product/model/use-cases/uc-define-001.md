---
id: UC-DEFINE-001
type: use-case
title: Define the product model
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CANONICAL-001
  - BR-AI-001
uses-terms:
  - TERM-PRODUCT-ARTIFACT
  - TERM-CURRENT-PRODUCT-MODEL
---

## Goal

A coherent initial product model — or a new product area within an existing one — expressed as draft artifacts that trace from actors through journeys and use cases to rules, terms and requirements, with every unresolved point recorded as an open question.

## Trigger

The Product Engineer starts defining, typically with the AI Assistant executing the Define skill against stated product intent, or manually from the installed templates.

## Preconditions

- The repository is initialized for Product Definition as Code.
- Product intent exists in some form: a brief, notes, conversations or the engineer's knowledge.

## Main Flow

1. The engineer states the product intent; the AI Assistant asks clarifying questions until the outcome sought is understood.
2. Actors are established first: who or what interacts with the product, before any feature talk.
3. Journeys are drafted around the end-to-end outcomes those actors pursue.
4. Use cases are derived from journey steps, each describing one concrete interaction.
5. Business rules are extracted from the behaviour the use cases describe, as independently identifiable statements.
6. Domain terms are established, each defined in a bounded context that fixes its meaning.
7. Requirements are derived from use cases, rules and constraints, each traceable to its source.
8. Every point the intent does not answer is preserved as an open question, never resolved by invention.
9. The engineer runs `prodshape validate` and resolves the reported diagnostics.
10. A human reviews the draft artifacts and marks the accepted ones active.

## Alternative Flows

- Manual authoring: the engineer writes artifacts directly from the templates without AI assistance; the contracts and validation apply identically.
- Incremental definition: the engineer defines one area at a time, validating between passes, rather than the whole product in one sitting.

## Failure Conditions

- Validation reports errors: the affected artifacts stay draft until the diagnostics are resolved.
- The AI Assistant lacks the information to complete an artifact: it stops, surfaces the open question, and leaves the decision to a human instead of inventing one.

## Postconditions

- The model exists as artifacts that validate cleanly and trace requirements back to actors.
- Open questions are visible in the artifacts that carry them.
- Human-reviewed artifacts are active; everything else remains draft.
