---
id: UC-EXAMPLE-001
type: use-case
title: Example Use Case
status: draft
primary-actor: ACT-EXAMPLE-ACTOR
supporting-actors: []
governed-by: []
uses-terms: []
---

<!--
Use case: a concrete interaction through which an actor obtains a product outcome.
Optional frontmatter: bounded-context (BC id), supporting-actors, governed-by (BR ids),
uses-terms (TERM ids). Describe observable behaviour, never implementation design.
provenance (optional): the evidence behind recovered knowledge. Set it on recovered
(brownfield) artifacts; leave it unset when authoring from intent. It records evidence,
never authorship: git history remains the record of who changed what and when.
  provenance:
    source: path/to/evidence.ts      # required; may also be a URL, a ticket, or an interview
    confidence: high | medium | low  # required; how strongly the evidence supports the claim
    recovered-from: observation | inference | interview | documentation
A draft whose confidence is low is reported as PRODUCT111, so candidates needing human
validation are derivable from validation output.
Contract: docs/specification/artifacts.md
Schema reference: docs/specification/frontmatter-reference.md#use-case
-->

## Goal

<!-- The outcome the primary actor obtains. -->

## Trigger

<!-- What initiates the interaction. -->

## Preconditions

<!-- What must be true before the main flow can start. -->

## Main Flow

<!-- The numbered main interaction, in product language. -->

## Alternative Flows

<!-- Relevant alternatives and where they rejoin the main flow. -->

## Failure Conditions

<!-- What can go wrong and how the product behaves when it does. -->

## Postconditions

<!-- What is true after successful completion. -->
