---
id: ACT-EXAMPLE-ACTOR
type: actor
title: Example Actor
status: draft
actor-kind: human
---

<!--
Actor: who or what interacts with the product to achieve a meaningful outcome.
actor-kind: human | external-system | scheduled-process | product
Actors are not personas: do not model demographics or fictional details.
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
Schema reference: docs/specification/frontmatter-reference.md#actor
-->

## Purpose

<!-- Why this actor exists in the product model: what outcome they pursue. -->

## Goals

<!-- The outcomes this actor wants from the product. -->

## Responsibilities

<!-- What this actor does in relation to the product. -->

## Boundaries

<!-- What this actor explicitly does not do or decide. -->
