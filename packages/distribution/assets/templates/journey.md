---
id: JRN-EXAMPLE-001
type: journey
title: Example Journey
status: draft
primary-actor: ACT-EXAMPLE-ACTOR
steps:
  - use-case: UC-EXAMPLE-001
---

<!--
Journey: an end-to-end outcome pursued by an actor. May cross use cases, channels,
bounded contexts, external systems, waiting periods, branches and failure paths.
steps: the main ordered path only; branches and exceptions belong in the body.
provenance (optional): the evidence behind recovered knowledge. Set it on recovered
(brownfield) artifacts; leave it unset when authoring from intent. It records evidence,
never authorship: git history remains the record of who changed what and when.
provenance:
  source: path/to/evidence.ts      # required; may also be a URL, a ticket, or an interview
  confidence: high | medium | low  # required; how strongly the evidence supports the claim
  recovered-from: observation | inference | interview | documentation  # optional
A draft whose confidence is low is reported as PRODUCT111, so candidates needing human
validation are derivable from validation output.
Contract: https://github.com/product-definition-as-code/spec/blob/main/spec/artifacts.md
Schema reference: docs/specification/frontmatter-reference.md#journey
-->

## Intended Outcome

<!-- The end-to-end outcome the actor pursues. -->

## Entry Conditions

<!-- What must be true for the journey to begin. -->

## Journey Narrative

<!-- The journey end to end, in product language. -->

## Variants and Branches

<!-- Meaningful alternative paths and where they diverge. -->

## Completion Conditions

<!-- How the actor and the product recognize the journey as complete. -->
